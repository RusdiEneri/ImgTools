# ImgTools (ImgTools) — Monorepo

Platform utilitas pemrosesan dan pengolahan gambar lengkap bertenaga AI dengan arsitektur monorepo.

---

## Struktur Repositori

```text
ImgTools/
├─ apps/
│  ├─ web/             # Frontend: Next.js 14 (App Router, TypeScript, Tailwind CSS)
│  └─ ai/              # Backend AI: FastAPI (Python 3.11, Docker, RMBG, Swin2SR, YOLOv8)
├─ .github/
│  └─ workflows/
│     └─ deploy-hf.yml # GitHub Actions: Otomatisasi deploy subtree apps/ai ke HF Space
├─ scripts/
│  ├─ bootstrap.sh     # Inisialisasi awal repo GitHub & Hugging Face Space
│  └─ push-all.sh      # Commit & push monorepo + subtree push cerdas ke HF Space
├─ .gitignore
└─ README.md
```

---

## Menjalankan Secara Lokal

### 1. Frontend Web (`apps/web`)

```bash
cd apps/web
npm install

# Buat salinan environment variable jika ingin menghubungkan ke backend AI lokal
cp .env.local.example .env.local

# Jalankan server pengembangan
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada peramban Anda.

### 2. Backend AI (`apps/ai`)

```bash
cd apps/ai
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload --port 7860
```
Dokumentasi interaktif OpenAPI / Swagger dapat diakses di [http://localhost:7860/docs](http://localhost:7860/docs).

---

## Panduan Deployment

### 1. Urutan Bootstrap Awal (`scripts/bootstrap.sh`)

Skrip ini akan otomatis membuat atau menghubungkan repositori GitHub pribadi, menyiapkan Space di Hugging Face (SDK Docker), mengonfigurasi remote `space`, dan melakukan `git subtree split` pertama kali.

Pastikan variabel lingkungan berikut telah di-export di terminal Bash:

```bash
# Token Hugging Face dengan izin Write (buat di https://huggingface.co/settings/tokens)
export HF_TOKEN="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Username GitHub dan Hugging Face Anda
export GH_USER="username-github"
export HF_USER="username-huggingface"

# Jalankan skrip bootstrap
bash scripts/bootstrap.sh
```

---

### 2. Pengaturan GitHub Repository Secrets

Agar GitHub Actions (`.github/workflows/deploy-hf.yml`) dapat melakukan auto-deploy ke Hugging Face setiap kali folder `apps/ai/` diperbarui di branch `main`:

1. Buka repositori GitHub Anda: `https://github.com/<GH_USER>/imgtools`.
2. Masuk ke **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
3. Tambahkan 3 secret berikut:
   - `HF_TOKEN`: Token Write dari Hugging Face (`hf_...`).
   - `HF_USER`: Username akun Hugging Face Anda.
   - `HF_SPACE`: Nama space Anda (default: `imgtools-ai`).

---

### 3. Deploy Frontend Web ke Vercel

1. Buka dashboard [Vercel](https://vercel.com) dan pilih **Add New...** > **Project**.
2. Hubungkan akun GitHub Anda dan pilih repositori `imgtools`.
3. Pada bagian **Configure Project**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Klik **Edit** dan pilih `apps/web`. *(Sangat penting agar Vercel membangun aplikasi frontend!)*
4. Pada bagian **Environment Variables**:
   - Tambahkan key: `NEXT_PUBLIC_AI_URL`
   - Value: `https://<HF_USER>-<HF_SPACE>.hf.space` (contoh: `https://johndoe-imgtools-ai.hf.space`).
5. Klik tombol **Deploy**.

---

### 4. Rutinitas Sinkronisasi Perubahan (`scripts/push-all.sh`)

Gunakan skrip `scripts/push-all.sh` untuk melakukan commit dan push rutin:

```bash
bash scripts/push-all.sh "feat: menambahkan fitur baru"
```

- Skrip ini akan melakukan stage dan commit seluruh berkas monorepo, lalu melakukan `git push origin main`.
- **Cerdas**: Hanya jika terdapat perubahan pada folder `apps/ai/`, skrip akan otomatis memisahkan subtree (`git subtree split`) dan melakukan force push ke remote `space` di Hugging Face.
