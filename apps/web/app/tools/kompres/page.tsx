"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { compress, download, formatBytes } from "@/lib/image";

export default function KompresPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>("");

  // Mode: "quality" (slider 10-100) atau "targetKB" (input KB)
  const [mode, setMode] = useState<"quality" | "targetKB">("quality");
  const [quality, setQuality] = useState<number>(75);
  const [targetKB, setTargetKB] = useState<number>(200);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Update original preview saat file berubah
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalPreview(url);
      setProcessedBlob(null);
      setProcessedUrl("");
      setErrorMsg("");

      // Set target KB default ke 50% ukuran asli jika mode targetKB
      const initialKB = Math.max(10, Math.round((file.size / 1024) * 0.5));
      setTargetKB(initialKB);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setOriginalPreview("");
      setProcessedBlob(null);
      setProcessedUrl("");
    }
  }, [file]);

  // Update object URL untuk hasil kompresi
  useEffect(() => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      setProcessedUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [processedBlob]);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const outputFormat = file.type || "image/jpeg";
      let result: Blob;

      if (mode === "quality") {
        result = await compress(file, {
          quality,
          format: outputFormat,
        });
      } else {
        result = await compress(file, {
          maxKB: targetKB,
          format: outputFormat,
        });
      }

      setProcessedBlob(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !file) return;
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex !== -1 ? file.name.substring(dotIndex) : ".jpg";
    download(processedBlob, `${baseName}-terkompres${ext}`);
  };

  // Hitung persentase penghematan ukuran
  const originalSize = file?.size || 0;
  const newSize = processedBlob?.size || 0;
  const savedBytes = originalSize - newSize;
  const savingsPercent = originalSize > 0 && newSize > 0
    ? Math.round(((originalSize - newSize) / originalSize) * 100)
    : 0;

  return (
    <ToolShell
      title="Kompres Gambar"
      description="Kecilkan ukuran file gambar JPG, PNG, atau WEBP langsung di browser Anda dengan kualitas optimal."
      badge="Di browser"
    >
      <div className="space-y-8">
        {/* Dropzone untuk memilih berkas */}
        {!file ? (
          <Dropzone
            multiple={false}
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onFiles={(files) => {
              if (files.length > 0) {
                setFile(files[0]);
              }
            }}
            title="Tarik & letakkan gambar yang ingin dikompres"
            subtitle="Pilih berkas JPG, PNG, atau WEBP dari perangkat Anda"
          />
        ) : (
          <div className="space-y-6">
            {/* Header info berkas terpilih */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ukuran Asli: <span className="font-medium text-slate-700">{formatBytes(file.size)}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-rose-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Ganti Gambar
              </button>
            </div>

            {/* Pengaturan Kompresi */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <h3 className="text-base font-semibold text-slate-900">
                Pengaturan Kompresi
              </h3>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 max-w-md">
                <button
                  type="button"
                  onClick={() => setMode("quality")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    mode === "quality"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Berdasarkan Kualitas
                </button>
                <button
                  type="button"
                  onClick={() => setMode("targetKB")}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    mode === "targetKB"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Target Ukuran (KB)
                </button>
              </div>

              {/* Kontrol Kualitas */}
              {mode === "quality" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="quality-slider" className="font-medium text-slate-700">
                      Tingkat Kualitas: <span className="font-bold text-indigo-600">{quality}%</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      {quality > 80 ? "Kualitas Tinggi" : quality > 50 ? "Seimbang" : "Ukuran Terkecil"}
                    </span>
                  </div>
                  <input
                    id="quality-slider"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>10% (Hemat Ekstrem)</span>
                    <span>50% (Rekomendasi)</span>
                    <span>100% (Maksimal)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-w-xs">
                  <label htmlFor="target-kb" className="block text-sm font-medium text-slate-700">
                    Batas Maksimal Ukuran (KB)
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      id="target-kb"
                      type="number"
                      min="5"
                      max={Math.round(file.size / 1024)}
                      value={targetKB}
                      onChange={(e) => setTargetKB(Math.max(1, Number(e.target.value)))}
                      className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-12 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-semibold text-slate-400">KB</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sistem akan mencari kualitas optimal secara biner untuk mendekati target KB.
                  </p>
                </div>
              )}

              {/* Tombol Proses */}
              <div className="pt-2">
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
                      <span>Mengompres Gambar...</span>
                    </>
                  ) : (
                    <>
                      <span>Kompres Sekarang</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Hasil Kompresi */}
            {processedBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Kompresi Selesai!
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      Perbandingan Ukuran
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Unduh Gambar Terkompres
                  </button>
                </div>

                {/* Kartu Statistik Ukuran */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran Sebelum</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">
                      {formatBytes(originalSize)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran Sesudah</p>
                    <p className="mt-1 text-xl font-bold text-emerald-600">
                      {formatBytes(newSize)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/50 p-4">
                    <p className="text-xs font-medium text-emerald-700">Penghematan Ukuran</p>
                    <p className="mt-1 text-xl font-bold text-emerald-800">
                      {savingsPercent > 0 ? `Hemat ${savingsPercent}%` : "Ukuran Mirip"}
                      {savedBytes > 0 && (
                        <span className="ml-1 text-xs font-normal text-emerald-600">
                          (-{formatBytes(savedBytes)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Pratinjau Gambar Berdampingan */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Pratinjau Hasil
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                        <span>Sebelum ({formatBytes(originalSize)})</span>
                      </div>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={originalPreview}
                          alt="Sebelum kompresi"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-emerald-700">
                        <span>Sesudah ({formatBytes(newSize)})</span>
                      </div>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={processedUrl}
                          alt="Sesudah kompresi"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
