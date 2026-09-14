import os
import io
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from PIL import Image, ImageOps

# Konfigurasi Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("imgtools-ai")

# Konfigurasi Environment Variables
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]

MAX_PIXELS = int(os.getenv("MAX_PIXELS", 24_000_000))  # Default 24 Megapixels
MAX_BYTES = int(os.getenv("MAX_BYTES", 25 * 1024 * 1024))  # Default 25 MB
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", 2))  # Default 2 concurrent requests

# Semaphore untuk membatasi eksekusi serentak pada CPU/RAM terbatas
concurrency_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

# Cache penyimpanan model ML (Lazy-loaded)
_models: Dict[str, Any] = {}


def model(name: str):
    """
    Lazy-load dan cache model ML dalam dictionary.
    Mendukung model 'remove-bg' menggunakan briaai/RMBG-1.4.
    """
    if name not in _models:
        logger.info(f"Memuat model '{name}' ke memori...")
        if name == "remove-bg":
            from transformers import pipeline

            _models[name] = pipeline(
                "image-segmentation",
                model="briaai/RMBG-1.4",
                trust_remote_code=True,
            )
            logger.info("Model 'remove-bg' (briaai/RMBG-1.4) berhasil dimuat.")
        else:
            raise ValueError(f"Model '{name}' tidak didukung.")
    return _models[name]


async def read_image(file: UploadFile) -> Image.Image:
    """
    Helper untuk membaca berkas gambar yang diunggah:
    - Menolak berkas jika ukuran > MAX_BYTES (HTTP 413).
    - Membuka dengan Pillow & menolak jika format tidak dikenal (HTTP 415).
    - Menormalkan orientasi EXIF (exif_transpose).
    - Downscale proporsional jika jumlah piksel > MAX_PIXELS.
    """
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran berkas ({len(contents)} byte) melebihi batas maksimal {MAX_BYTES} byte ({MAX_BYTES // (1024 * 1024)}MB).",
        )

    try:
        img = Image.open(io.BytesIO(contents))
        img.load()
    except Exception:
        raise HTTPException(
            status_code=415,
            detail="Format gambar tidak didukung atau berkas rusak.",
        )

    # Normalisasi orientasi foto sesuai metadata EXIF
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # Periksa dan downscale jika melebihi batas maksimal piksel
    orig_w, orig_h = img.size
    total_pixels = orig_w * orig_h
    if total_pixels > MAX_PIXELS:
        scale = (MAX_PIXELS / total_pixels) ** 0.5
        new_w = max(1, int(orig_w * scale))
        new_h = max(1, int(orig_h * scale))
        logger.info(f"Gambar di-downscale dari {orig_w}x{orig_h} ke {new_w}x{new_h} (> {MAX_PIXELS} px).")
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    return img


def png_response(image: Image.Image) -> StreamingResponse:
    """
    Helper untuk mengembalikan objek PIL Image sebagai StreamingResponse bertipe image/png.
    """
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Event startup & shutdown lifecycle:
    Melakukan warm-up model 'remove-bg' saat server dinyalakan.
    Jika gagal karena keterbatasan memori saat boot, log warning saja.
    """
    logger.info("Memulai layanan ImgTools AI...")
    try:
        logger.info("Melakukan warm-up model 'remove-bg'...")
        model("remove-bg")
    except Exception as e:
        logger.warning(f"Warm-up model ditangguhkan (akan dimuat saat request pertama): {e}")
    yield
    logger.info("Mematikan layanan ImgTools AI...")
    _models.clear()


# Inisialisasi Aplikasi FastAPI
app = FastAPI(
    title="ImgTools AI",
    description="REST API AI untuk manipulasi dan segmentasi gambar pada Hugging Face Spaces",
    version="1.0.0",
    lifespan=lifespan,
)

# Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """
    Health check endpoint untuk Docker & orchestrator.
    """
    return {"status": "ok"}


@app.get("/")
def root():
    """
    Root info endpoint.
    """
    return {
        "service": "ImgTools AI",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "remove_bg": "/api/remove-bg",
        },
    }


@app.post("/api/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """
    Hapus latar belakang foto menggunakan model briaai/RMBG-1.4:
    1. Baca dan validasi gambar masukan.
    2. Resize sementara ke 1024x1024 untuk inferensi optimal model.
    3. Ekstraksi mask segmentasi.
    4. Resize mask kembali ke resolusi asli.
    5. Pasang mask sebagai alpha channel pada gambar asli RGBA.
    6. Kembalikan respons PNG transparan.
    """
    async with concurrency_semaphore:
        # Baca gambar asli
        orig_img = await read_image(file)
        orig_w, orig_h = orig_img.size

        # Konversi ke RGB untuk inferensi
        rgb_img = orig_img.convert("RGB")

        # Resize ke 1024x1024 untuk model
        img_1024 = rgb_img.resize((1024, 1024), Image.Resampling.BILINEAR)

        # Inferensi model remove-bg
        pipe = model("remove-bg")
        loop = asyncio.get_running_loop()
        output = await loop.run_in_executor(None, pipe, img_1024)

        # Ekstraksi mask hasil segmentasi
        if isinstance(output, list) and len(output) > 0:
            first = output[0]
            mask_candidate = first["mask"] if isinstance(first, dict) and "mask" in first else first
        else:
            mask_candidate = output

        # Dapatkan channel grayscale (L) dari mask
        if isinstance(mask_candidate, Image.Image):
            if mask_candidate.mode == "RGBA":
                mask = mask_candidate.split()[-1]
            elif mask_candidate.mode != "L":
                mask = mask_candidate.convert("L")
            else:
                mask = mask_candidate
        else:
            raise HTTPException(status_code=500, detail="Format output model tidak valid.")

        # Resize mask balik ke ukuran gambar asli
        resized_mask = mask.resize((orig_w, orig_h), Image.Resampling.BILINEAR)

        # Pasang mask sebagai alpha channel pada gambar asli
        rgba_result = orig_img.convert("RGBA")
        rgba_result.putalpha(resized_mask)

        return png_response(rgba_result)
