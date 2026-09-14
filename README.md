# GambarKu Monorepo

Repositori monorepo untuk aplikasi **GambarKu**, platform pengolahan gambar bertenaga AI.

## Struktur Repositori

```text
GambarKu/
├─ apps/
│  ├─ web/     # Frontend (Next.js 14 App Router, TypeScript, Tailwind CSS) → Deploy ke Vercel
│  └─ ai/      # Backend AI (FastAPI, Docker) → Deploy ke Hugging Face Space
├─ .github/    # GitHub Actions & CI/CD workflows
├─ scripts/    # Utility scripts monorepo
├─ .gitignore
└─ README.md
```

## Gambaran Aplikasi & Deployment

- **Frontend (`apps/web`)**:
  - Framework: Next.js 14 (App Router, TypeScript, Tailwind CSS, ESLint)
  - Target Deployment: **Vercel**

- **Backend AI (`apps/ai`)**:
  - Framework: FastAPI (Python)
  - Containerization: Docker (Port 7860)
  - Target Deployment: **Hugging Face Space (Docker)**

## Panduan Memulai Cepat

### Frontend (`apps/web`)

```bash
cd apps/web
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

### Backend AI (`apps/ai`)

```bash
cd apps/ai
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 7860
```

API docs tersedia di [http://localhost:7860/docs](http://localhost:7860/docs).
