#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Bootstrap: Inisialisasi dan Deploy Monorepo ke GitHub & Hugging Face
# ==============================================================================

REPO="imgtools"
SPACE="imgtools-ai"

# 1. Validasi Variabel Lingkungan Wajib
if [ -z "${HF_TOKEN:-}" ]; then
  echo "Error: Variabel lingkungan HF_TOKEN wajib di-export terlebih dahulu."
  echo "Contoh: export HF_TOKEN=\"hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\""
  exit 1
fi

GH_USER="${GH_USER:-}"
if [ -z "$GH_USER" ]; then
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    GH_USER=$(gh api user -q .login 2>/dev/null || echo "")
  fi
fi

if [ -z "$GH_USER" ]; then
  echo "Error: Variabel lingkungan GH_USER belum diatur."
  echo "Contoh: export GH_USER=\"username-kamu\""
  exit 1
fi

HF_USER="${HF_USER:-}"
if [ -z "$HF_USER" ]; then
  echo "Error: Variabel lingkungan HF_USER belum diatur."
  echo "Contoh: export HF_USER=\"username-hf-kamu\""
  exit 1
fi

echo "=========================================================="
echo "Memulai Bootstrap Deployment Monorepo ImgTools"
echo "  GitHub User : $GH_USER"
echo "  GitHub Repo : $REPO"
echo "  HF User     : $HF_USER"
echo "  HF Space    : $SPACE"
echo "=========================================================="

# Pastikan repositori git lokal sudah terinisialisasi
if [ ! -d ".git" ]; then
  echo "Inisialisasi git repository..."
  git init -b main
fi

# Simpan commit lokal jika ada perubahan yang belum di-commit
if [ -n "$(git status --porcelain)" ]; then
  echo "Melakukan commit perubahan awal..."
  git add .
  git commit -m "chore: initial commit before bootstrap deploy" || true
fi

# Pastikan branch saat ini bernama main
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ "$CURRENT_BRANCH" != "main" ]; then
  git branch -M main
fi

# ------------------------------------------------------------------------------
# Langkah a: Buat repositori GitHub dan push monorepo
# ------------------------------------------------------------------------------
echo ""
echo "-> [1/4] Menghubungkan ke GitHub ($GH_USER/$REPO)..."
GH_SUCCESS=false

if command -v gh >/dev/null 2>&1; then
  echo "Mencoba membuat repo via GitHub CLI (gh)..."
  if gh repo create "$GH_USER/$REPO" --private --source=. --remote=origin --push; then
    GH_SUCCESS=true
  else
    echo "Info: gh repo create tidak dapat menyelesaikan otomatis (mungkin repo sudah ada)."
  fi
fi

if [ "$GH_SUCCESS" = false ]; then
  echo "Menyiapkan git remote origin secara manual..."
  ORIGIN_URL="https://github.com/$GH_USER/$REPO.git"
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$ORIGIN_URL"
  else
    git remote add origin "$ORIGIN_URL"
  fi
  echo "Push ke GitHub origin main..."
  git push -u origin main || echo "Peringatan: Gagal push ke origin. Pastikan Anda memiliki akses ke repo $GH_USER/$REPO."
fi

# ------------------------------------------------------------------------------
# Langkah b: Buat Hugging Face Space (SDK Docker)
# ------------------------------------------------------------------------------
echo ""
echo "-> [2/4] Menyiapkan Hugging Face Space ($SPACE)..."
HF_CLI_SUCCESS=false

if command -v hf >/dev/null 2>&1; then
  echo "Mencoba membuat space via HF CLI..."
  if hf repo create "$SPACE" --repo-type space --space_sdk docker --public; then
    HF_CLI_SUCCESS=true
  fi
fi

if [ "$HF_CLI_SUCCESS" = false ]; then
  echo "=================================================================="
  echo "Perhatian: CLI 'hf' belum terpasang atau gagal membuat Space."
  echo "Jika Space '$SPACE' belum dibuat, silakan buat manual di browser:"
  echo "  1. Buka: https://huggingface.co/new-space"
  echo "  2. Space Name : $SPACE"
  echo "  3. Space SDK  : Docker (Blank)"
  echo "  4. Visibility : Public"
  echo "=================================================================="
fi

# ------------------------------------------------------------------------------
# Langkah c: Tambahkan / perbarui remote "space"
# ------------------------------------------------------------------------------
echo ""
echo "-> [3/4] Mengonfigurasi remote git 'space'..."
SPACE_URL="https://${HF_USER}:${HF_TOKEN}@hf.co/spaces/${HF_USER}/${SPACE}"

if git remote get-url space >/dev/null 2>&1; then
  git remote set-url space "$SPACE_URL"
else
  git remote add space "$SPACE_URL"
fi
echo "Remote 'space' berhasil dikonfigurasi."

# ------------------------------------------------------------------------------
# Langkah d: Subtree split apps/ai dan push ke remote space
# ------------------------------------------------------------------------------
echo ""
echo "-> [4/4] Subtree split apps/ai dan push ke Hugging Face Space..."
git branch -D hf-ai 2>/dev/null || true
git subtree split --prefix apps/ai -b hf-ai
git push space hf-ai:main --force

# ------------------------------------------------------------------------------
# Langkah e: Tampilkan URL
# ------------------------------------------------------------------------------
echo ""
echo "=========================================================="
echo "✅ Bootstrap Berhasil Diselesaikan!"
echo ""
echo "🔗 GitHub Repository : https://github.com/$GH_USER/$REPO"
echo "🤗 Hugging Face Space: https://huggingface.co/spaces/$HF_USER/$SPACE"
echo "🌐 Backend API URL   : https://$HF_USER-$SPACE.hf.space"
echo "=========================================================="
