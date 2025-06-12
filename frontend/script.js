// frontend/script.js (Final - Pemisahan Output Deteksi dan STT)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const sttBox = document.getElementById('stt-box'); // Kotak baru untuk hasil STT
const detectBtn = document.getElementById('detect-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
const recordBtn = document.getElementById('record-btn');
const detectedWordDisplay = document.getElementById('detected-word-display'); // Elemen baru
const modelSelect = document.getElementById('model-select'); // Elemen baru

// Elemen lain seperti modelSelect dan detectedWordDisplay bisa ditambahkan jika ada di HTML Anda

// --- Kamus dan State Aplikasi ---
let dictionary = [];
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

// --- Konfigurasi URL Backend ---
// Ganti URL ini saat Anda deploy
const BACKEND_DOMAIN = "1673-36-73-70-35.ngrok-free.app";
const WEBSOCKET_URL = `ws://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `http://${BACKEND_DOMAIN}/transcribe`;

// Variabel untuk perekaman audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// --- Fungsi-fungsi ---

async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json'); // Gunakan kamus.json sesuai permintaan terakhir
        if (!response.ok) throw new Error('Gagal memuat kamus');
        dictionary = await response.json();
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

function findSuggestions(currentWord) {
    if (!currentWord || currentWord.length < 2) return [];
    const lowerCaseWord = currentWord.toLowerCase();
    return dictionary.filter(dictWord => 
        dictWord.toLowerCase().startsWith(lowerCaseWord) && 
        dictWord.length > 1 && 
        dictWord.toLowerCase() !== lowerCaseWord
    ).slice(0, 10);
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

function toggleDetection() {
    if (!isDetecting) {
        // Menggunakan 'sibi' sebagai default, akan berfungsi jika dropdown tidak ada
        const selectedModel = document.getElementById('model-select') ? document.getElementById('model-select').value : 'sibi';
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            isDetecting = true;
            lastPrediction = "-";
            detectBtn.textContent = 'Hentikan Deteksi';
            if(document.getElementById('model-select')) document.getElementById('model-select').disabled = true;
            signDetectionInterval = setInterval(() => {
                if (!socket || socket.readyState !== WebSocket.OPEN) return;
                captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                socket.send(captureCanvas.toDataURL('image/jpeg', 0.8));
            }, 1000);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error: ${data.error}`); stopDetection(); return; }

            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                messageBox.value += data.prediction + " ";
                messageBox.dispatchEvent(new Event('input'));
            }
        };

        socket.onclose = () => stopDetection();
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
    if(document.getElementById('model-select')) document.getElementById('model-select').disabled = false;
}

// ===== FUNGSI INI DIUBAH =====
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
                // MASUKKAN HASIL KE KOTAK BARU 'stt-box'
                sttBox.value += result.transcription.trim() + " ";
            } else if (result.error) {
                alert(`Error transkripsi: ${result.error}`);
            }
        } else {
            alert("Gagal mengirim audio ke server. Status: " + response.status);
        }
    } catch (error) {
        alert("Terjadi kesalahan koneksi saat mengirim audio.");
    } finally {
        recordBtn.textContent = 'Rekam Suara';
        recordBtn.disabled = false;
    }
}

// --- Event Listeners ---
detectBtn.addEventListener('click', toggleDetection);

// Tombol Clear sekarang membersihkan kedua kotak pesan
clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    sttBox.value = ''; // Membersihkan kotak STT juga
    suggestedArea.innerHTML = '';
    lastPrediction = "-";
});

// Listener untuk saran kata (tidak berubah)
messageBox.addEventListener('input', () => {
    const words = messageBox.value.trim().split(' ');
    const currentWord = words[words.length - 1];
    const suggestions = findSuggestions(currentWord);
    showSuggestions(suggestions, currentWord);
});

// Listener untuk tombol rekam (tidak berubah)
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