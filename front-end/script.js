const video = document.getElementById('webcam');
const messageBox = document.getElementById('message-box');
const suggestedWord = document.getElementById('suggested-word');
const detectBtn = document.getElementById('detect-btn');
const speakBtn = document.getElementById('speak-btn');

//Akses webcam video
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false});
        video.srcObject = stream;
    } catch (err) {
        alert('Akses webcam error: ' + err.message);
    }
}

setupCamera();

//Fungsi untuk memulai deteksi
function startDetection() {
    //
}

detectBtn.addEventListener('click', () => {
    startDetection();
})

speakBtn.addEventListener('click', () => {
    const text = messageBox.value.trim();
    if (!text) {
        alert('Tidak ada pesan terdeteksi');
        return;
    }
    if ('speechSynthesis' in window){
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id';
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Maaf browser Anda tidak mendukung teks ke ucapan')
    }
});