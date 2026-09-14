"use client";

import React, { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { universalDecode } from "@/lib/formats";
import { toCanvas, canvasToBlob, download, formatBytes } from "@/lib/image";

interface ConversionItem {
  id: string;
  file: File;
  status: "idle" | "processing" | "done" | "error";
  progress: number; // 0..100
  resultBlob: Blob | null;
  resultUrl: string;
  errorMsg: string;
}

export default function KonversiJpgPage() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [quality, setQuality] = useState<number>(90);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // Terima berkas dari Dropzone
  const handleFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    const newItems: ConversionItem[] = incomingFiles.map((f, idx) => ({
      id: `${f.name}-${Date.now()}-${idx}`,
      file: f,
      status: "idle",
      progress: 0,
      resultBlob: null,
      resultUrl: "",
      errorMsg: "",
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  // Konversi satu berkas
  const processItem = async (item: ConversionItem, currentQuality: number): Promise<ConversionItem> => {
    try {
      // Step 1: Mulai decoding
      const bmp = await universalDecode(item.file);

      // Step 2: Render ke kanvas dengan latar putih
      const canvas = toCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi kanvas.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0);

      bmp.close();

      // Step 3: Konversi ke JPEG Blob
      const q = Math.max(0.1, Math.min(1, currentQuality / 100));
      const blob = await canvasToBlob(canvas, "image/jpeg", q);
      const url = URL.createObjectURL(blob);

      return {
        ...item,
        status: "done",
        progress: 100,
        resultBlob: blob,
        resultUrl: url,
        errorMsg: "",
      };
    } catch (err: unknown) {
      return {
        ...item,
        status: "error",
        progress: 100,
        resultBlob: null,
        resultUrl: "",
        errorMsg: err instanceof Error ? err.message : "Gagal mengonversi gambar.",
      };
    }
  };

  // Jalankan konversi massal
  const handleConvertAll = async () => {
    if (items.length === 0) return;
    setIsProcessingAll(true);

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      if (current.status === "done") continue;

      // Update status ke processing
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "processing", progress: 40 } : it))
      );

      const processed = await processItem(current, quality);

      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? processed : it))
      );
    }

    setIsProcessingAll(false);
  };

  // Unduh satu file
  const handleDownloadSingle = (item: ConversionItem) => {
    if (!item.resultBlob) return;
    const dotIndex = item.file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? item.file.name.substring(0, dotIndex) : item.file.name;
    download(item.resultBlob, `${baseName}.jpg`);
  };

  // Unduh semua berkas hasil
  const handleDownloadAll = async () => {
    const readyItems = items.filter((i) => i.status === "done" && i.resultBlob);
    for (const item of readyItems) {
      handleDownloadSingle(item);
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  // Hapus satu item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  // Reset semua
  const handleReset = () => {
    items.forEach((i) => {
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
    setItems([]);
  };

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <ToolShell
      title="Konversi ke JPG Massal"
      description="Ubah foto HEIC, TIFF, SVG, WEBP, PNG, GIF, atau BMP menjadi format JPG standar dengan latar putih transparan."
      badge="Di browser"
    >
      <div className="space-y-6">
        {/* Catatan Info Format RAW & PSD */}
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 flex items-start gap-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs mt-0.5">
            AI
          </div>
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold text-slate-900">
              Dukungan Format Kamera RAW & Photoshop PSD
            </p>
            <p className="text-slate-600">
              Format profesional seperti RAW (.CR2, .NEF, .ARW, .DNG) dan Adobe Photoshop (.PSD) dikirim ke server AI untuk pemrosesan fidelitas tinggi (dihubungkan nanti).
            </p>
          </div>
        </div>

        {/* Dropzone Multi-File */}
        <Dropzone
          multiple={true}
          accept="image/*,.heic,.heif,.tiff,.tif,.svg"
          onFiles={handleFiles}
          title="Tarik & letakkan berkas untuk dikonversi ke JPG"
          subtitle="Mendukung HEIC, TIFF, SVG, WEBP, PNG, GIF, BMP, dan format grafis lainnya"
        />

        {/* Panel Daftar Berkas & Pengaturan */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
            {/* Header Kontrol */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Antrean Konversi ({items.length} Berkas)
                </h3>
                <p className="text-xs text-slate-500">
                  {doneCount} dari {items.length} berkas telah selesai dikonversi ke JPG.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition"
                >
                  Hapus Semua
                </button>

                {doneCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Unduh Semua ({doneCount})
                  </button>
                )}
              </div>
            </div>

            {/* Slider Kualitas JPG Global */}
            <div className="max-w-md space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Kualitas Kompresi JPG</span>
                <span className="text-indigo-600 font-bold">{quality}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>30% (Kecil)</span>
                <span>90% (Rekomendasi)</span>
                <span>100% (Maksimal)</span>
              </div>
            </div>

            {/* Tombol Mulai Konversi */}
            <div>
              <button
                type="button"
                disabled={isProcessingAll || items.every((i) => i.status === "done")}
                onClick={handleConvertAll}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {isProcessingAll ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Mengonversi Berkas...</span>
                  </>
                ) : (
                  <>
                    <span>Mulai Konversi ke JPG</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* List Berkas dengan Progress Bar */}
            <div className="space-y-3">
              {items.map((item) => {
                const ext = item.file.name.split(".").pop()?.toUpperCase() || "GAMBAR";
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700 uppercase">
                        {ext.substring(0, 4)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatBytes(item.file.size)}
                          {item.resultBlob && (
                            <span className="text-emerald-600 font-medium"> → {formatBytes(item.resultBlob.size)} (JPG)</span>
                          )}
                        </p>

                        {/* Progress Bar */}
                        {item.status === "processing" && (
                          <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4 transition-all duration-300" />
                          </div>
                        )}

                        {item.errorMsg && (
                          <p className="text-[10px] text-rose-600 mt-0.5">
                            {item.errorMsg}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status & Tombol Aksi */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.status === "idle" && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Dalam Antrean
                        </span>
                      )}

                      {item.status === "processing" && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 animate-pulse">
                          Memproses...
                        </span>
                      )}

                      {item.status === "done" && item.resultBlob && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Unduh JPG
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
