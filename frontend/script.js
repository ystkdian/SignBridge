// frontend/script.js (Final dengan Jeda Deteksi)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const detectBtn = document.getElementById('detect-btn');
const sttBox = document.getElementById('stt-box');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
const detectedWordDisplay = document.getElementById('detected-word-display');
const modelSelect = document.getElementById('model-select');
const recordBtn = document.getElementById('record-btn');

const dictionary = ['halo', 'apa', 'kabar', 'terima', 'kasih', 'selamat', 'datang', 'sampai', 'jumpa', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// --- Konfigurasi dan State Aplikasi ---
let socket = null;
let isDetecting = false;
let signDetectionInterval;

// Atur URL ini sesuai dengan lingkungan Anda (lokal atau deploy)
const BACKEND_DOMAIN = "localhost:8001";
const WEBSOCKET_URL = `ws://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `http://${BACKEND_DOMAIN}/transcribe`;

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');
let lastPrediction = "-";

// BARU: Variabel untuk mengontrol jeda/cooldown
let isCooldown = false;


// --- Fungsi Inisialisasi ---
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

// --- Fungsi Deteksi Bahasa Isyarat ---
function sendFrameForSignDetection() {
    // BARU: Tambahan pengecekan. Jika sedang cooldown, jangan kirim frame.
    if (isCooldown) {
        return;
    }

    if (socket && socket.readyState === WebSocket.OPEN && isDetecting) {
        captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCtx.canvas.toDataURL('image/jpeg', 0.8);
        socket.send(frameData);
    }
}

function showDetectedWord(word) {
    detectedWordDisplay.textContent = word;
}

function toggleDetection() {
    if (!isDetecting) {
        const selectedModel = modelSelect.value;
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        console.log(`Menghubungkan ke: ${backendUrlWithMode}`);
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            console.log("Koneksi deteksi isyarat berhasil.");
            isDetecting = true;
            isCooldown = false; // Pastikan cooldown mati saat mulai
            detectBtn.textContent = 'Hentikan Deteksi';
            modelSelect.disabled = true;
            detectBtn.style.backgroundColor = '#ff4242';
            signDetectionInterval = setInterval(sendFrameForSignDetection, 250);
        };

        socket.onmessage = (event) => {
            // Jangan proses pesan baru jika sedang cooldown
            if (isCooldown) return;

            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error dari server: ${data.error}`); toggleDetection(); return; }
            
            showDetectedWord(data.prediction);

            // Logika utama untuk menambahkan teks dan memulai jeda
            if (data.prediction && data.prediction !== "-") {
                // Tambahkan teks ke kotak pesan
                if (messageBox.value.slice(-1) !== " " && messageBox.value.length > 0) {
                    messageBox.value += " " + data.prediction;
                } else {
                    messageBox.value += data.prediction;
                }

                // BARU: Mulai proses jeda 3 detik
                isCooldown = true;
                console.log(`Deteksi berhasil: ${data.prediction}. Memulai jeda 3 detik.`);
                
                setTimeout(() => {
                    isCooldown = false; // Matikan mode jeda
                    showDetectedWord("-"); // Hapus prediksi dari layar
                    console.log("Jeda selesai. Siap mendeteksi lagi.");
                }, 3000); // 3000 milidetik = 3 detik
            }
        };

        socket.onclose = () => { console.log("Koneksi deteksi isyarat ditutup."); stopDetection(); };
        socket.onerror = (error) => { console.error("WebSocket error:", error); alert("Gagal terhubung ke server deteksi."); stopDetection(); };
    } else {
        stopDetection();
    }
}

function stopDetection() {
    isDetecting = false;
    isCooldown = false; // Reset cooldown saat berhenti
    if (socket) { socket.close(); socket = null; }
    clearInterval(signDetectionInterval);
    detectBtn.textContent = 'Mulai Deteksi';
    modelSelect.disabled = false;
    detectBtn.style.backgroundColor = 'var(--primary-color)';
    showDetectedWord('');
}

// ... (Sisa kode untuk STT, Text-to-Speech, dan Saran Kata tidak berubah) ...

// --- Fungsi Speech-to-Text ---
async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.wav");
    recordBtn.textContent = 'Memproses...';
    recordBtn.disabled = true;
    try {
        const response = await fetch(TRANSCRIBE_URL, { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();
            if (result.transcription) {
                sttBox.value += result.transcription.trim() + " ";
            } else if (result.error) {
                alert(`Error transkripsi: ${result.error}`);
            }
        } else {
            alert("Gagal mengirim audio ke server. Status: " + response.status);
        }
    } catch (error) {
        console.error("Error saat mengirim audio:", error);
        alert("Terjadi kesalahan koneksi saat mengirim audio.");
    } finally {
        recordBtn.innerHTML = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg> Rekam Suara`;
        recordBtn.disabled = false;
        recordBtn.style.backgroundColor = 'var(--primary-color)';
    }
}

// --- Event Listeners ---
detectBtn.addEventListener('click', toggleDetection);
clearBtn.addEventListener('click', () => { messageBox.value = ''; lastPrediction = "-"; sttBox.value = ''; detectedWordDisplay.textContent = ''; });
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
                audioChunks = [];
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = 'Stop Merekam';
            recordBtn.style.backgroundColor = '#ff4242';
        } catch (err) {
            alert("Tidak bisa mengakses mikrofon. Pastikan Anda memberikan izin.");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
    }
});

messageBox.addEventListener('input', () => {
    const words = messageBox.value.trim().split(' ');
    const last = words[words.length - 1].toLowerCase();
    if (!last) { suggestedArea.innerHTML = ''; return; }
    const filtered = dictionary.filter(w => w.startsWith(last) && w !== last);
    showSuggestions(filtered);
});
function showSuggestions(words) {
    suggestedArea.innerHTML = '';
    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('suggested-word');
        span.onclick = () => {
            let text = messageBox.value;
            let lastSpace = text.lastIndexOf(' ');
            if (lastSpace === -1) { messageBox.value = word + ' '; } else { messageBox.value = text.slice(0, lastSpace + 1) + word + ' '; }
            messageBox.focus();
            suggestedArea.innerHTML = '';
        };
        suggestedArea.appendChild(span);
    });
}

// --- Jalankan Aplikasi ---
setupCamera();