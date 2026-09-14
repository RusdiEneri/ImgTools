"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { canvasToBlob, download } from "@/lib/image";

// 4 Template Meme Bawaan Berbasis Vektor Berkualitas Tinggi
const MEME_TEMPLATES = [
  {
    id: "drake",
    title: "Tolak vs Terima (Drake)",
    dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="300" fill="#fed7aa"/>
        <rect y="300" width="600" height="300" fill="#bbf7d0"/>
        <!-- Panel 1: Tolak -->
        <rect x="0" y="0" width="220" height="300" fill="#ea580c"/>
        <circle cx="110" cy="120" r="50" fill="#fde047"/>
        <path d="M85 110 Q110 95 135 110" stroke="#7c2d12" stroke-width="6" fill="none"/>
        <path d="M90 145 Q110 130 130 145" stroke="#7c2d12" stroke-width="5" fill="none"/>
        <line x1="60" y1="210" x2="160" y2="190" stroke="#7c2d12" stroke-width="12" stroke-linecap="round"/>
        <text x="390" y="160" font-family="Impact, sans-serif" font-size="28" font-weight="bold" fill="#7c2d12" text-anchor="middle">❌ TIDAK SUKA</text>
        <line x1="0" y1="300" x2="600" y2="300" stroke="#475569" stroke-width="4"/>
        <!-- Panel 2: Terima -->
        <rect x="0" y="300" width="220" height="300" fill="#16a34a"/>
        <circle cx="110" cy="420" r="50" fill="#fde047"/>
        <circle cx="95" cy="410" r="5" fill="#14532d"/>
        <circle cx="125" cy="410" r="5" fill="#14532d"/>
        <path d="M90 440 Q110 465 130 440" stroke="#14532d" stroke-width="5" fill="none"/>
        <circle cx="150" cy="460" r="14" fill="#fde047"/>
        <text x="390" y="460" font-family="Impact, sans-serif" font-size="28" font-weight="bold" fill="#14532d" text-anchor="middle">👉 INI BARU COCOK</text>
      </svg>
    `),
  },
  {
    id: "two-buttons",
    title: "Dua Tombol Pilihan",
    dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#1e293b"/>
        <!-- Panel Tombol -->
        <rect x="40" y="40" width="520" height="240" rx="16" fill="#334155"/>
        <ellipse cx="180" cy="160" rx="90" ry="50" fill="#ef4444"/>
        <ellipse cx="180" cy="150" rx="80" ry="40" fill="#f87171"/>
        <text x="180" y="156" font-family="Impact, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">TOMBOL A</text>
        <ellipse cx="420" cy="160" rx="90" ry="50" fill="#3b82f6"/>
        <ellipse cx="420" cy="150" rx="80" ry="40" fill="#60a5fa"/>
        <text x="420" y="156" font-family="Impact, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">TOMBOL B</text>
        <!-- Karakter Bingung -->
        <circle cx="300" cy="430" r="100" fill="#fed7aa"/>
        <circle cx="260" cy="410" r="12" fill="#0f172a"/>
        <circle cx="340" cy="410" r="12" fill="#0f172a"/>
        <path d="M250 470 Q300 450 350 470" stroke="#0f172a" stroke-width="6" fill="none"/>
        <!-- Tetesan Keringat -->
        <path d="M380 370 C380 360 395 350 395 340 C395 350 410 360 410 370 C410 380 395 385 380 370 Z" fill="#38bdf8"/>
        <text x="300" y="570" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">Kebingungan Memilih</text>
      </svg>
    `),
  },
  {
    id: "epic-handshake",
    title: "Jabat Tangan Kompak",
    dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#312e81"/>
          </linearGradient>
        </defs>
        <rect width="600" height="600" fill="url(#bg)"/>
        <!-- Tangan Kiri Berotot -->
        <path d="M0 450 L180 340 L280 330 L220 480 Z" fill="#d97706"/>
        <circle cx="200" cy="380" r="40" fill="#b45309"/>
        <!-- Tangan Kanan Berotot -->
        <path d="M600 450 L420 340 L320 330 L380 480 Z" fill="#ea580c"/>
        <circle cx="400" cy="380" r="40" fill="#c2410c"/>
        <!-- Titik Jabat Tangan Pusat -->
        <circle cx="300" cy="330" r="55" fill="#facc15" opacity="0.9"/>
        <circle cx="300" cy="330" r="25" fill="#ffffff"/>
        <text x="140" y="270" font-family="Impact, sans-serif" font-size="24" fill="#fef08a" text-anchor="middle">SISI KIRI</text>
        <text x="460" y="270" font-family="Impact, sans-serif" font-size="24" fill="#fed7aa" text-anchor="middle">SISI KANAN</text>
        <text x="300" y="550" font-family="Impact, sans-serif" font-size="22" fill="#cbd5e1" text-anchor="middle">KESEPAKATAN MUTLAK</text>
      </svg>
    `),
  },
  {
    id: "distracted",
    title: "Terdistraksi (Distracted)",
    dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#f1f5f9"/>
        <!-- Karakter 1: Pacar Cemberut (Kanan) -->
        <rect x="420" y="220" width="130" height="280" rx="20" fill="#ec4899"/>
        <circle cx="485" cy="170" r="45" fill="#fed7aa"/>
        <text x="485" y="175" font-size="28" text-anchor="middle">😠</text>
        <text x="485" y="320" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">PACAR</text>
        <!-- Karakter 2: Pria Menoleh (Tengah) -->
        <rect x="235" y="200" width="130" height="300" rx="20" fill="#3b82f6"/>
        <circle cx="300" cy="150" r="50" fill="#fed7aa"/>
        <text x="300" y="155" font-size="30" text-anchor="middle">👀</text>
        <text x="300" y="320" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">SAYA</text>
        <!-- Karakter 3: Hal Baru Menarik (Kiri) -->
        <rect x="50" y="220" width="130" height="280" rx="20" fill="#10b981"/>
        <circle cx="115" cy="170" r="45" fill="#fed7aa"/>
        <text x="115" y="175" font-size="28" text-anchor="middle">✨</text>
        <text x="115" y="320" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">HAL BARU</text>
      </svg>
    `),
  },
];

export default function MemePage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("drake");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);

  // Input Teks Meme Klasik
  const [topText, setTopText] = useState<string>("KETIKA KODING JALAN SEKALI COBA");
  const [bottomText, setBottomText] = useState<string>("TAPI NGGAK TAHU KENAPA BISA JALAN");

  // Ukuran Slider Font (relatif skala dasar)
  const [fontSize, setFontSize] = useState<number>(44);

  // Koordinat Posisi Relatif (0–1) agar konsisten saat resize dan render full-res
  const [topPos, setTopPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.12 });
  const [bottomPos, setBottomPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.88 });

  // State Dragging Mouse / Touch
  const [draggingTarget, setDraggingTarget] = useState<"top" | "bottom" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Muat gambar template awal atau unggahan kustom
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    if (customFile) {
      const url = URL.createObjectURL(customFile);
      img.onload = () => {
        setActiveImage(img);
      };
      img.src = url;
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      const template = MEME_TEMPLATES.find((t) => t.id === selectedTemplateId) || MEME_TEMPLATES[0];
      img.onload = () => {
        setActiveImage(img);
      };
      img.src = template.dataUrl;
    }
  }, [selectedTemplateId, customFile]);

  // Fungsi menggambar satu blok teks meme klasik (Impact, putih, outline hitam tebal)
  const drawMemeText = (
    ctx: CanvasRenderingContext2D,
    rawText: string,
    relX: number,
    relY: number,
    canvasW: number,
    canvasH: number,
    size: number
  ) => {
    if (!rawText.trim()) return;

    const upper = rawText.toUpperCase();
    const lines = upper.split("\n");

    // Hitung ukuran font proporsional terhadap ukuran kanvas
    const scaledSize = Math.max(14, Math.round(size * (Math.min(canvasW, canvasH) / 600)));
    const lineHeight = scaledSize * 1.15;

    ctx.font = `900 ${scaledSize}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const strokeWidth = Math.max(4, Math.round(scaledSize * 0.12));
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";

    const centerX = relX * canvasW;
    const totalHeight = lines.length * lineHeight;
    const startY = relY * canvasH - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, idx) => {
      const currentY = startY + idx * lineHeight;
      ctx.strokeText(line, centerX, currentY);
      ctx.fillText(line, centerX, currentY);
    });
  };

  // Render live ke canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = activeImage.naturalWidth || activeImage.width || 600;
    canvas.height = activeImage.naturalHeight || activeImage.height || 600;

    // Gambar background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(activeImage, 0, 0, canvas.width, canvas.height);

    // Gambar teks atas
    drawMemeText(ctx, topText, topPos.x, topPos.y, canvas.width, canvas.height, fontSize);

    // Gambar teks bawah
    drawMemeText(ctx, bottomText, bottomPos.x, bottomPos.y, canvas.width, canvas.height, fontSize);
  }, [activeImage, topText, bottomText, topPos, bottomPos, fontSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Interaksi Dragging Teks pada Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Cek kedekatan dengan teks atas
    const distTop = Math.hypot(clickX - topPos.x, clickY - topPos.y);
    // Cek kedekatan dengan teks bawah
    const distBottom = Math.hypot(clickX - bottomPos.x, clickY - bottomPos.y);

    if (distTop < 0.2) {
      setDraggingTarget("top");
    } else if (distBottom < 0.2) {
      setDraggingTarget("bottom");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingTarget) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const newY = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));

    if (draggingTarget === "top") {
      setTopPos({ x: newX, y: newY });
    } else if (draggingTarget === "bottom") {
      setBottomPos({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setDraggingTarget(null);
  };

  // Reset posisi teks ke atas dan bawah standar
  const handleResetPositions = () => {
    setTopPos({ x: 0.5, y: 0.12 });
    setBottomPos({ x: 0.5, y: 0.88 });
  };

  // Unduh Meme PNG
  const handleDownloadMeme = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await canvasToBlob(canvas, "image/png");
      download(blob, `meme-${Date.now()}.png`);
    } catch {
      alert("Gagal membuat unduhan meme.");
    }
  };

  return (
    <ToolShell
      title="Pembuat Meme Klasik"
      description="Buat meme kocak dengan tipografi Impact putih bergaris tepi hitam klasik. Teks dapat digeser langsung di atas kanvas!"
      badge="Di browser"
    >
      <div className="space-y-8">
        {/* Pilihan Sumber Gambar (Template vs Unggah Sendiri) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Pilih Gambar Meme
              </h3>
              <p className="text-xs text-slate-500">
                Gunakan template klasik bawaan atau unggah foto kreasi Anda sendiri.
              </p>
            </div>

            {customFile && (
              <button
                type="button"
                onClick={() => setCustomFile(null)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Gunakan Template Bawaan
              </button>
            )}
          </div>

          {!customFile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MEME_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`group relative overflow-hidden rounded-xl border p-2 text-left transition ${
                      selectedTemplateId === tpl.id
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-400"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tpl.dataUrl}
                        alt={tpl.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {tpl.title}
                    </p>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Dropzone
                  multiple={false}
                  accept="image/*"
                  onFiles={(files) => {
                    if (files.length > 0) {
                      setCustomFile(files[0]);
                    }
                  }}
                  title="Atau unggah gambar meme Anda sendiri"
                  subtitle="Klik atau letakkan berkas foto di sini"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 truncate max-w-sm">
                Foto Kustom: {customFile.name}
              </span>
              <button
                type="button"
                onClick={() => setCustomFile(null)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Ganti Template
              </button>
            </div>
          )}
        </div>

        {/* Workspace: Kontrol Teks & Kanvas Meme */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Panel Kontrol Teks (Kiri) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Kontrol Teks Meme
              </h3>
              <p className="text-xs text-slate-500">
                Teks otomatis berhuruf kapital, font Impact tebal dengan garis luar hitam.
              </p>
            </div>

            {/* Input Teks Atas */}
            <div className="space-y-1.5">
              <label htmlFor="top-text" className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Teks Atas (Top Text)</span>
                <span className="text-indigo-600 font-normal">Geser langsung di gambar</span>
              </label>
              <textarea
                id="top-text"
                rows={2}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="Tulis teks atas meme..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Input Teks Bawah */}
            <div className="space-y-1.5">
              <label htmlFor="bottom-text" className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Teks Bawah (Bottom Text)</span>
                <span className="text-indigo-600 font-normal">Geser langsung di gambar</span>
              </label>
              <textarea
                id="bottom-text"
                rows={2}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="Tulis teks bawah meme..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Slider Ukuran Teks */}
            <div className="space-y-1.5 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-xs text-slate-700 font-medium">
                <span>Ukuran Font Meme</span>
                <span className="text-indigo-600 font-bold">{fontSize} px</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Tombol Reset Posisi */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                Posisi: ({Math.round(topPos.x * 100)}%, {Math.round(topPos.y * 100)}%) / ({Math.round(bottomPos.x * 100)}%, {Math.round(bottomPos.y * 100)}%)
              </span>
              <button
                type="button"
                onClick={handleResetPositions}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
              >
                Reset Posisi Teks
              </button>
            </div>

            {/* Tombol Unduh */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleDownloadMeme}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Unduh Meme (PNG)
              </button>
            </div>
          </div>

          {/* Kanvas Interaktif (Kanan) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-900/5 p-4 flex flex-col items-center justify-center min-h-[480px]">
            <div className="mb-2 w-full flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                Klik & geser teks langsung di atas gambar
              </span>
              <span>Format: PNG Klasik</span>
            </div>

            <div className="relative max-h-[540px] max-w-full overflow-hidden rounded-xl shadow-md border border-slate-300/80 bg-slate-950 flex items-center justify-center select-none">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`max-h-[520px] max-w-full h-auto w-auto object-contain block ${
                  draggingTarget ? "cursor-grabbing" : "cursor-grab"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
