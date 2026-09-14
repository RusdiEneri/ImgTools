#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Pinger: Jaga Hugging Face Space / REST API AI tetap aktif (warm)
# ==============================================================================
# HF Space tier gratis akan tertidur (sleep) jika tidak menerima lalu lintas
# selama jangka waktu tertentu. Skrip ini melakukan HTTP GET ke /health tiap 10 menit.
#
# PANDUAN PENGGUNAAN:
# ------------------------------------------------------------------------------
# 1. Menjalankan secara manual:
#    export NEXT_PUBLIC_AI_URL="https://USERNAME-imgtools-ai.hf.space"
#    ./scripts/pinger.sh
#    # ATAU lewat argumen:
#    ./scripts/pinger.sh "https://USERNAME-imgtools-ai.hf.space"
#
# 2. Contoh Entri Crontab Linux / VPS (Tiap 10 Menit):
#    Buka crontab:
#      crontab -e
#    Tambahkan baris berikut:
#      */10 * * * * NEXT_PUBLIC_AI_URL="https://USERNAME-imgtools-ai.hf.space" /bin/bash /path/to/GambarKu/scripts/pinger.sh >> /var/log/imgtools-pinger.log 2>&1
#
# 3. Panduan Pengaturan di cron-job.org (Gratis, Tanpa Server Sendiri):
#    a. Buka situs https://cron-job.org dan buat akun / login.
#    b. Klik tombol "CREATE CRONJOB" di dashboard.
#    c. Isi konfigurasi berikut:
#       - Title          : ImgTools AI Keep-Alive
#       - URL            : https://USERNAME-imgtools-ai.hf.space/health
#       - Execution schedule: Every 10 minutes
#       - Request method : GET
#       - Failure notifications : Aktifkan jika ingin dapat notifikasi email saat API down
#    d. Klik "SAVE". HF Space Anda kini akan selalu aktif dan siap melayani permintaan.
# ==============================================================================

# Cek opsi bantuan
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '4,33p' "$0" | sed 's/^# //' | sed 's/^#//'
  exit 0
fi

# Tentukan Target URL
TARGET_URL="${1:-${NEXT_PUBLIC_AI_URL:-}}"

# Jika belum diatur di env, coba baca dari apps/web/.env.local jika ada
if [ -z "$TARGET_URL" ]; then
  ENV_FILE="$(dirname "$0")/../apps/web/.env.local"
  if [ -f "$ENV_FILE" ]; then
    VAL=$(grep -E '^NEXT_PUBLIC_AI_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
    if [ -n "$VAL" ]; then
      TARGET_URL="$VAL"
    fi
  fi
fi

if [ -z "$TARGET_URL" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] URL backend AI belum ditentukan!"
  echo "Silakan export variabel NEXT_PUBLIC_AI_URL atau kirimkan sebagai argumen."
  echo "Contoh: $0 https://username-imgtools-ai.hf.space"
  exit 1
fi

# Pastikan URL tidak diakhiri tanda slash /
TARGET_URL="${TARGET_URL%/}"
HEALTH_ENDPOINT="${TARGET_URL}/health"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

echo "[$TIMESTAMP] Mengirim ping GET ke: $HEALTH_ENDPOINT"

# Kirim HTTP GET dengan batas waktu 15 detik
RESPONSE=$(curl -sS -f --max-time 15 "$HEALTH_ENDPOINT" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$TIMESTAMP] [SUCCESS] API Sehat: $RESPONSE"
  exit 0
else
  echo "[$TIMESTAMP] [FAILED] Gagal menghubungi endpoint. Pesan: $RESPONSE (Kode exit: $EXIT_CODE)"
  exit $EXIT_CODE
fi
