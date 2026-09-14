"use client";

import React, { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";

export default function LandingShowcase() {
  const [demoFilesCount, setDemoFilesCount] = useState<number>(0);

  // High quality SVG vectors for instant before/after demo
  const beforeSample = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="800" height="500" fill="#e2e8f0" />
      <g filter="url(#blur)">
        <circle cx="250" cy="250" r="120" fill="#94a3b8" />
        <circle cx="550" cy="250" r="100" fill="#cbd5e1" />
        <rect x="180" y="320" width="440" height="40" rx="10" fill="#64748b" />
        <text x="50%" y="46%" text-anchor="middle" fill="#334155" font-family="sans-serif" font-size="28" font-weight="bold">Foto Beresolusi Rendah / Buram</text>
        <text x="50%" y="54%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="16">Ukuran Asli (Sebelum AI Enhancement)</text>
      </g>
    </svg>
  `);

  const afterSample = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="#f8fafc" />
      <rect x="50" y="50" width="700" height="400" rx="20" fill="url(#g1)" opacity="0.95" />
      <circle cx="250" cy="250" r="110" fill="#ffffff" opacity="0.9" />
      <circle cx="550" cy="250" r="90" fill="#ffffff" opacity="0.8" />
      <rect x="180" y="320" width="440" height="40" rx="20" fill="#ffffff" />
      <text x="50%" y="46%" text-anchor="middle" fill="#1e1b4b" font-family="sans-serif" font-size="28" font-weight="bold">Hasil Kristal & Tajam 4K</text>
      <text x="50%" y="54%" text-anchor="middle" fill="#065f46" font-family="sans-serif" font-size="16">Resolusi Super AI (Sesudah Peningkatan)</text>
    </svg>
  `);

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
          Uji coba fitur seret & lepas gambar atau klik tombol untuk memilih berkas dari komputer Anda:
        </p>

        <Dropzone
          onFiles={(files) => setDemoFilesCount(files.length)}
          title="Tarik & letakkan gambar contoh di sini"
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

        <ImageCompare
          beforeUrl={beforeSample}
          afterUrl={afterSample}
          beforeLabel="Sebelum (Asli)"
          afterLabel="Sesudah (ImgTools AI)"
        />
      </div>
    </div>
  );
}
