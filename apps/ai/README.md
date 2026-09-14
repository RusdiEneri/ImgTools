---
title: ImgTools AI
emoji: 🖼️
colorFrom: indigo
colorTo: pink
sdk: static
app_port: 7860
hardware: cpu-basic
license: mit
---

# ImgTools AI — Backend Service

Layanan REST API bertenaga AI untuk manipulasi dan segmentasi gambar pada **ImgTools**, dibangun dengan FastAPI dan dioptimalkan untuk deployment pada **Hugging Face Spaces** (Docker CPU).

---

## Fitur Utama

- **Hapus Latar Belakang (Background Removal)**: Menggunakan model segmentasi canggih `briaai/RMBG-1.4`.
- **Lazy-Load Model**: Model AI hanya dimuat ke dalam memori saat pertama kali dibutuhkan, dengan pemanasan awal (*warm-up*) saat startup.
- **Manajemen Sumber Daya & Concurrency**:
  - `MAX_PIXELS` (default: 24 Megapiksel): Downscale proporsional otomatis untuk mencegah memori meluap (*OOM*).
  - `MAX_BYTES` (default: 25 MB): Validasi batas unggah berkas dengan HTTP 413.
  - `MAX_CONCURRENCY` (default: 2): Semaphore asyncio untuk membatasi eksekusi inferensi bersamaan pada CPU.
- **Normalisasi EXIF**: Memperbaiki orientasi foto secara otomatis sebelum inferensi (*exif transpose*).
- **Format Respons**: Menghasilkan gambar PNG transparan berkualitas tinggi (RGBA) via StreamingResponse.

---

## Spesifikasi Endpoint

### 1. Health Check
Memeriksa status kesiapan layanan (*liveness/readiness probe*).

- **Method**: `GET`
- **Path**: `/health`
- **Response**: `200 OK`
  ```json
  {
    "status": "ok"
  }
  ```

---

### 2. Status & Info Layanan
Informasi umum mengenai layanan dan daftar endpoint yang tersedia.

- **Method**: `GET`
- **Path**: `/`
- **Response**: `200 OK`
  ```json
  {
    "service": "ImgTools AI",
    "status": "online",
    "endpoints": {
      "health": "/health",
      "remove_bg": "/api/remove-bg"
    }
  }
  ```

---

### 3. Hapus Latar Belakang (*Remove Background*)
Menghapus latar belakang gambar dan mengembalikan gambar transparan dalam format PNG.

- **Method**: `POST`
- **Path**: `/api/remove-bg`
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: Berkas gambar biner (JPEG, PNG, WEBP, BMP, dsb.)
- **Respons Berhasil**: `200 OK`
  - `Content-Type`: `image/png`
  - *Body*: Aliran biner citra PNG dengan alpha channel (transparan).
- **Respons Kesalahan**:
  - `413 Payload Too Large`: Jika ukuran berkas melebihi `MAX_BYTES` (25 MB).
  - `415 Unsupported Media Type`: Jika format berkas tidak dikenali atau korup.
  - `500 Internal Server Error`: Jika terjadi kesalahan saat inferensi model.

#### Contoh Request (cURL):
```bash
curl -X POST "http://localhost:7860/api/remove-bg" \
  -H "accept: image/png" \
  -F "file=@foto_contoh.jpg" \
  --output hasil_transparan.png
```

#### Contoh Request (JavaScript Fetch):
```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("http://localhost:7860/api/remove-bg", {
  method: "POST",
  body: formData,
});

if (response.ok) {
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);
  // tampilkan gambar atau unduh
}
```

---

## Konfigurasi Lingkungan (*Environment Variables*)

| Variabel | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | string | `http://localhost:3000` | Daftar domain yang diizinkan untuk CORS (pisahkan dengan tanda koma). |
| `MAX_PIXELS` | integer | `24000000` | Batas maksimum jumlah piksel gambar (24 MP). Gambar yang lebih besar akan di-downscale proporsional. |
| `MAX_BYTES` | integer | `26214400` | Batas ukuran maksimum berkas yang diunggah (25 MB). |
| `MAX_CONCURRENCY` | integer | `2` | Jumlah maksimum inferensi model yang berjalan serentak. |

---

## Menjalankan Layanan

### Menggunakan Docker (Rekomendasi)

```bash
# 1. Build docker image
docker build -t imgtools-ai .

# 2. Jalankan container pada port 7860
docker run -p 7860:7860 -e ALLOWED_ORIGINS="http://localhost:3000" imgtools-ai
```

### Menggunakan Python Lokal

Pastikan Anda menggunakan Python 3.11:

```bash
# 1. Buat dan aktifkan virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2. Pasang dependensi
pip install -r requirements.txt

# 3. Jalankan server Uvicorn
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```
