import os
import io
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, Literal, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from PIL import Image, ImageOps, ImageFilter

# Konfigurasi Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("imgtools-ai")

# Konfigurasi Environment Variables
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]

MAX_PIXELS = int(os.getenv("MAX_PIXELS", 24_000_000))  # Default 24 Megapixels
MAX_BYTES = int(os.getenv("MAX_BYTES", 25 * 1024 * 1024))  # Default 25 MB
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", 2))  # Default 2 concurrent requests
REMBG_SPACE_URL = os.getenv("REMBG_SPACE_URL", "https://ilhamdev-rembg.hf.space").rstrip("/")

# Semaphore untuk membatasi eksekusi serentak pada CPU/RAM terbatas
concurrency_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

# Dukungan ZeroGPU jika berjalan pada Hugging Face Spaces dengan SDK Gradio
try:
    import spaces
    def gpu_decorator(fn):
        return spaces.GPU(fn)
except Exception:
    def gpu_decorator(fn):
        return fn

# Cache penyimpanan model ML (Lazy-loaded)
_models: Dict[str, Any] = {}


def model(name: str):
    """
    Lazy-load dan cache model ML dalam dictionary.
    Mendukung:
    - 'remove-bg' -> Hugging Face Space ilhamdev/rembg (ZeroGPU)
    - 'upscale'   -> caidas/swin2SR-realworld-sr-x4-64-bsrl (device=0 jika CUDA/ZeroGPU, -1 jika CPU)
    - 'enhance'   -> caidas/swin2SR-classical-sr-x2-64 (device=0 jika CUDA/ZeroGPU, -1 jika CPU)
    - 'face'      -> ultralytics YOLO("Bingsu/yolov8n-face")
    """
    if name not in _models:
        import torch
        device = 0 if torch.cuda.is_available() else -1
        logger.info(f"Memuat model '{name}' ke memori (device={device})...")
        if name == "remove-bg":
            _models[name] = REMBG_SPACE_URL
            logger.info(f"Model 'remove-bg' dikonfigurasi ke Hugging Face Space: {REMBG_SPACE_URL}")
        elif name == "upscale":
            # Gunakan Swin2SR API langsung (bukan pipeline yang sering error dengan model ini)
            from transformers import Swin2SRForImageSuperResolution, Swin2SRImageProcessor
            import torch

            cuda_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            processor = Swin2SRImageProcessor.from_pretrained("caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr")
            sr_model  = Swin2SRForImageSuperResolution.from_pretrained("caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr")
            sr_model  = sr_model.to(cuda_device).eval()
            _models[name] = (sr_model, processor, cuda_device)
            logger.info("Model 'upscale' (swin2SR-realworld-sr-x4-64-bsrgan-psnr) berhasil dimuat.")
        elif name == "enhance":
            from transformers import Swin2SRForImageSuperResolution, Swin2SRImageProcessor
            import torch

            cuda_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            processor = Swin2SRImageProcessor.from_pretrained("caidas/swin2SR-classical-sr-x2-64")
            sr_model  = Swin2SRForImageSuperResolution.from_pretrained("caidas/swin2SR-classical-sr-x2-64")
            sr_model  = sr_model.to(cuda_device).eval()
            _models[name] = (sr_model, processor, cuda_device)
            logger.info("Model 'enhance' (swin2SR-classical-sr-x2-64) berhasil dimuat.")
        elif name == "face":
            from ultralytics import YOLO

            yolo_model = YOLO("Bingsu/yolov8n-face")
            if torch.cuda.is_available():
                yolo_model.to("cuda")
            _models[name] = yolo_model
            logger.info("Model 'face' (Bingsu/yolov8n-face) berhasil dimuat.")
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


def jpeg_response(image: Image.Image, quality: int = 92) -> StreamingResponse:
    """
    Helper untuk mengembalikan objek PIL Image sebagai StreamingResponse bertipe image/jpeg.
    """
    buf = io.BytesIO()
    rgb_img = image.convert("RGB") if image.mode != "RGB" else image
    rgb_img.save(buf, format="JPEG", quality=quality, optimize=True)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/jpeg")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Event startup & shutdown lifecycle:
    Melakukan warm-up model 'remove-bg' saat server dinyalakan.
    Jika gagal karena keterbatasan memori saat boot, log warning saja.
    """
    logger.info("Memulai layanan ImgTools AI...")
    try:
        logger.info(f"Mengonfigurasi model 'remove-bg' (Space: {REMBG_SPACE_URL})...")
        model("remove-bg")
    except Exception as e:
        logger.warning(f"Inisialisasi model 'remove-bg' ditangguhkan: {e}")
    yield
    logger.info("Mematikan layanan ImgTools AI...")
    _models.clear()


# Inisialisasi Aplikasi FastAPI
app = FastAPI(
    title="ImgTools AI",
    description="REST API AI untuk manipulasi, segmentasi, peningkatan kualitas, dan deteksi wajah pada Hugging Face Spaces",
    version="1.0.0",
    lifespan=lifespan,
)

# Konfigurasi CORS
is_wildcard = "*" in ALLOWED_ORIGINS or len(ALLOWED_ORIGINS) == 0 or "http://localhost:3000" in ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else ALLOWED_ORIGINS,
    allow_credentials=False if is_wildcard else True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handler global untuk menangani unhandled exception secara konsisten (HTTP 500).
    """
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception(f"Unhandled error pada endpoint {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Terjadi kesalahan internal pada server: {str(exc)[:150]}"},
    )


@app.get("/health")
def health_check():
    """
    Health check endpoint untuk Docker & orchestrator.
    """
    return {"status": "ok"}


@app.get("/")
def root(request: Request):
    """
    Root info endpoint menampilkan status dan route yang tersedia.
    Mengembalikan tampilan HTML yang informatif jika diakses lewat browser.
    """
    accept = request.headers.get("accept", "")
    info = {
        "service": "ImgTools AI",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "remove_bg": "/api/remove-bg",
            "upscale": "/api/upscale",
            "enhance": "/api/enhance",
            "face_blur": "/api/face-blur",
            "raw_to_jpg": "/api/raw-to-jpg",
            "docs": "/docs",
        },
    }
    if "text/html" not in accept:
        return JSONResponse(info)

    html_content = """<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ImgTools AI Service</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 40px 20px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); color: #34d399; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
        .badge::before { content: ""; width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }
        h1 { margin-top: 16px; margin-bottom: 8px; font-size: 26px; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
        ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        li { background: #0f172a; border: 1px solid #1e293b; padding: 12px 16px; border-radius: 10px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
        code { background: #334155; color: #a5b4fc; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; }
        .btn { display: inline-block; margin-top: 24px; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; transition: 0.2s; }
        .btn:hover { background: #4338ca; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Sistem Aktif (Online)</div>
        <h1>🖼️ ImgTools AI — Backend Service</h1>
        <p>Layanan REST API bertenaga AI untuk aplikasi <strong>ImgTools</strong> pada Hugging Face Spaces (CPU Basic).</p>
        
        <ul>
            <li><span>Pemeriksaan Kesehatan (Health Check)</span> <code>GET /health</code></li>
            <li><span>Hapus Latar Belakang (RMBG-1.4)</span> <code>POST /api/remove-bg</code></li>
            <li><span>Tingkatkan Resolusi (Swin2SR 2x/4x)</span> <code>POST /api/upscale</code></li>
            <li><span>Tingkatkan Ketajaman (Swin2SR)</span> <code>POST /api/enhance</code></li>
            <li><span>Buramkan Wajah (YOLO Face)</span> <code>POST /api/face-blur</code></li>
            <li><span>Konversi RAW ke JPG (LibRaw)</span> <code>POST /api/raw-to-jpg</code></li>
        </ul>

        <a href="/docs" class="btn">📖 Buka Dokumentasi Interaktif (/docs) &rarr;</a>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@app.post("/api/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    model_name: str = Form("birefnet-portrait"),
    alpha_matting: bool = Form(False),
):
    """
    Hapus latar belakang foto menggunakan Hugging Face Space ilhamdev/rembg (ZeroGPU BiRefNet):
    1. Baca dan validasi berkas gambar masukan.
    2. Encode ke Base64 data URL.
    3. Panggil API Space https://ilhamdev-rembg.hf.space/gradio_api/call/remove_bg.
    4. Kembalikan respons PNG transparan.
    """
    async with concurrency_semaphore:
        try:
            import base64
            import urllib.request

            orig_img = await read_image(file)
            buffered = io.BytesIO()
            orig_img.save(buffered, format="PNG")
            b64_input = base64.b64encode(buffered.getvalue()).decode("utf-8")
            data_url = f"data:image/png;base64,{b64_input}"

            space_url = REMBG_SPACE_URL
            post_payload = json.dumps({
                "data": [data_url, model_name, alpha_matting]
            }).encode("utf-8")

            def _call_space():
                req = urllib.request.Request(
                    f"{space_url}/gradio_api/call/remove_bg",
                    data=post_payload,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=120) as resp:
                    post_res = json.loads(resp.read().decode("utf-8"))

                event_id = post_res.get("event_id")
                if not event_id:
                    raise ValueError("Gagal mendapatkan event_id dari Hugging Face Space.")

                stream_req = urllib.request.Request(f"{space_url}/gradio_api/call/remove_bg/{event_id}")
                with urllib.request.urlopen(stream_req, timeout=120) as stream_resp:
                    for line in stream_resp:
                        decoded_line = line.decode("utf-8").strip()
                        if decoded_line.startswith("event: error"):
                            raise RuntimeError("Hugging Face Space mengembalikan event error.")
                        if decoded_line.startswith("data:"):
                            raw_data = decoded_line[5:].strip()
                            if raw_data and raw_data != "null":
                                parsed = json.loads(raw_data)
                                if isinstance(parsed, list) and len(parsed) > 0 and parsed[0]:
                                    return parsed[0]
                raise ValueError("Tidak ada output gambar dari Hugging Face Space.")

            loop = asyncio.get_running_loop()
            res_data_url = await loop.run_in_executor(None, _call_space)

            if "," in res_data_url:
                res_data_url = res_data_url.split(",", 1)[1]
            out_bytes = base64.b64decode(res_data_url)
            out_buf = io.BytesIO(out_bytes)
            return StreamingResponse(out_buf, media_type="image/png")
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error pada /api/remove-bg: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal menghapus latar belakang: {str(e)[:150]}")


@app.post("/api/upscale")
async def upscale(
    request: Request,
    file: UploadFile = File(...),
    scale: int = Form(2),
    max_side: int = Form(2048),
):
    """
    Tingkatkan resolusi gambar (Super-Resolution):
    - validasi scale in {2, 4} (HTTP 422 jika salah)
    - thumbnail ke max_side
    - jalankan pipeline swin2SR
    - kembalikan PNG
    """
    # Dukung override via query params jika ada
    if "scale" in request.query_params:
        try:
            scale = int(request.query_params["scale"])
        except ValueError:
            raise HTTPException(status_code=422, detail="scale harus berupa integer.")
    if "max_side" in request.query_params:
        try:
            max_side = int(request.query_params["max_side"])
        except ValueError:
            raise HTTPException(status_code=422, detail="max_side harus berupa integer.")

    if scale not in (2, 4):
        raise HTTPException(status_code=422, detail="scale harus bernilai 2 atau 4.")

    async with concurrency_semaphore:
        try:
            img = await read_image(file)

            # Thumbnail ke max_side (mempertahankan rasio aspek)
            img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            rgb_img = img.convert("RGB")

            # Jalankan Swin2SR upscale langsung (bukan pipeline)
            import torch
            sr_model, processor, cuda_device = model("upscale")

            def _run_upscale(img_pil):
                inputs = processor(img_pil, return_tensors="pt").pixel_values.to(cuda_device)
                with torch.no_grad():
                    outputs = sr_model(pixel_values=inputs)
                sr_tensor = outputs.reconstruction.squeeze().cpu().clamp(0, 1)
                # sr_tensor shape: [C, H, W]
                import numpy as np
                arr = (sr_tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
                return Image.fromarray(arr)

            loop = asyncio.get_running_loop()
            out_img = await loop.run_in_executor(None, _run_upscale, rgb_img)

            if not isinstance(out_img, Image.Image):
                raise ValueError("Output model tidak menghasilkan PIL Image yang valid.")

            # Model 4x upscale; jika user minta 2x, resize proporsional
            if scale == 2:
                target_w = max(1, rgb_img.width * 2)
                target_h = max(1, rgb_img.height * 2)
                out_img = out_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

            return png_response(out_img)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error pada /api/upscale: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal melakukan upscale gambar: {str(e)[:150]}")


@app.post("/api/enhance")
async def enhance(
    request: Request,
    file: UploadFile = File(...),
    strength: float = Form(1.0),
):
    """
    Tingkatkan ketajaman dan detail gambar:
    - thumbnail ke 1600
    - jalankan model enhance (swin2SR-classical-sr-x2-64)
    - terapkan UnsharpMask(radius=1.5, percent=int(60*strength))
    - kembalikan PNG
    """
    if "strength" in request.query_params:
        try:
            strength = float(request.query_params["strength"])
        except ValueError:
            raise HTTPException(status_code=422, detail="strength harus berupa float.")

    async with concurrency_semaphore:
        try:
            img = await read_image(file)

            # Thumbnail ke 800px (hindari CUDA OOM)
            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
            rgb_img = img.convert("RGB")

            # Jalankan Swin2SR enhance langsung (bukan pipeline)
            import torch
            sr_model, processor, cuda_device = model("enhance")

            def _run_enhance(img_pil):
                inputs = processor(img_pil, return_tensors="pt").pixel_values.to(cuda_device)
                with torch.no_grad():
                    outputs = sr_model(pixel_values=inputs)
                sr_tensor = outputs.reconstruction.squeeze().cpu().clamp(0, 1)
                import numpy as np
                arr = (sr_tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
                return Image.fromarray(arr)

            loop = asyncio.get_running_loop()
            out_img = await loop.run_in_executor(None, _run_enhance, rgb_img)

            if not isinstance(out_img, Image.Image):
                raise ValueError("Output model tidak menghasilkan PIL Image yang valid.")

            # Terapkan filter penajaman UnsharpMask
            percent = max(0, int(60 * strength))
            enhanced = out_img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=percent))

            return png_response(enhanced)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error pada /api/enhance: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal meningkatkan kualitas gambar: {str(e)[:150]}")


@app.post("/api/face-blur")
async def face_blur(
    request: Request,
    file: UploadFile = File(...),
    blur: int = Form(25),
    mode: Literal["gaussian", "pixelate"] = Form("gaussian"),
    conf: float = Form(0.35),
    boxes: Optional[str] = Form(None),
):
    """
    Deteksi wajah & buramkan area sensitif:
    - boxes: JSON string list [x, y, w, h] untuk area manual tambahan.
    - deteksi wajah via YOLO (conf), digabung dengan boxes manual.
    - tiap region: Gaussian blur (radius=blur) ATAU pixelate (resize kecil lalu NEAREST balik).
    - clamp koordinat ke batas gambar; lewati region < 3px.
    - kembalikan PNG.
    """
    if "blur" in request.query_params:
        try:
            blur = int(request.query_params["blur"])
        except ValueError:
            raise HTTPException(status_code=422, detail="blur harus berupa integer.")
    if "mode" in request.query_params:
        m = request.query_params["mode"]
        if m in ("gaussian", "pixelate"):
            mode = m
        else:
            raise HTTPException(status_code=422, detail="mode harus 'gaussian' atau 'pixelate'.")
    if "conf" in request.query_params:
        try:
            conf = float(request.query_params["conf"])
        except ValueError:
            raise HTTPException(status_code=422, detail="conf harus berupa float.")
    if "boxes" in request.query_params:
        boxes = request.query_params["boxes"]

    if mode not in ("gaussian", "pixelate"):
        raise HTTPException(status_code=422, detail="mode harus 'gaussian' atau 'pixelate'.")

    # Parsing kotak manual jika disediakan
    all_boxes: List[List[int]] = []
    if boxes:
        try:
            parsed = json.loads(boxes)
            if isinstance(parsed, list):
                if len(parsed) > 0 and isinstance(parsed[0], (int, float)) and len(parsed) == 4:
                    all_boxes.append([int(v) for v in parsed])
                else:
                    for item in parsed:
                        if isinstance(item, (list, tuple)) and len(item) == 4:
                            all_boxes.append([int(item[0]), int(item[1]), int(item[2]), int(item[3])])
        except Exception as e:
            logger.warning(f"Gagal parse boxes JSON: {e}")
            raise HTTPException(status_code=422, detail="Format JSON parameter boxes tidak valid.")

    async with concurrency_semaphore:
        try:
            orig_img = await read_image(file)
            img = orig_img.copy()
            w_img, h_img = img.size

            # Deteksi wajah menggunakan model YOLO
            try:
                yolo = model("face")
                rgb_img = img.convert("RGB")
                loop = asyncio.get_running_loop()
                yolo_results = await loop.run_in_executor(
                    None, lambda: yolo.predict(source=rgb_img, conf=conf, verbose=False)
                )

                if yolo_results and len(yolo_results) > 0:
                    res_boxes = yolo_results[0].boxes
                    if res_boxes is not None and hasattr(res_boxes, "xyxy"):
                        xyxy_arr = res_boxes.xyxy.cpu().numpy()
                        for box in xyxy_arr:
                            x1, y1, x2, y2 = box
                            bx = int(x1)
                            by = int(y1)
                            bw = int(x2 - x1)
                            bh = int(y2 - y1)
                            all_boxes.append([bx, by, bw, bh])
            except Exception as e:
                logger.warning(f"Deteksi wajah YOLO mengalami kendala: {e}")

            # Proses setiap area target
            for b in all_boxes:
                bx, by, bw, bh = b
                # Clamp koordinat ke batas dimensi gambar
                x1 = max(0, min(bx, w_img))
                y1 = max(0, min(by, h_img))
                x2 = max(0, min(bx + bw, w_img))
                y2 = max(0, min(by + bh, h_img))

                reg_w = x2 - x1
                reg_h = y2 - y1

                # Lewati region < 3px
                if reg_w < 3 or reg_h < 3:
                    continue

                region = img.crop((x1, y1, x2, y2))

                if mode == "gaussian":
                    blurred = region.filter(ImageFilter.GaussianBlur(radius=max(1, blur)))
                else:  # pixelate
                    pixel_size = max(2, blur)
                    small_w = max(1, reg_w // pixel_size)
                    small_h = max(1, reg_h // pixel_size)
                    blurred = region.resize((small_w, small_h), Image.Resampling.NEAREST).resize(
                        (reg_w, reg_h), Image.Resampling.NEAREST
                    )

                img.paste(blurred, (x1, y1))

            return png_response(img)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error pada /api/face-blur: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal memproses face-blur: {str(e)[:150]}")


@app.post("/api/raw-to-jpg")
async def raw_to_jpg(file: UploadFile = File(...)):
    """
    Konversi gambar kamera RAW ke JPEG:
    - rawpy.imread(BytesIO) -> postprocess() -> simpan JPEG quality 92
    - Mengembalikan error 422 jika berkas RAW tidak valid atau gagal diproses
    """
    async with concurrency_semaphore:
        try:
            contents = await file.read()
            if len(contents) > MAX_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"Ukuran berkas ({len(contents)} byte) melebihi batas maksimal {MAX_BYTES} byte.",
                )

            try:
                import rawpy

                with rawpy.imread(io.BytesIO(contents)) as raw:
                    rgb = raw.postprocess()
                img = Image.fromarray(rgb)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Gagal memproses RAW image: {e}")
                raise HTTPException(
                    status_code=422,
                    detail="Gagal memproses berkas RAW. Pastikan format berkas RAW didukung dan tidak korup.",
                )

            return jpeg_response(img, quality=92)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error pada /api/raw-to-jpg: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal mengonversi RAW ke JPG: {str(e)[:150]}")
