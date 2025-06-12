// frontend/script.js (Final dengan semua logika dan perbaikan UI)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const sttBox = document.getElementById('stt-box');
const detectBtn = document.getElementById('detect-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
const recordBtn = document.getElementById('record-btn');
const detectedWordDisplay = document.getElementById('detected-word-display');
const modelSelect = document.getElementById('model-select');

// --- Kamus dan State Aplikasi ---
let dictionary = [];
let letterBuffer = [];
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

// --- Konfigurasi URL Backend (tidak diubah sesuai permintaan) ---
const BACKEND_DOMAIN = "d805-2001-448a-4042-8c89-2014-c34d-827b-adb1.ngrok-free.app";
const WEBSOCKET_URL = `wss://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `https://${BACKEND_DOMAIN}/transcribe`;

// Variabel perekaman audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// --- Fungsi-fungsi Aplikasi ---

async function loadDictionary() {
    try {
        const response = await fetch('kamus.json');
        if (!response.ok) throw new Error('Gagal memuat kamus');
        dictionary = await response.json();
        console.log(`Kamus berhasil dimuat dengan ${dictionary.length} kata.`);
    } catch (error) {
        console.error("Error memuat kamus:", error);
        dictionary = ['HALO', 'APA', 'KABAR'];
    }
}

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            captureCanvas.width = video.videoWidth;
            captureCanvas.height = video.videoHeight;
        });
    } catch (err) { alert('Akses webcam error: ' + err.message); }
}

function sendFrameForSignDetection() {
    if (!isDetecting || !socket || socket.readyState !== WebSocket.OPEN) return;
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
    socket.send(frameData);
}

function showDetectedWord(word) {
    if (detectedWordDisplay) detectedWordDisplay.textContent = word;
}

// ===== FUNGSI INI DIPERBAIKI =====
function findSuggestions(currentWord) {
    // Hanya proses jika ada kata yang diketik/dideteksi
    if (!currentWord) return [];
    const lowerCaseWord = currentWord.toLowerCase();
    const suggestions = dictionary.filter(dictWord =>
        dictWord.toLowerCase().startsWith(lowerCaseWord) &&
        dictWord.length > currentWord.length
    );
    return suggestions.slice(0, 10);
}

function showSuggestions(words, currentWord) {
    suggestedArea.innerHTML = '';
    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('suggested-word');
        span.onclick = () => {
            let text = messageBox.value.trimEnd();
            let lastSpaceIndex = text.lastIndexOf(' ');
            messageBox.value = (lastSpaceIndex === -1 ? "" : text.substring(0, lastSpaceIndex + 1)) + word.toUpperCase() + ' ';
            messageBox.focus();
            suggestedArea.innerHTML = '';
        };
        suggestedArea.appendChild(span);
    });
}

function updateSuggestionsFromMessageBox() {
    const words = messageBox.value.trim().split(' ');
    const currentWord = words[words.length - 1];
    const suggestions = findSuggestions(currentWord);
    showSuggestions(suggestions, currentWord);
}

function toggleDetection() {
    if (!isDetecting) {
        const selectedModel = modelSelect.value;
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            isDetecting = true;
            lastPrediction = "-";
            detectBtn.textContent = 'Hentikan Deteksi';
            detectBtn.classList.add('active-btn');
            modelSelect.disabled = true;
            signDetectionInterval = setInterval(sendFrameForSignDetection, 1000);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error: ${data.error}`); stopDetection(); return; }
            showDetectedWord(data.prediction);

            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                messageBox.value += data.prediction + " ";
                // Memicu saran kata secara manual setelah ada deteksi baru
                updateSuggestionsFromMessageBox();
            }
        };

        socket.onclose = stopDetection;
        socket.onerror = () => { alert("Gagal terhubung ke server deteksi."); stopDetection(); };
    } else {
        stopDetection();
    }
}

function stopDetection() {
    isDetecting = false;
    if (socket) { socket.close(); socket = null; }
    clearInterval(signDetectionInterval);
    detectBtn.textContent = 'Mulai Deteksi';
    detectBtn.classList.remove('active-btn');
    modelSelect.disabled = false;
    showDetectedWord('');
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.wav");
    recordBtn.textContent = 'Memproses...';
    recordBtn.disabled = true;
    recordBtn.classList.add('active-btn');
    try {
        const response = await fetch(TRANSCRIBE_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (response.ok && result.transcription) {
            sttBox.value += result.transcription.trim() + " ";
        } else {
            alert(`Error transkripsi: ${result.error || 'Gagal memproses permintaan'}`);
        }
    } catch (error) {
        alert("Terjadi kesalahan koneksi saat mengirim audio.");
    } finally {
        recordBtn.textContent = 'Rekam Suara';
        recordBtn.disabled = false;
        recordBtn.classList.remove('active-btn');
    }
}

// --- Event Listeners ---
detectBtn.addEventListener('click', toggleDetection);
clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    sttBox.value = '';
    suggestedArea.innerHTML = '';
    letterBuffer = [];
    lastPrediction = "-";
});

recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = 'Stop Merekam';
            recordBtn.classList.add('active-btn');
        } catch (err) {
            alert("Tidak bisa mengakses mikrofon.");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
    }
});

detectBtn.addEventListener('click', toggleDetection);
clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    sttBox.value = ''; 
    suggestedArea.innerHTML = '';
    lastPrediction = "-";
});
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = 'Stop Merekam';
            recordBtn.classList.add('active-btn');
        } catch (err) {
            alert("Tidak bisa mengakses mikrofon.");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
    }
});

// --- Jalankan Aplikasi ---
setupCamera();
loadDictionary();