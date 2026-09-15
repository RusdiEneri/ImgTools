---
title: ImgTools AI
emoji: 🖼️
colorFrom: indigo
colorTo: pink
sdk: gradio
app_file: app.py
app_port: 7860
hardware: zero-a10g
license: mit
---

# ImgTools AI — Backend Service

Layanan REST API bertenaga AI untuk pemrosesan gambar tingkat lanjut pada **ImgTools**, dibangun dengan FastAPI dan dioptimalkan untuk deployment pada **Hugging Face Spaces** (Docker CPU).

---

## Fitur Utama

- **Hapus Latar Belakang (Remove Background)**: Segmentasi gambar akurat berbasis model `briaai/RMBG-1.4`.
- **Tingkatkan Resolusi (Upscale)**: Super-resolution 2x & 4x berbasis `caidas/swin2SR-realworld-sr-x4-64-bsrl`.
- **Tingkatkan Kualitas (Enhance)**: Peningkatan ketajaman dan detail berbasis `caidas/swin2SR-classical-sr-x2-64` + UnsharpMask.
- **Buramkan Wajah & Sensor (Face Blur)**: Deteksi wajah otomatis dengan `Bingsu/yolov8n-face` (Ultralytics YOLO) + dukungan area manual (*bounding boxes* JSON) dengan filter Gaussian Blur atau Pixelate.
- **Konversi RAW ke JPG**: Ekstraksi dan post-processing citra kamera RAW profesional via LibRaw (`rawpy`).
- **Lazy-Load & Semaphore Caching**: Model ML hanya dimuat ke memori saat pertama kali dibutuhkan, dengan `asyncio.Semaphore` menjaga batas concurrency.
- **Normalisasi EXIF & Kontrol Memori**: Menormalkan orientasi EXIF secara otomatis dan membatasi ukuran memori dengan aman.

---

## Daftar Endpoint REST API

### 1. Health & Status
- **`GET /health`**: Status pemeriksaan kesehatan sistem (`{"status": "ok"}`).
- **`GET /`**: Info root dan ringkasan daftar endpoint yang aktif.

---

### 2. Hapus Latar Belakang
- **`POST /api/remove-bg`**
  - **Body (`multipart/form-data`)**: `file` (File biner citra)
  - **Respons**: Aliran biner citra `image/png` transparan (RGBA).

---

### 3. Upscale (Super-Resolution)
- **`POST /api/upscale`**
  - **Body / Params**:
    - `file` (File biner citra)
    - `scale` (`int`, default: `2`): Faktor perbesaran (`2` atau `4`). Validasi mengembalikan `422` jika tidak valid.
    - `max_side` (`int`, default: `2048`): Batas dimensi sisi terpanjang sebelum inferensi.
  - **Respons**: Aliran biner citra `image/png` beresolusi tinggi.

---

### 4. Enhance (Peningkatan Kualitas)
- **`POST /api/enhance`**
  - **Body / Params**:
    - `file` (File biner citra)
    - `strength` (`float`, default: `1.0`): Kekuatan penajaman (diterapkan pada filter UnsharpMask).
  - **Respons**: Aliran biner citra `image/png` tajam dan jernih.

---

### 5. Buramkan Wajah / Sensor Area
- **`POST /api/face-blur`**
  - **Body / Params**:
    - `file` (File biner citra)
    - `blur` (`int`, default: `25`): Radius blur atau ukuran pikselasi.
    - `mode` (`string`, default: `"gaussian"`): Mode sensor (`"gaussian"` atau `"pixelate"`).
    - `conf` (`float`, default: `0.35`): Ambang batas confidence deteksi wajah YOLO.
    - `boxes` (`string` JSON, opsional): List area manual `[x, y, w, h]` atau `[[x, y, w, h], ...]`.
  - **Respons**: Aliran biner citra `image/png` dengan area wajah/sensor yang diburamkan.

---

### 6. Konversi RAW ke JPG
- **`POST /api/raw-to-jpg`**
  - **Body**: `file` (File citra kamera RAW, misal: CR2, NEF, ARW, DNG, dsb.)
  - **Respons**: Aliran biner citra `image/jpeg` dengan kualitas 92.
  - **Error**: `422 Unprocessable Entity` jika berkas RAW tidak valid atau korup.

---

## Konfigurasi Lingkungan (*Environment Variables*)

| Variabel | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | string | `http://localhost:3000` | Domain CORS yang diizinkan (pisahkan dengan koma). |
| `MAX_PIXELS` | integer | `24000000` | Batas piksel maksimal (24 MP). Gambar di-downscale proporsional jika melampaui. |
| `MAX_BYTES` | integer | `26214400` | Batas ukuran berkas (25 MB, HTTP 413 jika melebihi). |
| `MAX_CONCURRENCY` | integer | `2` | Jumlah maksimum inferensi paralel. |

---

## Menjalankan Layanan

### Menggunakan Docker
```bash
docker build -t imgtools-ai .
docker run -p 7860:7860 -e ALLOWED_ORIGINS="http://localhost:3000" imgtools-ai
```
Dokumentasi interaktif OpenAPI / Swagger dapat diakses di `http://localhost:7860/docs`.
