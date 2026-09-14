"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { resize, download, formatBytes, fileToBitmap } from "@/lib/image";

export default function UbahUkuranPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Mode: "pixel" atau "percent"
  const [mode, setMode] = useState<"pixel" | "percent">("pixel");
  const [width, setWidth] = useState<number>(1080);
  const [height, setHeight] = useState<number>(1080);
  const [keepRatio, setKeepRatio] = useState<boolean>(true);
  const [percent, setPercent] = useState<number>(50);

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [processedDimensions, setProcessedDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Baca dimensi asli saat berkas dipilih
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalPreview(url);
      setProcessedBlob(null);
      setProcessedUrl("");
      setErrorMsg("");

      fileToBitmap(file)
        .then((bitmap) => {
          setOriginalDimensions({ w: bitmap.width, h: bitmap.height });
          setWidth(bitmap.width);
          setHeight(bitmap.height);
          bitmap.close();
        })
        .catch(() => {
          // Fallback image dimensions
          const img = new Image();
          img.onload = () => {
            setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            setWidth(img.naturalWidth);
            setHeight(img.naturalHeight);
          };
          img.src = url;
        });

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setOriginalPreview("");
      setOriginalDimensions({ w: 0, h: 0 });
      setProcessedBlob(null);
      setProcessedUrl("");
    }
  }, [file]);

  // Kelola object URL untuk hasil resize
  useEffect(() => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      setProcessedUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [processedBlob]);

  // Handler perubahan lebar piksel dengan penjagaan rasio
  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (keepRatio && originalDimensions.w > 0) {
      const ratio = originalDimensions.h / originalDimensions.w;
      setHeight(Math.max(1, Math.round(val * ratio)));
    }
  };

  // Handler perubahan tinggi piksel dengan penjagaan rasio
  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (keepRatio && originalDimensions.h > 0) {
      const ratio = originalDimensions.w / originalDimensions.h;
      setWidth(Math.max(1, Math.round(val * ratio)));
    }
  };

  // Terapkan preset umum
  const applyPreset = (presetW: number, presetH: number) => {
    setMode("pixel");
    setKeepRatio(false); // Memungkinkan preset khusus tanpa terkunci rasio asli kecuali diinginkan
    setWidth(presetW);
    setHeight(presetH);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      let result: Blob;
      let finalW = width;
      let finalH = height;

      if (mode === "percent") {
        result = await resize(file, {
          percent,
        });
        const scale = percent / 100;
        finalW = Math.max(1, Math.round(originalDimensions.w * scale));
        finalH = Math.max(1, Math.round(originalDimensions.h * scale));
      } else {
        result = await resize(file, {
          width,
          height,
          keepRatio,
        });
        if (keepRatio && originalDimensions.w > 0) {
          const ratio = Math.min(width / originalDimensions.w, height / originalDimensions.h);
          finalW = Math.max(1, Math.round(originalDimensions.w * ratio));
          finalH = Math.max(1, Math.round(originalDimensions.h * ratio));
        }
      }

      setProcessedBlob(result);
      setProcessedDimensions({ w: finalW, h: finalH });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengubah ukuran gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !file) return;
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex !== -1 ? file.name.substring(dotIndex) : ".jpg";
    download(processedBlob, `${baseName}-diubah-ukuran${ext}`);
  };

  return (
    <ToolShell
      title="Ubah Ukuran Gambar"
      description="Atur dimensi piksel atau persentase ukuran gambar secara instan langsung di browser Anda."
      badge="Di browser"
    >
      <div className="space-y-8">
        {!file ? (
          <Dropzone
            multiple={false}
            accept="image/*"
            onFiles={(files) => {
              if (files.length > 0) {
                setFile(files[0]);
              }
            }}
            title="Tarik & letakkan gambar yang ingin diubah ukurannya"
            subtitle="Mendukung JPG, PNG, WEBP, dan format gambar lainnya"
          />
        ) : (
          <div className="space-y-6">
            {/* Header info berkas */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dimensi Asli: <span className="font-semibold text-slate-700">{originalDimensions.w} × {originalDimensions.h} px</span> • Ukuran: <span className="font-semibold text-slate-700">{formatBytes(file.size)}</span>
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

            {/* Opsi Pengubahan Ukuran */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Pilihan Ukuran Baru
                </h3>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-64">
                  <button
                    type="button"
                    onClick={() => setMode("pixel")}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      mode === "pixel"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Mode Piksel (px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("percent")}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      mode === "percent"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Mode Persen (%)
                  </button>
                </div>
              </div>

              {/* Preset Umum */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preset Cepat
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset(1920, 1080)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    1920 × 1080 <span className="text-slate-400">(Full HD 16:9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(1080, 1080)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    1080 × 1080 <span className="text-slate-400">(Instagram 1:1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(512, 512)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    512 × 512 <span className="text-slate-400">(Ikon / Avatar)</span>
                  </button>
                </div>
              </div>

              {/* Input Kontrol */}
              {mode === "pixel" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label htmlFor="resize-width" className="text-sm font-medium text-slate-700">
                        Lebar (Piksel)
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          id="resize-width"
                          type="number"
                          min="1"
                          max="10000"
                          value={width}
                          onChange={(e) => handleWidthChange(Math.max(1, Number(e.target.value)))}
                          className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs font-semibold text-slate-400">px</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="resize-height" className="text-sm font-medium text-slate-700">
                        Tinggi (Piksel)
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          id="resize-height"
                          type="number"
                          min="1"
                          max="10000"
                          value={height}
                          onChange={(e) => handleHeightChange(Math.max(1, Number(e.target.value)))}
                          className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs font-semibold text-slate-400">px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checkbox pertahankan rasio aspek */}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={keepRatio}
                      onChange={(e) => setKeepRatio(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Pertahankan Rasio Aspek (Aspect Ratio Lock)</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="percent-slider" className="font-medium text-slate-700">
                      Skala Ukuran: <span className="font-bold text-indigo-600">{percent}%</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      Estimasi: {Math.round(originalDimensions.w * (percent / 100))} × {Math.round(originalDimensions.h * (percent / 100))} px
                    </span>
                  </div>
                  <input
                    id="percent-slider"
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>10% (Sangat Kecil)</span>
                    <span>100% (Ukuran Asli)</span>
                    <span>200% (2x Lebih Besar)</span>
                  </div>
                </div>
              )}

              {/* Tombol Jalankan */}
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
                      <span>Mengubah Ukuran...</span>
                    </>
                  ) : (
                    <>
                      <span>Ubah Ukuran Sekarang</span>
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

            {/* Hasil Ukuran Baru */}
            {processedBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Ukuran Berhasil Diubah!
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      Ringkasan Dimensi & Ukuran Berkas
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
                    Unduh Gambar Hasil
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Dimensi Sebelum</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {originalDimensions.w} × {originalDimensions.h} px
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/50 p-4">
                    <p className="text-xs font-medium text-emerald-800">Dimensi Sesudah</p>
                    <p className="mt-1 text-lg font-bold text-emerald-900">
                      {processedDimensions.w} × {processedDimensions.h} px
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran File Awal</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatBytes(file.size)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran File Baru</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatBytes(processedBlob.size)}
                    </p>
                  </div>
                </div>

                {/* Pratinjau Gambar Berdampingan */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Perbandingan Pratinjau
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                        <span>Sebelum: {originalDimensions.w} × {originalDimensions.h} px</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={originalPreview}
                          alt="Ukuran asli"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-emerald-700">
                        <span>Sesudah: {processedDimensions.w} × {processedDimensions.h} px</span>
                        <span>{formatBytes(processedBlob.size)}</span>
                      </div>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={processedUrl}
                          alt="Hasil Ubah Ukuran"
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
