// frontend/script.js (Final - Termasuk Deteksi Isyarat, STT, dan Saran Kata)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const detectBtn = document.getElementById('detect-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
// Deklarasi tombol STT dan TTS
const recordBtn = document.getElementById('record-btn');


// --- Kamus dan State Aplikasi ---
let dictionary = []; // Akan dimuat dari file JSON
let letterBuffer = []; // Buffer untuk menampung huruf yang terdeteksi
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

// --- Konfigurasi URL Backend ---
// Ganti URL ini saat Anda deploy ke Ngrok atau Render
const BACKEND_DOMAIN = "1673-36-73-70-35.ngrok-free.app";
const WEBSOCKET_URL = `ws://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `http://${BACKEND_DOMAIN}/transcribe`;

// Variabel untuk perekaman audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;


// --- Fungsi untuk Memuat Kamus dari JSON ---
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json'); // Pastikan Anda punya file ini
        if (!response.ok) throw new Error('Gagal memuat kamus');
        dictionary = await response.json();
        console.log(`Kamus berhasil dimuat dengan ${dictionary.length} kata.`);
    } catch (error) {
        console.error(error);
        dictionary = ['halo', 'apa', 'kabar'];
    }
}

// --- Fungsi Inisialisasi Kamera ---
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

// --- Fungsi Logika Inti Aplikasi ---

function sendFrameForSignDetection() {
    if (!isDetecting || !socket || socket.readyState !== WebSocket.OPEN) return;
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
    socket.send(frameData);
}

function findSuggestions(letterSequence) {
    const letters = letterSequence.toLowerCase().split('');
    if (letters.length === 0) return [];
    const suggestions = dictionary.filter(word => {
        if (word.length < letters.length) return false;
        const lowerCaseWord = word.toLowerCase();
        return letters.every(letter => lowerCaseWord.includes(letter));
    });
    return suggestions.slice(0, 10);
}

function showSuggestions(words, currentLetters) {
    suggestedArea.innerHTML = '';
    if (words.length === 0) {
        suggestedArea.setAttribute('aria-label', `Tidak ada saran untuk "${currentLetters}"`);
        return;
    }
    suggestedArea.removeAttribute('aria-label');
    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('suggested-word');
        span.onclick = () => {
            let text = messageBox.value;
            let lastWordIndex = text.toUpperCase().lastIndexOf(currentLetters.toUpperCase());
            if (lastWordIndex !== -1) {
                messageBox.value = text.substring(0, lastWordIndex) + word.toUpperCase() + " ";
            } else {
                messageBox.value += word.toUpperCase() + " ";
            }
            messageBox.focus();
            letterBuffer = [];
            suggestedArea.innerHTML = '';
            suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
        };
        suggestedArea.appendChild(span);
    });
}

function toggleDetection() {
    if (!isDetecting) {
        const selectedModel = document.getElementById('model-select') ? document.getElementById('model-select').value : 'sibi';
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            isDetecting = true; letterBuffer = []; lastPrediction = "-";
            detectBtn.textContent = 'Hentikan Deteksi';
            signDetectionInterval = setInterval(sendFrameForSignDetection, 1500);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error dari server: ${data.error}`); toggleDetection(); return; }
            if (document.getElementById('detected-word-display')) document.getElementById('detected-word-display').textContent = data.prediction;

            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                letterBuffer.push(data.prediction);
                console.log(`Buffer huruf: [${letterBuffer.join(', ')}]`);

                if (letterBuffer.length >= 3) {
                    const suggestions = findSuggestions(letterBuffer);
                    showSuggestions(suggestions, letterBuffer.join(''));
                }
            }
        };

        socket.onclose = () => stopDetection();
        socket.onerror = () => { alert("Gagal terhubung ke server deteksi."); stopDetection(); };
    } else {
        stopDetection();
    }
}

function stopDetection() {
    isDetecting = false; letterBuffer = [];
    if (socket) { socket.close(); socket = null; }
    clearInterval(signDetectionInterval);
    detectBtn.textContent = 'Mulai Deteksi';
    if(document.getElementById('model-select')) document.getElementById('model-select').disabled = false;
    if(document.getElementById('detected-word-display')) document.getElementById('detected-word-display').textContent = '';
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
}

// --- FUNGSI TRANSKRIPSI AUDIO (YANG SEBELUMNYA HILANG) ---
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
                messageBox.value += result.transcription.trim() + " ";
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
    }
}

// --- Event Listeners ---
detectBtn.addEventListener('click', toggleDetection);

clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    letterBuffer = [];
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
    lastPrediction = "-";
});

// Event Listener untuk Tombol Rekam Suara
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

// Event Listener untuk tombol Ucapkan Pesan (jika ada di HTML)


// --- Jalankan Aplikasi ---
setupCamera();
loadDictionary();