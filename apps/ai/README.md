# GambarKu - AI Backend Service

Layanan backend AI untuk aplikasi GambarKu berbasis FastAPI.

- **Framework**: FastAPI (Python 3.10+)
- **Target Deploy**: Hugging Face Spaces (Docker)
- **Port**: `7860`

## Menjalankan Secara Lokal

```bash
# Buat virtual environment
python -m venv .venv
source .venv/bin/activate # atau .venv\Scripts\activate di Windows

# Install dependensi
pip install -r requirements.txt

# Jalankan server
uvicorn main:app --reload --port 7860
```
