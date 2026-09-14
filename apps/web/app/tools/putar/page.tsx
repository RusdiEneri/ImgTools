"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { rotate, download, formatBytes } from "@/lib/image";

export default function PutarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");

  // Transformasi orientasi
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalPreview(url);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setProcessedBlob(null);
      setProcessedUrl("");
      setErrorMsg("");

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setOriginalPreview("");
      setProcessedBlob(null);
      setProcessedUrl("");
    }
  }, [file]);

  useEffect(() => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      setProcessedUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [processedBlob]);

  // Rotasi 90 derajat searah jarum jam
  const rotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
    setProcessedBlob(null);
  };

  // Rotasi 90 derajat berlawanan jarum jam
  const rotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setProcessedBlob(null);
  };

  // Rotasi 180 derajat
  const rotate180 = () => {
    setRotation((prev) => (prev + 180) % 360);
    setProcessedBlob(null);
  };

  // Flip Horizontal
  const toggleFlipH = () => {
    setFlipH((prev) => !prev);
    setProcessedBlob(null);
  };

  // Flip Vertikal
  const toggleFlipV = () => {
    setFlipV((prev) => !prev);
    setProcessedBlob(null);
  };

  // Reset transformasi
  const resetTransform = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setProcessedBlob(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const result = await rotate(file, rotation, flipH, flipV);
      setProcessedBlob(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memproses rotasi gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !file) return;
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex !== -1 ? file.name.substring(dotIndex) : ".jpg";
    download(processedBlob, `${baseName}-putar-${rotation}deg${ext}`);
  };

  return (
    <ToolShell
      title="Putar & Balik Gambar"
      description="Putar orientasi gambar 90°, 180°, atau balik cermin horizontal dan vertikal secara instan."
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
            title="Tarik & letakkan gambar yang ingin diputar"
            subtitle="Mendukung format JPG, PNG, WEBP, dan format foto lainnya"
          />
        ) : (
          <div className="space-y-6">
            {/* Header info berkas */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ukuran Asli: <span className="font-semibold text-slate-700">{formatBytes(file.size)}</span>
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

            {/* Panel Kontrol & Pratinjau Interaktif */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Atur Orientasi Gambar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orientasi saat ini: <span className="font-bold text-indigo-600">{rotation}°</span>
                    {flipH && " • Cermin Horizontal"}
                    {flipV && " • Cermin Vertikal"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetTransform}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-rose-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Posisi
                </button>
              </div>

              {/* Tombol-tombol Rotasi & Flip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={rotateLeft}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  <span className="text-xs font-semibold">90° Kiri</span>
                </button>

                <button
                  type="button"
                  onClick={rotateRight}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                  </svg>
                  <span className="text-xs font-semibold">90° Kanan</span>
                </button>

                <button
                  type="button"
                  onClick={rotate180}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs font-semibold">Putar 180°</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFlipH}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    flipH
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="text-xs font-semibold">Cermin Horiz.</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFlipV}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    flipV
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span className="text-xs font-semibold">Cermin Vert.</span>
                </button>
              </div>

              {/* Area Pratinjau Live */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Pratinjau Live Interaktif
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {rotation}° {flipH ? "• Flip H" : ""} {flipV ? "• Flip V" : ""}
                  </span>
                </div>

                <div className="relative flex h-80 sm:h-96 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100/70 p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalPreview}
                    alt="Pratinjau Rotasi"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    className="max-h-full max-w-full object-contain select-none"
                  />
                </div>
              </div>

              {/* Tombol Terapkan */}
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
                      <span>Menyimpan Rotasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Terapkan & Simpan Gambar</span>
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

            {/* Hasil Rotasi Siap Unduh */}
            {processedBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Rotasi Berhasil Diterapkan!
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      Berkas Gambar Baru Siap Diunduh
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
                    Unduh Gambar Hasil Rotasi
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran Berkas Awal</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatBytes(file.size)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Ukuran Berkas Hasil</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatBytes(processedBlob.size)}
                    </p>
                  </div>
                </div>

                {/* Pratinjau Gambar Hasil */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Pratinjau Hasil Akhir
                  </p>
                  <div className="relative max-h-96 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={processedUrl}
                      alt="Hasil Rotasi Final"
                      className="max-h-80 max-w-full object-contain rounded"
                    />
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
