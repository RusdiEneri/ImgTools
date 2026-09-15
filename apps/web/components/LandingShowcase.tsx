"use client";

import React, { useState, useEffect } from "react";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";

/** Gambar "Sebelum": pemandangan gunung buram, noisy, desaturasi */
function drawBefore(canvas: HTMLCanvasElement) {
  const W = 800, H = 500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Langit abu-abu desaturasi
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#aab4bc");
  sky.addColorStop(1, "#c8d4da");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.55);

  // Gunung (blur)
  ctx.save();
  ctx.filter = "blur(6px)";
  ctx.fillStyle = "#7a8f9a";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.58);
  ctx.lineTo(120, H * 0.36);
  ctx.lineTo(240, H * 0.50);
  ctx.lineTo(390, H * 0.30);
  ctx.lineTo(520, H * 0.42);
  ctx.lineTo(650, H * 0.34);
  ctx.lineTo(W, H * 0.46);
  ctx.lineTo(W, H * 0.58);
  ctx.closePath();
  ctx.fill();

  // Tanah bawah
  const ground = ctx.createLinearGradient(0, H * 0.55, 0, H);
  ground.addColorStop(0, "#7a8f9a");
  ground.addColorStop(1, "#5c6e79");
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // Pohon-pohon buram
  ctx.fillStyle = "#4e6270";
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 90;
    const h = 90 + (i % 3) * 20;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.56);
    ctx.lineTo(x - 28, H * 0.56 + h);
    ctx.lineTo(x + 28, H * 0.56 + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 7, H * 0.56 + h, 14, 30);
  }
  ctx.filter = "none";
  ctx.restore();

  // Noise/grain overlay
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 60;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
  ctx.putImageData(id, 0, 0);

  // JPEG-like compression block artifacts
  ctx.globalAlpha = 0.06;
  for (let bx = 0; bx < W; bx += 8) {
    for (let by = 0; by < H; by += 8) {
      if ((bx + by) % 16 === 0) {
        ctx.fillStyle = "#000";
        ctx.fillRect(bx, by, 8, 8);
      }
    }
  }
  ctx.globalAlpha = 1;

  // Label bar bawah
  ctx.fillStyle = "rgba(30,41,59,0.78)";
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u{1F4F7}  Resolusi Rendah  \u2022  Buram  \u2022  Noise", W / 2, H - 20);
}

/** Gambar "Sesudah": pemandangan tajam, vivid, 4K */
function drawAfter(canvas: HTMLCanvasElement) {
  const W = 800, H = 500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Langit cerah
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.56);
  sky.addColorStop(0, "#0f172a");
  sky.addColorStop(0.4, "#1d4ed8");
  sky.addColorStop(1, "#60a5fa");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.56);

  // Matahari + cahaya
  const sun = ctx.createRadialGradient(670, 90, 0, 670, 90, 100);
  sun.addColorStop(0, "#fef9c3");
  sun.addColorStop(0.3, "#fde047");
  sun.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(570, 0, 200, 200);

  // Awan
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  [[160, 80, 60], [220, 70, 45], [280, 80, 50], [100, 90, 35]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gunung tajam
  ctx.fillStyle = "#15803d";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.60);
  ctx.lineTo(120, H * 0.37);
  ctx.lineTo(240, H * 0.51);
  ctx.lineTo(390, H * 0.30);
  ctx.lineTo(520, H * 0.43);
  ctx.lineTo(650, H * 0.34);
  ctx.lineTo(W, H * 0.46);
  ctx.lineTo(W, H * 0.60);
  ctx.closePath();
  ctx.fill();

  // Salju puncak gunung
  ctx.fillStyle = "#f0f9ff";
  [[390, 0.30], [650, 0.34]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px as number, H * (py as number));
    ctx.lineTo((px as number) - 38, H * (py as number) + 50);
    ctx.lineTo((px as number) + 38, H * (py as number) + 50);
    ctx.closePath();
    ctx.fill();
  });

  // Tanah hijau vivid
  const ground = ctx.createLinearGradient(0, H * 0.58, 0, H);
  ground.addColorStop(0, "#22c55e");
  ground.addColorStop(0.5, "#16a34a");
  ground.addColorStop(1, "#14532d");
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  // Pohon tajam
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 90;
    const h = 90 + (i % 3) * 20;
    // Gradien pohon
    const tg = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
    tg.addColorStop(0, "#166534");
    tg.addColorStop(0.5, "#22c55e");
    tg.addColorStop(1, "#166534");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.59);
    ctx.lineTo(x - 30, H * 0.59 + h);
    ctx.lineTo(x + 30, H * 0.59 + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 8, H * 0.59 + h, 16, 32);
  }

  // Pantulan sinar matahari di tanah
  const shimmer = ctx.createLinearGradient(0, H * 0.58, 0, H);
  shimmer.addColorStop(0, "rgba(250,204,21,0.12)");
  shimmer.addColorStop(1, "rgba(250,204,21,0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  // Label bar bawah
  ctx.fillStyle = "rgba(15,23,42,0.82)";
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = "#fef08a";
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u2728  4K Ultra HD  \u2022  AI Enhanced  \u2022  Crystal Clear", W / 2, H - 20);
}

export default function LandingShowcase() {
  const [demoFilesCount, setDemoFilesCount] = useState<number>(0);
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [afterUrl, setAfterUrl] = useState<string>("");

  useEffect(() => {
    const bc = document.createElement("canvas");
    const ac = document.createElement("canvas");
    drawBefore(bc);
    drawAfter(ac);
    setBeforeUrl(bc.toDataURL("image/jpeg", 0.88));
    setAfterUrl(ac.toDataURL("image/jpeg", 0.92));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Bagian 1: Uji Coba Dropzone */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              1
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Komponen Dropzone
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {demoFilesCount > 0 ? `${demoFilesCount} berkas terpilih` : "Siap menerima berkas"}
          </span>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Uji coba fitur seret &amp; lepas gambar atau klik tombol untuk memilih berkas dari komputer Anda:
        </p>

        <Dropzone
          onFiles={(files) => setDemoFilesCount(files.length)}
          title="Tarik &amp; letakkan gambar contoh di sini"
          subtitle="atau klik untuk memilih dari perangkat Anda"
        />
      </div>

      {/* Bagian 2: Uji Coba ImageCompare */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              2
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Komponen ImageCompare
            </h3>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-100 font-medium px-2 py-0.5 rounded-full">
            Interaktif
          </span>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Geser bilah pembatas ke kiri dan kanan untuk membandingkan kualitas gambar sebelum dan sesudah:
        </p>

        {beforeUrl && afterUrl ? (
          <ImageCompare
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            beforeLabel="Sebelum (Asli)"
            afterLabel="Sesudah (ImgTools AI)"
          />
        ) : (
          /* Skeleton loading saat canvas belum selesai render */
          <div className="h-[360px] sm:h-[420px] w-full rounded-2xl bg-slate-200 animate-pulse flex items-center justify-center">
            <span className="text-sm text-slate-400">Memuat pratinjau...</span>
          </div>
        )}
      </div>
    </div>
  );
}
