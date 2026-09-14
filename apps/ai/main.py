from fastapi import FastAPI

app = FastAPI(
    title="GambarKu AI Service",
    description="Backend AI service for GambarKu, target deployment: Hugging Face Space Docker",
    version="0.1.0"
)

@app.get("/")
def read_root():
    return {"status": "ok", "service": "GambarKu AI API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
