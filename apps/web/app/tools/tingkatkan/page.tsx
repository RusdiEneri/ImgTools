"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";
import AiStatus from "@/components/AiStatus";
import { upscale, wakeUp } from "@/lib/ai";
import { download, formatBytes } from "@/lib/image";

export default function TingkatkanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [origDim, setOrigDim] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState<number>(2); // 2 atau 4
  const [maxSide, setMaxSide] = useState<number>(2048); // 1024 - 2048

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [resultDim, setResultDim] = useState<{ w: number; h: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    wakeUp();
  }, []);

  const handleFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;
    const selected = incomingFiles[0];
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setOriginalUrl(url);

    // Ambil dimensi gambar asli
    const img = new Image();
    img.onload = () => {
      setOrigDim({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;

    setResultBlob(null);
    setResultUrl("");
    setResultDim(null);
    setErrorMessage("");
  };

  const handleUpscale = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const blob = await upscale(file, scale, maxSide);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);

      // Ambil dimensi hasil
      const img = new Image();
      img.onload = () => {
        setResultDim({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = url;
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? (err as { detail?: string }).detail || err.message : "Gagal meningkatkan resolusi gambar.";
      setErrorMessage(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    download(resultBlob, `${baseName}-upscale-${scale}x.png`);
  };

  const handleReset = () => {
    setFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalUrl("");
    setOrigDim(null);
    setResultBlob(null);
    setResultUrl("");
    setResultDim(null);
    setErrorMessage("");
  };

  return (
    <ToolShell
      title="Tingkatkan Gambar (AI Upscale)"
      description="Tingkatkan ketajaman dan resolusi gambar hingga 4× lebih tinggi dengan model deep-learning Swin2SR."
      badge="Baru!"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <AiStatus />
          {file && (
            <button
              type="button"
              onClick={handleReset}
              className="self-start sm:self-auto text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              Ganti Gambar
            </button>
          )}
        </div>

        {!file && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <Dropzone
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
              multiple={false}
              onFiles={handleFiles}
              title="Pilih gambar untuk ditingkatkan resolusinya"
              subtitle="Mendukung JPG, PNG, WEBP, dan BMP hingga 25 MB"
            />
          </div>
        )}

        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-800">
                      {resultUrl ? "Perbandingan Sebelum vs Sesudah Upscale" : "Pratinjau Gambar"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {file.name} ({formatBytes(file.size)})
                    </p>
                  </div>

                  {/* Dimensi Badge Sebelum / Sesudah */}
                  <div className="flex items-center gap-2 text-xs">
                    {origDim && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                        Asli: {origDim.w} × {origDim.h} px
                      </span>
                    )}
                    {resultDim && (
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                        Hasil: {resultDim.w} × {resultDim.h} px ({scale}×)
                      </span>
                    )}
                  </div>
                </div>

                {resultUrl ? (
                  <ImageCompare
                    beforeUrl={originalUrl}
                    afterUrl={resultUrl}
                    beforeLabel="Sebelum"
                    afterLabel={`Hasil ${scale}×`}
                  />
                ) : (
                  <div className="flex h-[360px] sm:h-[450px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalUrl}
                      alt="Gambar Asli"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Panel Kontrol Pengaturan */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengaturan Super-Resolution</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Tentukan faktor pembesaran resolusi dan batas dimensi sisi terpanjang.
                  </p>
                </div>

                {/* Pilihan Skala 2x vs 4x */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Skala Perbesaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScale(2)}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        scale === 2
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      2× Perbesaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setScale(4)}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        scale === 4
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      4× Perbesaran
                    </button>
                  </div>
                </div>

                {/* Slider max_side */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700">Maksimal Dimensi Sisi</label>
                    <span className="font-mono font-medium text-indigo-600">{maxSide} px</span>
                  </div>
                  <input
                    type="range"
                    min="1024"
                    max="2048"
                    step="128"
                    value={maxSide}
                    onChange={(e) => setMaxSide(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>1024 px</span>
                    <span>2048 px</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <div className="flex gap-2">
                      <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-semibold">Kesalahan:</span> {errorMessage}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  {!resultUrl ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleUpscale}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Meningkatkan Resolusi ({scale}×)...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <span>Tingkatkan Resolusi</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Unduh Gambar {scale}× PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUpscale}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Proses Ulang
                      </button>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-400 space-y-1">
                  <p>✓ Menggunakan arsitektur transformer Swin2SR.</p>
                  <p>✓ Rekonstruksi tekstur foto alami tanpa efek buram.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
