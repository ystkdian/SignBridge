// frontend/script.js (Final - Logika Saran Kata Diperbaiki)

// --- Deklarasi Elemen DOM ---
const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const detectBtn = document.getElementById('detect-btn');
const speakBtn = document.getElementById('speak-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestedArea = document.getElementById('suggested-area');
const detectedWordDisplay = document.getElementById('detected-word-display');
const modelSelect = document.getElementById('model-select');
const recordBtn = document.getElementById('record-btn');

// --- Konfigurasi dan State Aplikasi ---
let dictionary = []; // Akan diisi dari file JSON
let letterBuffer = []; // BARU: Buffer untuk menampung huruf yang terdeteksi
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let lastPrediction = "-";
let isCooldown = false; // Dihapus dari sini karena logika jeda akan berbeda

// URL Backend (tidak diubah sesuai permintaan Anda)
const BACKEND_DOMAIN = "1673-36-73-70-35.ngrok-free.app";
const WEBSOCKET_URL = `wss://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `https://${BACKEND_DOMAIN}/transcribe`;

// Variabel untuk perekaman audio (tidak berubah)
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

// --- Fungsi untuk Memuat Kamus ---
async function loadDictionary() {
    try {
        // Nama file disesuaikan dengan permintaan Anda
        const response = await fetch('dictionary.json'); 
        if (!response.ok) {
            throw new Error('Gagal memuat kamus: ' + response.statusText);
        }
        dictionary = await response.json();
        console.log(`Kamus berhasil dimuat dengan ${dictionary.length} kata.`);
    } catch (error) {
        console.error(error);
        // Fallback jika file JSON gagal dimuat
        dictionary = ['halo', 'apa', 'kabar', 'maaf', 'gagal', 'memuat', 'kamus'];
    }
}

// --- Fungsi Inisialisasi Kamera (tidak berubah) ---
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
    const canvas = captureCanvas;
    const ctx = captureCtx;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    socket.send(frameData);
}

function showDetectedWord(word) {
    if (detectedWordDisplay) detectedWordDisplay.textContent = word;
}

// Fungsi pencarian kata (tidak berubah)
function findSuggestions(letters) {
    const lowerCaseLetters = letters.map(l => l.toLowerCase());
    const suggestions = dictionary.filter(word => {
        if (word.length < lowerCaseLetters.length || word.length > 15) return false; // Batasi panjang kata
        const lowerCaseWord = word.toLowerCase();
        return lowerCaseLetters.every(letter => lowerCaseWord.includes(letter));
    });
    return suggestions.slice(0, 10);
}

// Fungsi untuk menampilkan saran kata (diperbarui)
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
            // Menambahkan kata yang dipilih ke kotak pesan
            if (messageBox.value.slice(-1) !== " " && messageBox.value.length > 0) {
                messageBox.value += " " + word.toUpperCase() + " ";
            } else {
                messageBox.value += word.toUpperCase() + " ";
            }
            messageBox.focus();
            
            // Kosongkan buffer dan area saran setelah kata dipilih
            letterBuffer = [];
            suggestedArea.innerHTML = '';
            suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
        };
        suggestedArea.appendChild(span);
    });
}

function toggleDetection() {
    if (!isDetecting) {
        const selectedModel = modelSelect.value;
        const backendUrlWithMode = `${WEBSOCKET_URL}/${selectedModel}`;
        console.log(`Menghubungkan ke: ${backendUrlWithMode}`);
        socket = new WebSocket(backendUrlWithMode);

        socket.onopen = () => {
            isDetecting = true;
            letterBuffer = [];
            lastPrediction = "-";
            detectBtn.textContent = 'Hentikan Deteksi';
            modelSelect.disabled = true;
            detectBtn.style.backgroundColor = '#ff4242';
            signDetectionInterval = setInterval(sendFrameForSignDetection, 1500); // Deteksi setiap 1.5 detik
        };

        // ===== LOGIKA INTI YANG DIPERBAIKI ADA DI SINI =====
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) { alert(`Error dari server: ${data.error}`); toggleDetection(); return; }
            
            showDetectedWord(data.prediction);

            // Hanya proses jika ada prediksi BARU yang valid (bukan duplikat)
            if (data.prediction && data.prediction !== "-" && data.prediction !== lastPrediction) {
                lastPrediction = data.prediction;
                
                // Tambahkan huruf baru ke buffer
                letterBuffer.push(data.prediction);
                console.log(`Buffer huruf saat ini: [${letterBuffer.join(', ')}]`);

                // Jika buffer sudah berisi 3 huruf atau lebih, cari dan tampilkan saran
                if (letterBuffer.length >= 3) {
                    const suggestions = findSuggestions(letterBuffer);
                    showSuggestions(suggestions);
                }
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
    letterBuffer = [];
    if (socket) { socket.close(); socket = null; }
    clearInterval(signDetectionInterval);
    detectBtn.textContent = 'Mulai Deteksi';
    modelSelect.disabled = false;
    detectBtn.style.backgroundColor = 'var(--primary-color)';
    showDetectedWord('');
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
}

// --- Event Listeners dan Fungsi Lainnya ---
// Kode untuk Speech-to-Text dan Text-to-Speech TIDAK DIUBAH.
// Cukup salin dari file Anda sebelumnya.
detectBtn.addEventListener('click', toggleDetection);
clearBtn.addEventListener('click', () => {
    messageBox.value = '';
    letterBuffer = [];
    suggestedArea.innerHTML = '';
    suggestedArea.setAttribute('aria-label', 'Saran kata muncul di sini...');
    lastPrediction = "-";
});
// ... (salin fungsi dan listener untuk recordBtn dan speakBtn dari file Anda) ...


// --- Jalankan Aplikasi ---
setupCamera();
loadDictionary(); // Memuat kamus saat aplikasi dimulai