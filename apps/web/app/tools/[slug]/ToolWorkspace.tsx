"use client";

import React, { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";
import { ToolItem } from "@/lib/tools";

interface ToolWorkspaceProps {
  tool: ToolItem;
}

export default function ToolWorkspace({ tool }: ToolWorkspaceProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  // SVG Data URL for sample before/after demo
  const sampleBefore = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#cbd5e1" />
      <circle cx="300" cy="200" r="80" fill="#94a3b8" />
      <text x="50%" y="45%" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="22" font-weight="bold">Gambar Asli</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14">(Sebelum Diproses)</text>
    </svg>
  `);

  const sampleAfter = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#10b981" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#grad)" />
      <circle cx="300" cy="200" r="90" fill="#ffffff" fill-opacity="0.9" />
      <text x="50%" y="45%" text-anchor="middle" fill="#1e1b4b" font-family="sans-serif" font-size="22" font-weight="bold">Hasil Optimal</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#047857" font-family="sans-serif" font-size="14">(${tool.name} Berhasil)</text>
    </svg>
  `);

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setProcessed(true);
    }, 1200);
  };

  const showComparison = ["tingkatkan-gambar", "hapus-latar-belakang", "kompres", "buramkan-wajah", "editor-foto"].includes(tool.slug);

  return (
    <div className="space-y-8">
      {/* Dropzone Area */}
      <Dropzone
        onFiles={(selectedFiles) => {
          setFiles(selectedFiles);
          setProcessed(false);
        }}
        multiple={tool.slug === "kompres" || tool.slug === "konversi-ke-jpg"}
        title={`Unggah gambar untuk ${tool.name}`}
        subtitle="Pilih berkas dari komputer atau seret gambar ke kotak ini"
      />

      {/* Kontrol & Aksi Tool */}
      {files.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-800">
                Opsi Pemrosesan — {tool.name}
              </h3>
              <p className="text-xs text-slate-500">
                {tool.badge === "Baru!"
                  ? "Didukung akselerasi model AI performa tinggi"
                  : "Diproses cepat langsung di dalam peramban web"}
              </p>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleProcess}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sedang Memproses...</span>
                </>
              ) : (
                <>
                  <span>Mulai {tool.name}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {processed && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Pemrosesan selesai dengan sukses! Berkas siap diunduh.</span>
              </div>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Unduh Gambar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Demo Slider Perbandingan Sebelum & Sesudah */}
      {showComparison && (
        <div className="mt-8 border-t border-slate-100 pt-8">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Pratinjau Perbandingan Kualitas
            </h3>
            <p className="text-xs text-slate-500">
              Geser garis pemisah ke kiri dan ke kanan untuk melihat perbandingan hasil sebelum dan sesudah {tool.name.toLowerCase()}.
            </p>
          </div>

          <ImageCompare
            beforeUrl={sampleBefore}
            afterUrl={sampleAfter}
            beforeLabel="Sebelum"
            afterLabel={`Sesudah (${tool.name})`}
          />
        </div>
      )}
    </div>
  );
}
