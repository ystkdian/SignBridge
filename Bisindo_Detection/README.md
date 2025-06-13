# **Proyek Pengenalan Alfabet BISINDO Menggunakan Model Hybrid**

Dokumentasi ini memberikan panduan lengkap untuk proyek pengenalan alfabet Bahasa Isyarat Indonesia (BISINDO) menggunakan model **deep learning**. Proyek ini memanfaatkan model hybrid yang menggabungkan arsitektur **MobileNetV2** untuk analisis fitur gambar dan MediaPipe untuk ekstraksi landmark tangan, sehingga menghasilkan sistem pengenalan yang akurat dan efisien.

## **Daftar Isi**

* [Prasyarat](#bookmark=id.dcvbupikkde3)  
* [Instalasi](#bookmark=id.7bxghgibv51t)  
* [Struktur Proyek](#bookmark=id.pk0vm25g6yct)  
* [Langkah-Langkah Eksekusi dan Penjelasan Program](#bookmark=id.9p7oa74f1l4q)  
* [Hasil](#bookmark=id.pw0pqt1wcocs)  

## **Prasyarat**

Sebelum memulai, pastikan Anda memiliki:

* Python 3\.  
* Akses ke lingkungan Google Colab (disarankan untuk pemanfaatan GPU gratis) atau Jupyter Notebook.  
* Akun Kaggle untuk mengunduh dataset yang diperlukan.

## **Instalasi**

Langkah pertama adalah menginstal semua pustaka Python yang dibutuhkan. Perintah ini akan mengunduh dan menginstal pustaka seperti MediaPipe untuk deteksi tangan, TensorFlow untuk membangun model, dan lainnya.
![Screenshot 2025-06-13 135700](https://github.com/user-attachments/assets/336d1532-8267-43df-ad48-6f4d1b32e425)


## **Struktur Proyek**

Proyek ini akan membuat struktur direktori berikut di dalam Google Drive Anda. Ini membantu dalam mengelola file dataset, data yang telah diproses, dan model yang disimpan secara terorganisir.

/content/drive/MyDrive/Capstone/

├── dataset_isyarat/

│   ├── raw_data/

│   └── alfabet-bisindo.zip

├── processed_hybrid_data/

│   ├── ... (file .npy dan .txt)

└── models_hybrid/

    └── ... (file .keras dan .h5)


## **Langkah-Langkah Eksekusi dan Penjelasan Program**

### **1\. Pengaturan Awal dan Impor Pustaka**

Tujuan: Menyiapkan lingkungan kerja.  
Penjelasan Program: Sel ini mengimpor semua modul dan pustaka yang akan digunakan di seluruh proyek dan menghubungkan Google Colab dengan Google Drive Anda.  
![Screenshot 2025-06-13 135726](https://github.com/user-attachments/assets/12f8d50d-b592-4281-a7f8-4c4cfb9a8fe4)


### **2\. Pengaturan Path Direktori**

Tujuan: Mendefinisikan lokasi penyimpanan file.  
Penjelasan Program: Kode ini mendefinisikan variabel-variabel yang berisi path ke direktori-direktori penting dan membuatnya jika belum ada.  

![Screenshot 2025-06-13 142947](https://github.com/user-attachments/assets/84c98851-ee26-4b9c-9678-e35cd6b2916d)

### **3\. Unduh dan Ekstrak Dataset**

Tujuan: Mendapatkan data gambar yang akan digunakan untuk melatih model.  
Penjelasan Program:

* **Kredensial Kaggle**: Anda akan diminta mengunggah file kaggle.json dari akun Kaggle Anda.  
* **Unduh & Ekstrak**: Program akan menggunakan API Kaggle untuk mengunduh dan mengekstrak dataset ke RAW\_DATA\_PATH.
![Screenshot 2025-06-13 143018](https://github.com/user-attachments/assets/4ced47e5-182d-4947-9f5d-f019d18c261f)

### **4\. Pra-pemrosesan dan Ekstraksi Fitur**

Tujuan: Mengubah data mentah menjadi format yang siap untuk model.  
Penjelasan Program:

* **extract\_landmarks\_from\_image**: Fungsi untuk mendeteksi dan menormalisasi 21 *landmark* (x,y) tangan dari sebuah gambar.  
* **process\_hybrid\_dataset**: Fungsi utama untuk melakukan iterasi ke semua gambar, mengubah ukurannya, memanggil ekstraksi *landmark*, dan menyimpan hasilnya sebagai file .npy.
  
![Screenshot 2025-06-13 135930](https://github.com/user-attachments/assets/440d328f-80ae-41c9-b7aa-981fd5f43cf6)
![Screenshot 2025-06-13 140011](https://github.com/user-attachments/assets/256dcc8d-45ce-419e-9a5c-51180169c512)



### **5\. Persiapan Data untuk Pelatihan**

Tujuan: Membagi data dan menyiapkan augmentasi untuk mencegah overfitting.  
Penjelasan Program: Memuat data yang telah diproses, menormalisasi nilai piksel gambar, melakukan one-hot encoding pada label, membagi data menjadi set pelatihan, validasi, dan pengujian, serta menyiapkan ImageDataGenerator untuk augmentasi.  

![Screenshot 2025-06-13 140050](https://github.com/user-attachments/assets/1fef9a79-ebd0-42a4-b149-ed6cead0b658)

### **6\. Pembuatan dan Pelatihan Model**

Tujuan: Membangun dan melatih arsitektur model hybrid.  
Penjelasan Program: Mendefinisikan arsitektur model dengan dua input (gambar dan landmark), menggabungkan fitur dari keduanya, dan melatihnya menggunakan data yang telah disiapkan.  

![Screenshot 2025-06-13 140111](https://github.com/user-attachments/assets/106ead9c-0b1b-4380-9661-6ed564fc6489)
![Screenshot 2025-06-13 140138](https://github.com/user-attachments/assets/f4f11e99-f6c3-4b98-80db-1b716a70f12e)


### **7\. Evaluasi Model**

Tujuan: Mengukur performa model pada data yang belum pernah dilihat.  
Penjelasan Program: Setelah dilatih, model dievaluasi pada data uji untuk mendapatkan metrik performa yang objektif.  
![Screenshot 2025-06-13 140215](https://github.com/user-attachments/assets/0adc8014-86d6-4e0e-a4db-f3e087de1588)


### **8\. Simpan Model dan Prediksi**

Tujuan: Menyimpan model dan mengujinya pada gambar baru.  
Penjelasan Program: Menyimpan model yang telah dilatih dan menyediakan fungsi interaktif untuk memprediksi kelas dari gambar yang diunggah pengguna.  
![Screenshot 2025-06-13 140313](https://github.com/user-attachments/assets/b1229c0c-5fc1-4906-b254-51bbda487b11)
![Screenshot 2025-06-13 140243](https://github.com/user-attachments/assets/2c2e9c51-d135-413e-87d3-8ec0f8e2dee2)


## **Hasil**

Model yang telah dilatih menunjukkan performa yang sangat baik dan berhasil mencapai:

* **Akurasi Validasi Tertinggi**: **90.70%**  
* **Akurasi pada Data Pengujian**: **90.70%**

Hasil ini menunjukkan bahwa arsitektur hybrid mampu mempelajari fitur visual dan spasial dari bahasa isyarat secara efektif, dengan kemampuan generalisasi yang kuat pada data baru.

**Catatan Penting**: Karena model ini memiliki dua input (image\_input dan landmark\_input), saat menggunakannya di JavaScript, Anda harus memberikan input dalam bentuk *dictionary* yang sesuai, misalnya: model.predict({'image\_input': imageTensor, 'landmark\_input': landmarkTensor}).
