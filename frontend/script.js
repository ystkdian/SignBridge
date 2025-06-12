// frontend/script.js (Final - Logika Saran Kata Berdasarkan Isi Kotak Pesan)

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
let dictionary = []; // Akan dimuat dari file JSON
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
let isCooldown = false;

// URL Backend (tidak diubah sesuai permintaan Anda)
const BACKEND_DOMAIN = "1673-36-73-70-35.ngrok-free.app";
const WEBSOCKET_URL = `wss://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `https://${BACKEND_DOMAIN}/transcribe`;

// Variabel lain
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// --- Fungsi untuk Memuat Kamus ---
async function loadDictionary() {
    try {
        // Menggunakan nama file dictionary.json sesuai permintaan Anda
        const response = await fetch('dictionary.json');
        if (!response.ok) throw new Error('Gagal memuat kamus');
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
    if (isCooldown) return;
    if (!isDetecting || !socket || socket.readyState !== WebSocket.OPEN) return;
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
    socket.send(frameData);
}

function showDetectedWord(word) {
    if (detectedWordDisplay) detectedWordDisplay.textContent = word;
}

function findSuggestions(letterSequence) {
    // letterSequence adalah string seperti "HAL"
    const letters = letterSequence.split('').map(l => l.toLowerCase());
    if (letters.length === 0) return [];
    
    const suggestions = dictionary.filter(word => {
        if (word.length < letters.length || word.length > 15) return false;
        const lowerCaseWord = word.toLowerCase();
        return letters.every(letter => lowerCaseWord.includes(letter));
    });
    return suggestions.slice(0, 10);
}

function showSuggestions(words, currentLetters) {
    suggestedArea.innerHTML = '';
    if (words.length === 0 && currentLetters.length > 0) {
        suggestedArea.setAttribute('aria-label', `Tidak ada saran untuk "${currentLetters}"`);
        return;
    }
    suggestedArea.removeAttribute('aria-label');
    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('suggested-word');
        span.onclick = () => {
            // Ganti rangkaian huruf dengan kata yang dipilih
            let text = messageBox.value;
            let lastWordIndex = text.lastIndexOf(currentLetters.toUpperCase());
            if (lastWordIndex !== -1) {
                messageBox.value = text.substring(0, lastWordIndex) + word.toUpperCase() + " ";
            } else {
                messageBox.value += word.toUpperCase() + " ";
            }
            messageBox.focus();
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
            isDetecting = true;
            lastPrediction = "-";
            if (modelSelect) modelSelect.disabled = true;
            detectBtn.textContent = 'Hentikan Deteksi';
            detectBtn.style.backgroundColor = '#2a96e8'; // Warna biru gelap, bukan merah
            signDetectionInterval = setInterval(sendFrameForSignDetection, 1500);
        };

        // ===== LOGIKA INTI YANG DIPERBAIKI ADA DI SINI =====
        socket.onmessage = (event) => {
            if (isCooldown) return;
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error dari server: ${data.error}`); toggleDetection(); return; }
            showDetectedWord(data.prediction);

            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                
                // 1. Langsung tambahkan huruf ke kotak pesan (tanpa spasi)
                messageBox.value += data.prediction;

                // 2. Ambil rangkaian huruf terakhir dari kotak pesan
                const wordsInBox = messageBox.value.trim().split(' ');
                const currentLetterSequence = wordsInBox[wordsInBox.length - 1];

                // 3. Jika rangkaian huruf sudah 3 atau lebih, picu saran kata
                if (currentLetterSequence && currentLetterSequence.length >= 3) {
                    console.log(`Mencari saran untuk: "${currentLetterSequence}"`);
                    const suggestions = findSuggestions(currentLetterSequence);
                    showSuggestions(suggestions, currentLetterSequence);
                } else {
                    // Kosongkan saran jika huruf kurang dari 3
                    suggestedArea.innerHTML = '';
                    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
                }

                // Mulai jeda 3 detik untuk deteksi berikutnya
                isCooldown = true;
                setTimeout(() => {
                    isCooldown = false;
                    showDetectedWord("-");
                    lastPrediction = "-"; // Reset agar huruf yang sama bisa dideteksi lagi setelah jeda
                }, 3000);
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
    if(modelSelect) modelSelect.disabled = false;
    detectBtn.style.backgroundColor = 'var(--primary-color)';
    showDetectedWord('');
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
}

// Kode untuk tombol-tombol lain
clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
    lastPrediction = "-";
});
// (Kode untuk 'recordBtn' dan 'sendAudioToServer' tidak diubah)

// --- Jalankan Aplikasi ---
setupCamera();
loadDictionary();