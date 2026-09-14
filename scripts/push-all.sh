#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Push-All: Commit & Push Monorepo ke GitHub dan HF Space jika apps/ai berubah
# ==============================================================================

COMMIT_MSG="${1:-update: synchronizing monorepo changes}"

echo "=========================================================="
echo "Menjalankan Push-All ImgTools Monorepo"
echo "Pesan Commit: $COMMIT_MSG"
echo "=========================================================="

# 1. Cek apakah ada berkas di apps/ai yang mengalami perubahan
AI_CHANGED=false

# Cek perubahan uncommitted pada working directory & staging
if git status --porcelain | grep -E '^[ MADRCU?]. apps/ai/' >/dev/null 2>&1; then
  AI_CHANGED=true
fi

# Cek commit lokal yang belum dipush ke origin/main jika origin/main sudah ada
if [ "$AI_CHANGED" = false ] && git rev-parse --verify origin/main >/dev/null 2>&1; then
  if git diff --name-only origin/main HEAD 2>/dev/null | grep -E '^apps/ai/' >/dev/null 2>&1; then
    AI_CHANGED=true
  fi
fi

# 2. Stage dan commit seluruh perubahan
git add .

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Melakukan commit perubahan..."
  git commit -m "$COMMIT_MSG"
else
  echo "Tidak ada perubahan baru di working directory untuk di-commit."
fi

# 3. Push ke GitHub repository (origin main)
echo "Mengirim perubahan ke GitHub origin main..."
git push origin main

# 4. Jika apps/ai berubah, deploy otomatis ke Hugging Face Space via subtree split
if [ "$AI_CHANGED" = true ]; then
  echo ""
  echo "🚀 Perubahan terdeteksi pada apps/ai! Memperbarui Hugging Face Space..."

  if ! git remote get-url space >/dev/null 2>&1; then
    echo "Peringatan: Remote git 'space' belum dikonfigurasi."
    echo "Jalankan 'bash scripts/bootstrap.sh' terlebih dahulu untuk menyetel remote space."
    exit 1
  fi

  git branch -D hf-ai 2>/dev/null || true
  git subtree split --prefix apps/ai -b hf-ai
  git push space hf-ai:main --force
  echo "✅ Hugging Face Space berhasil diperbarui!"
else
  echo ""
  echo "ℹ️  Tidak ada perubahan pada apps/ai. Melewati push ke Hugging Face Space."
fi

echo ""
echo "Selesai."
