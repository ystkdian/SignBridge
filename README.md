# **Proyek Pengenalan Bahasa Isyarat SIBI & BISINDO Menggunakan Model Hybrid**

Dokumentasi ini memberikan panduan lengkap untuk proyek pengenalan abjad Bahasa Isyarat Indonesia (SIBI & BISINDO) menggunakan model *deep learning*. Proyek ini memanfaatkan model hybrid yang menggabungkan arsitektur **MobileNetV2** untuk analisis fitur gambar dan **MediaPipe** untuk ekstraksi *landmark* tangan, sehingga menghasilkan sistem pengenalan yang akurat dan efisien.

## **Daftar Isi**

1. [Hasil Akhir](#bookmark=id.cjo4qso0x93j)  
2. [Prasyarat](#bookmark=id.nunk08u5yhls)  
3. [Struktur Proyek](#bookmark=id.uckfa7dz9qf3)  
4. [Langkah 1: Setup Arsitektur dan Pelatihan Model](#bookmark=id.7ng142dnmkur)  
5. [Langkah 2: Setup Backend (Lokal)](#bookmark=id.srjwghjie4cu)  
6. [Langkah 3: Setup Gateway Publik dengan Ngrok](#bookmark=id.jtgydw7o8vv6)  
7. [Langkah 4: Setup Frontend](#bookmark=id.hf92g2o7vp8k)

## **Hasil Akhir**

Model yang telah dilatih menunjukkan performa yang sangat baik dan berhasil mencapai:

* **Akurasi Validasi SIBI**: **98.77%**  
* **Akurasi Validasi BISINDO**: **90.70%**

**Link Aplikasi Live:** [https://signbridge-app.netlify.app/](https://signbridge-app.netlify.app/)

## **Prasyarat**

Sebelum memulai, pastikan Anda memiliki:

* Python 3\.  
* Akses ke lingkungan Google Colab (disarankan untuk pemanfaatan GPU gratis) atau Jupyter Notebook.  
* Akun Kaggle untuk mengunduh dataset yang diperlukan.

## **Struktur Proyek**

Proyek ini akan membuat struktur direktori berikut di dalam Google Drive Anda untuk mengelola file dataset, data yang telah diproses, dan model yang disimpan secara terorganisir.

**Struktur SIBI**

/content/drive/MyDrive/Capstone/Sibi/  
├── dataset\_isyarat/  
│   ├── raw\_data/  
│   └── combined-sibi-dataset.zip  
├── processed\_hybrid\_data/  
│   ├── ... (file .npy dan .txt)  
└── models\_hybrid/  
    └── ... (file .keras dan .h5)

**Struktur BISINDO**

/content/drive/MyDrive/Capstone/  
├── dataset\_isyarat/  
│   ├── raw\_data/  
│   └── alphabet-bisindo.zip  
├── processed\_hybrid\_data/  
│   ├── ... (file .npy dan .txt)  
└── models\_hybrid/  
    └── ... (file .keras dan .h5)

## **1\. Setup Arsitektur dan Pelatihan Model**

Langkah ini idealnya dilakukan di **Google Colab** untuk memanfaatkan GPU gratis.

#### **1.1 Instalasi & Impor Pustaka**

* **Tujuan:** Menyiapkan lingkungan kerja dengan menginstal semua library yang dibutuhkan.  
* **Penjelasan Program:** Sel ini menginstal pustaka seperti MediaPipe, TensorFlow, Scikit-learn, dll., lalu mengimpornya ke dalam notebook dan menghubungkan ke Google Drive.

\# Instalasi Pustaka  
\!pip install mediapipe opencv-python tensorflow==2.15.0 scikit-learn matplotlib seaborn kaggle  
\`\`\`python  
\# Impor Pustaka dan Mount Drive  
import os  
import cv2  
import mediapipe as mp  
\# ... dan impor lainnya  
from google.colab import drive  
drive.mount('/content/drive')

#### **1.2 Pengaturan Path Direktori**

* **Tujuan:** Mendefinisikan lokasi penyimpanan file.  
* **Penjelasan Program:** Mendefinisikan variabel-variabel path ke direktori dataset, data yang telah diproses, dan lokasi penyimpanan model.

#### **1.3 Unduh dan Ekstrak Dataset**

* **Tujuan:** Mendapatkan data gambar untuk melatih model.  
* **Penjelasan Program:** Anda akan diminta mengunggah file kaggle.json dari akun Kaggle Anda. Program akan menggunakan API Kaggle untuk mengunduh dan mengekstrak dataset ke RAW\_DATA\_PATH.

#### **1.4 Pra-pemrosesan dan Ekstraksi Fitur**

* **Tujuan:** Mengubah data mentah menjadi format yang siap untuk model.  
* **Penjelasan Program:**  
  * **extract\_landmarks\_from\_image**: Fungsi untuk mendeteksi dan menormalisasi 21 *landmark* (x,y) tangan dari sebuah gambar.  
  * **process\_hybrid\_dataset**: Fungsi utama untuk melakukan iterasi ke semua gambar, mengubah ukurannya, memanggil ekstraksi *landmark*, dan menyimpan hasilnya sebagai file .npy untuk pemrosesan yang lebih cepat di kemudian hari.

#### **1.5 Persiapan Data untuk Pelatihan**

* **Tujuan:** Membagi data dan menyiapkan augmentasi untuk mencegah *overfitting*.  
* **Penjelasan Program:** Memuat data .npy, menormalisasi nilai piksel gambar, melakukan *one-hot encoding* pada label, membagi data menjadi set pelatihan, validasi, dan pengujian, serta menyiapkan ImageDataGenerator untuk augmentasi gambar.

#### **1.6 Pembuatan dan Pelatihan Model**

* **Tujuan:** Membangun dan melatih arsitektur model hybrid.  
* **Penjelasan Program:** Mendefinisikan arsitektur model dengan dua input (gambar dan landmark), menggabungkan fitur dari keduanya melalui *concatenation*, dan melatihnya menggunakan data yang telah disiapkan.

#### **1.7 Evaluasi dan Penyimpanan Model**

* **Tujuan:** Mengukur performa model dan menyimpannya untuk digunakan nanti.  
* **Penjelasan Program:** Setelah dilatih, model dievaluasi pada data uji untuk mendapatkan metrik performa seperti akurasi, presisi, dan recall. Model terbaik kemudian disimpan dalam format .keras dan .h5.

## **2\. Setup Backend (Lokal)**

#### **2.1 Navigasi ke Folder Backend**

Buka terminal dan masuk ke direktori backend proyek Anda.

cd path/to/SignBridge-App/backend

#### **2.2 Buat Virtual Environment**

Membuat lingkungan Python terisolasi.

\# Perintah untuk membuat venv  
python \-m venv venv

\# Aktivasi di Windows  
venv\\Scripts\\activate

\# Aktivasi di macOS/Linux  
source venv/bin/activate

#### **2.3 Install Dependencies**

Install semua library yang dibutuhkan dari file requirements.txt.

pip install \-r requirements.txt

#### **2.4 Jalankan Backend Server**

Jalankan server web ASGI menggunakan Uvicorn.

\# Gunakan port 8001 untuk demo lokal  
uvicorn main:app \--port 8001

Backend sekarang berjalan di http://localhost:8001.

## **3\. Setup Gateway Publik dengan Ngrok**

(Opsional, untuk demo dari komputer lokal)

#### **3.1 Install & Konfigurasi Ngrok**

Proses ini hanya perlu dilakukan sekali.

1. Unduh Ngrok dari https://ngrok.com/download.  
2. Daftar akun untuk mendapatkan Authtoken.  
3. Konfigurasi token di terminal:  
   ngrok config add-authtoken \<TOKEN\_DARI\_DASHBOARD\>

#### **3.2 Jalankan Tunnel Ngrok**

1. Buka terminal **baru** (biarkan terminal backend tetap berjalan).  
2. Buat URL publik yang menunjuk ke server lokal Anda:  
   ngrok http 8001

   *Catatan: port 8001 harus sama dengan yang digunakan Uvicorn.*

## **4\. Setup Frontend**

#### **4.1 Konfigurasi Koneksi Frontend**

1. Buka file frontend/script.js.  
2. Ubah konstanta BACKEND\_DOMAIN dengan URL publik yang didapat dari Ngrok atau Render (hanya nama domainnya, tanpa https://).  
   // Ganti dengan domain Anda  
   const BACKEND\_DOMAIN \= "xxxx-xx-xx.ngrok-free.app";

   const WEBSOCKET\_URL \= \`wss://${BACKEND\_DOMAIN}/ws\`;  
   const TRANSCRIBE\_URL \= \`https://${BACKEND\_DOMAIN}/transcribe\`;

   *Alamat Ngrok gratis akan berubah setiap kali dijalankan ulang, jadi pastikan Anda mengubahnya setiap kali ingin demo.*

#### **4.2 Deploy Frontend ke Netlify**

1. Daftar di https://www.netlify.com/ dan hubungkan ke akun GitHub Anda.  
2. Buat "New site from Git" dan pilih repositori proyek Anda.  
3. Isi Konfigurasi:  
   * **Branch to deploy:** main  
   * **Build command:** Biarkan kosong  
   * **Publish directory:** frontend  
4. Klik **"Deploy site"**. Setelah selesai, aplikasi Anda dapat diakses melalui domain yang disediakan Netlify.
