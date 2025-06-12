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

// --- Konfigurasi dan State Aplikasi ---
let socket = null;
let isDetecting = false;
let signDetectionInterval;
let dictionary = []; // Opsi untuk dictionary yang dimuat dari JSON

// Atur URL ini sesuai dengan lingkungan Anda (lokal atau deploy)
const BACKEND_DOMAIN = "d805-2001-448a-4042-8c89-2014-c34d-827b-adb1.ngrok-free.app";
const WEBSOCKET_URL = `wss://${BACKEND_DOMAIN}/ws`;
const TRANSCRIBE_URL = `https://${BACKEND_DOMAIN}/transcribe`;

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');
let lastPrediction = "-";

// BARU: Variabel untuk mengontrol jeda/cooldown
let isCooldown = false;

// --- Fungsi untuk Memuat Dictionary ---
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        const json = await response.json();
        dictionary = Object.values(json); // Ambil semua nilai dari JSON sebagai dictionary
        console.log("Dictionary loaded", dictionary); // Untuk debug
    } catch (error) {
        console.error("Error loading dictionary:", error);
    }
}

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
                }, 2000); // 3000 milidetik = 3 detik

                // --- Tambahan: Menampilkan Saran Kata ---
                const lastDetectedWord = messageBox.value.trim().split(' ').slice(-1)[0].toLowerCase();
                if (lastDetectedWord.length >= 3) {
                    const suggestions = getSuggestions(lastDetectedWord);
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
    isCooldown = false; // Reset cooldown saat berhenti
    if (socket) { socket.close(); socket = null; }
    clearInterval(signDetectionInterval);
    detectBtn.textContent = 'Mulai Deteksi';
    modelSelect.disabled = false;
    detectBtn.style.backgroundColor = 'var(--primary-color)';
    showDetectedWord('');
}

// --- Fungsi untuk mendapatkan Saran Kata ---
function getSuggestions(detectedWord) {
    const filtered = dictionary.filter(word => {
        const wordLower = word.toLowerCase();
        return detectedWord.split('').some(letter => wordLower.includes(letter));
    });
    return filtered;
}

// --- Fungsi untuk Menampilkan Saran ---
function showSuggestions(words) {
    suggestedArea.innerHTML = ''; // Clear existing suggestions
    words.forEach(word => {
        const span = document.createElement('span'); // Create a span for each suggestion
        span.textContent = word; // Set the word text
        span.classList.add('suggested-word');  // Add a class for styling
        span.onclick = () => {
            // Append the clicked suggestion to the message box
            messageBox.value += word + ' '; 
            messageBox.focus(); // Focus back on the message box
            suggestedArea.innerHTML = ''; // Clear suggestions
        };
        suggestedArea.appendChild(span); // Add the span to the suggestions area
    });
}

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
detectBtn.addEventListener('click', async () => {
    if (dictionary.length === 0) { // Load dictionary before starting detection
        await loadDictionary();
    }
    toggleDetection();
});
clearBtn.addEventListener('click', () => { 
    messageBox.value = ''; 
    lastPrediction = "-"; 
    sttBox.value = ''; 
    detectedWordDisplay.textContent = ''; 
});
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

async function runApp() {
    await loadDictionary(); 
    await setupCamera(); 
}
runApp();