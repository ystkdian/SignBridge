# Tech Stack Proyek SignBridge

## Frontend (Sisi Klien/Browser)

| Teknologi               | Deskripsi / Peran dalam Proyek |
|-------------------------|--------------------------------|
| HTML5                   | Membangun struktur dan elemen-elemen halaman web. |
| CSS3                    | Memberikan style, warna, dan tata letak pada antarmuka pengguna. |
| JavaScript (ES6+)       | Mengatur semua logika interaktif, komunikasi dengan backend, dan manipulasi halaman. |
| WebSocket API           | Membangun koneksi dua arah ke backend untuk deteksi isyarat secara real-time. |
| WebRTC API              | Digunakan untuk mengakses kamera secara real time |
| MediaRecorder API       | Merekam input audio dari mikrofon pengguna untuk fitur Speech-to-Text. |

## Backend (Sisi Server)

| Teknologi               | Deskripsi / Peran dalam Proyek |
|-------------------------|--------------------------------|
| Python                  | Bahasa pemrograman utama pada server. |
| FastAPI                 | Framework web untuk membangun API dan endpoint WebSocket. |
| Uvicorn                 | Server ASGI (Asynchronous Server Gateway Interface) yang menjalankan aplikasi FastAPI. |

## Machine Learning & AI

## Deployment & Tools

| Teknologi               | Deskripsi / Peran dalam Proyek |
|-------------------------|--------------------------------|
| Git & GitHub            | Untuk kontrol versi kode dan sebagai pusat repositori online. |
| Netlify                 | Platform yang digunakan untuk men-deploy frontend statis (HTML, CSS, JS). |
| Ngrok                   | Alat bantu (tunneling) untuk membuat server lokal bisa diakses dari internet untuk tujuan demo. |
| Chocolatey              | Package manager di Windows yang digunakan untuk menginstal FFmpeg. |
| FFmpeg                  | System-level tool yang dibutuhkan oleh library audio di backend. |
