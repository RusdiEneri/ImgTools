import os
import sys
import logging

# 1. ZeroGPU spaces import harus paling pertama jika ada
try:
    import spaces
except ImportError:
    pass

import gradio as gr
import uvicorn
from main import app as fastapi_app

# Buat UI antarmuka Gradio interaktif
with gr.Blocks(title="ImgTools AI Service") as demo:
    gr.Markdown("# 🖼️ ImgTools AI — Backend Service")
    gr.Markdown(
        """
        Layanan REST API bertenaga AI untuk aplikasi **ImgTools** (didukung oleh Hugging Face ZeroGPU).
        
        ### 🚀 Status & Endpoint REST API Aktif:
        - **Health Check**: `GET /health`
        - **Hapus Background**: `POST /api/remove-bg` (Model: RMBG-1.4)
        - **Tingkatkan Resolusi (Upscale 2x/4x)**: `POST /api/upscale` (Model: Swin2SR)
        - **Tingkatkan Kualitas (Enhance)**: `POST /api/enhance` (Model: Swin2SR)
        - **Buramkan Wajah (Face Blur)**: `POST /api/face-blur` (Model: YOLO Face)
        - **Konversi RAW ke JPG**: `POST /api/raw-to-jpg` (LibRaw)
        
        📖 **Dokumentasi Lengkap API**: Buka [/docs](/docs) untuk Swagger UI interaktif.
        """
    )

# Mount Gradio app ke FastAPI di root "/"
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
