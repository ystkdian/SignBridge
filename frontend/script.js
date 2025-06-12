// frontend/script.js (Final - Kamus JSON, Tanpa Speak Button, Terhubung ke Ngrok)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const detectBtn = document.getElementById('detect-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
const detectedWordDisplay = document.getElementById('detected-word-display');
const modelSelect = document.getElementById('model-select');
const recordBtn = document.getElementById('record-btn');

// --- Kamus dan State Aplikasi ---
let dictionary = []; // Akan diisi dari file JSON
let letterBuffer = [];
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

// --- Konfigurasi URL Backend ---
const BACKEND_DOMAIN = "1673-36-73-70-35.ngrok-free.app"; // URL Ngrok Anda
const WEBSOCKET_URL = `wss://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `https://${BACKEND_DOMAIN}/transcribe`;

// Variabel perekaman audio
let mediaRecorder;
let audioChunks = [];
let isRecording = false;


// --- Fungsi untuk Memuat Kamus ---
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        if (!response.ok) {
            throw new Error('Gagal memuat kamus: ' + response.statusText);
        }
        dictionary = await response.json();
        console.log(`Kamus berhasil dimuat dengan ${dictionary.length} kata.`);
    } catch (error) {
        console.error(error);
        dictionary = ['halo', 'apa', 'kabar']; // Kamus darurat
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

// --- Fungsi Logika Inti ---
function sendFrameForSignDetection() {
    if (!isDetecting || !socket || socket.readyState !== WebSocket.OPEN) return;
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
    socket.send(frameData);
}

function showDetectedWord(word) {
    if (detectedWordDisplay) detectedWordDisplay.textContent = word;
}

function findSuggestions(letters) {
    const lowerCaseLetters = letters.map(l => l.toLowerCase());
    const suggestions = dictionary.filter(word => {
        if (word.length < lowerCaseLetters.length || word.length > 15) return false;
        const lowerCaseWord = word.toLowerCase();
        return lowerCaseLetters.every(letter => lowerCaseWord.includes(letter));
    });
    return suggestions.slice(0, 10);
}

function showSuggestions(words) {
    suggestedArea.innerHTML = '';
    if (words.length === 0 && letterBuffer.length > 0) {
        suggestedArea.setAttribute('aria-label', `Tidak ada saran untuk "${letterBuffer.join('')}"`);
        return;
    }
    suggestedArea.removeAttribute('aria-label');
    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('suggested-word');
        span.onclick = () => {
            if (messageBox.value.slice(-1) !== " " && messageBox.value.length > 0) {
                messageBox.value += " " + word.toUpperCase() + " ";
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
        const selectedModel = modelSelect ? modelSelect.value : 'sibi';
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            isDetecting = true; letterBuffer = []; lastPrediction = "-";
            if (modelSelect) modelSelect.disabled = true;
            detectBtn.textContent = 'Hentikan Deteksi';
            signDetectionInterval = setInterval(sendFrameForSignDetection, 1500);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error dari server: ${data.error}`); toggleDetection(); return; }
            showDetectedWord(data.prediction);
            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                letterBuffer.push(data.prediction);
                console.log(`Buffer huruf: [${letterBuffer.join(', ')}]`);
                if (letterBuffer.length >= 3) {
                    const suggestions = findSuggestions(letterBuffer);
                    showSuggestions(suggestions);
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
    if(modelSelect) modelSelect.disabled = false;
    showDetectedWord('');
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.wav");
    if(recordBtn) {
        recordBtn.textContent = 'Memproses...';
        recordBtn.disabled = true;
    }
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
        if(recordBtn){
            recordBtn.innerHTML = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg> Rekam Suara`;
            recordBtn.disabled = false;
            recordBtn.style.backgroundColor = 'var(--primary-color)';
        }
    }
}

// --- Event Listeners ---
if(detectBtn) detectBtn.addEventListener('click', toggleDetection);
if(clearBtn) clearBtn.addEventListener('click', () => {
    messageBox.value = ''; letterBuffer = []; suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
    lastPrediction = "-";
});
// Event listener untuk speakBtn telah dihapus
if(recordBtn) {
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
}


// --- Jalankan Aplikasi ---
setupCamera();
loadDictionary();