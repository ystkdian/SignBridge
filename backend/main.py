# backend/main.py (Menggunakan whisper-small untuk akurasi lebih tinggi)

import os
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import base64
import json
from transformers import pipeline
import torch

# --- Inisialisasi Aplikasi ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# --- Konfigurasi Path dan Model ---
SIBI_MODEL_PATH = os.path.join('models_sibi', 'final_hybrid_sign_language_model_augmented_sibi.h5')
SIBI_CLASS_NAMES_PATH = os.path.join('data_sibi', 'class_names.txt')
BISINDO_MODEL_PATH = os.path.join('models_bisindo', 'final_hybrid_sign_language_model_augmented_bisindo.h5') 
BISINDO_CLASS_NAMES_PATH = os.path.join('data_bisindo', 'class_names.txt')

IMAGE_HEIGHT, IMAGE_WIDTH = 224, 224

# --- Pemuatan Model ---
def load_tf_model(path, type_name):
    try:
        model = tf.keras.models.load_model(path, compile=False)
        print(f"Model {type_name} berhasil dimuat.")
        return model
    except Exception as e:
        print(f"ERROR memuat model {type_name}: {e}")
        return None

def load_class_names(path, type_name):
    try:
        with open(path, 'r') as f:
            return [line.strip() for line in f.readlines()]
    except Exception as e:
        print(f"ERROR memuat nama kelas {type_name}: {e}")
        return []

sibi_model = load_tf_model(SIBI_MODEL_PATH, "SIBI")
sibi_class_names = load_class_names(SIBI_CLASS_NAMES_PATH, "SIBI")
bisindo_model = load_tf_model(BISINDO_MODEL_PATH, "BISINDO")
bisindo_class_names = load_class_names(BISINDO_CLASS_NAMES_PATH, "BISINDO")

# --- Muat model STT WHISPER-MEDIUM ---
stt_pipeline = None
try:
    print("Memuat pipeline Whisper 'medium' (STT)... Ini akan mengunduh >1.5GB saat pertama kali.")
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    stt_pipeline = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-medium",
        device=device
    )
    print(f"Pipeline Whisper (STT) 'medium' berhasil dimuat di perangkat {device}.")
except Exception as e:
    print(f"Gagal memuat pipeline Whisper: {e}")

# Inisialisasi MediaPipe
mp_hands = mp.solutions.hands

# --- Fungsi Helper ---
def process_image_from_bytes(frame_bytes: bytes):
    nparr = np.frombuffer(frame_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def process_frame_for_hybrid_model(img_bgr, hands_detector):
    image_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(image_rgb)
    if not results.multi_hand_landmarks: return None, None
    hand_landmarks = results.multi_hand_landmarks[0]
    landmarks_list = [lm.x for lm in hand_landmarks.landmark] + [lm.y for lm in hand_landmarks.landmark]
    interleaved = []
    for i in range(21): interleaved.extend([landmarks_list[i], landmarks_list[i+21]])
    base_x, base_y = interleaved[0], interleaved[1]
    normalized_landmarks = [val - (base_x if i % 2 == 0 else base_y) for i, val in enumerate(interleaved)]
    max_val = np.max(np.abs(normalized_landmarks));
    if max_val == 0: max_val = 1e-6
    scaled_landmarks = np.array(normalized_landmarks) / max_val
    landmark_input = np.expand_dims(scaled_landmarks.flatten(), axis=0)
    img_resized = cv2.resize(img_bgr, (IMAGE_WIDTH, IMAGE_HEIGHT))
    img_normalized = img_resized.astype('float32') / 255.0
    img_input = np.expand_dims(img_normalized, axis=0)
    return img_input, landmark_input

# --- Endpoint Transkripsi Audio ---
@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    if not stt_pipeline:
        return {"error": "Model Speech-to-Text tidak tersedia di server."}
    try:
        content = await audio_file.read()
        result = stt_pipeline(content, generate_kwargs={"language": "indonesian"})
        transcribed_text = result.get("text", "").strip()
        print(f"Hasil Transkripsi: {transcribed_text}")
        return {"transcription": transcribed_text}
    except Exception as e:
        print(f"Error saat transkripsi: {e}")
        return {"error": "Gagal melakukan transkripsi."}

# --- Endpoint WebSocket Deteksi Isyarat ---
@app.websocket("/ws/{mode}")
async def websocket_endpoint(websocket: WebSocket, mode: str):
    await websocket.accept()
    active_model, active_class_names = (sibi_model, sibi_class_names) if mode == 'sibi' else (bisindo_model, bisindo_class_names)
    if not active_model or not active_class_names:
        await websocket.close(); return
    with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands_detector:
        try:
            while True:
                frame_data_url = await websocket.receive_text()
                _, encoded_data = frame_data_url.split(",", 1)
                frame_bytes = base64.b64decode(encoded_data)
                img_bgr = process_image_from_bytes(frame_bytes)
                if img_bgr is None: continue
                img_input, landmark_input = process_frame_for_hybrid_model(img_bgr, hands_detector)
                prediction_result = {"prediction": "-", "confidence": 0}
                if img_input is not None and landmark_input is not None:
                    prediction = active_model.predict({'image_input': img_input, 'landmark_input': landmark_input}, verbose=0)
                    idx = np.argmax(prediction)
                    confidence = prediction[0][idx] * 100
                    if confidence > 65:
                        prediction_result["prediction"] = active_class_names[idx]
                        prediction_result["confidence"] = round(confidence, 2)
                await websocket.send_json(prediction_result)
        except WebSocketDisconnect: print("Koneksi WebSocket ditutup.")
        except Exception as e: await websocket.close()