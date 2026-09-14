"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { crop, download, formatBytes } from "@/lib/image";

export default function PotongPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);

  // State crop untuk ReactCrop
  const [cropState, setCropState] = useState<Crop>({
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  // Koordinat piksel riil gambar asli
  const [actualPixelCrop, setActualPixelCrop] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>({ x: 0, y: 0, w: 0, h: 0 });

  const [naturalDimensions, setNaturalDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImgSrc(url);
      setProcessedBlob(null);
      setProcessedUrl("");
      setErrorMsg("");

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImgSrc("");
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

  // Handler saat gambar selesai dimuat di DOM
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDimensions({ w: naturalWidth, h: naturalHeight });

    // Inisialisasi crop 80% di tengah
    const initialW = Math.round(naturalWidth * 0.8);
    const initialH = Math.round(naturalHeight * 0.8);
    const initialX = Math.round((naturalWidth - initialW) / 2);
    const initialY = Math.round((naturalHeight - initialH) / 2);

    setActualPixelCrop({
      x: initialX,
      y: initialY,
      w: initialW,
      h: initialH,
    });

    setCropState({
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
  };

  // Konversi crop relatif ke koordinat piksel gambar asli
  const updateActualCrop = (c: PixelCrop) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    if (img.width === 0 || img.height === 0) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const realX = Math.max(0, Math.round(c.x * scaleX));
    const realY = Math.max(0, Math.round(c.y * scaleY));
    const realW = Math.min(img.naturalWidth - realX, Math.round(c.width * scaleX));
    const realH = Math.min(img.naturalHeight - realY, Math.round(c.height * scaleY));

    setActualPixelCrop({
      x: realX,
      y: realY,
      w: realW,
      h: realH,
    });
  };

  const handleProcessCrop = async () => {
    if (!file) return;
    if (actualPixelCrop.w <= 0 || actualPixelCrop.h <= 0) {
      setErrorMsg("Silakan tentukan area potongan yang valid.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      const result = await crop(file, {
        x: actualPixelCrop.x,
        y: actualPixelCrop.y,
        w: actualPixelCrop.w,
        h: actualPixelCrop.h,
      });

      setProcessedBlob(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memotong gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !file) return;
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex !== -1 ? file.name.substring(dotIndex) : ".jpg";
    download(processedBlob, `${baseName}-terpotong${ext}`);
  };

  return (
    <ToolShell
      title="Potong Gambar"
      description="Potong dan tentukan area gambar yang diinginkan dengan koordinat presisi tinggi."
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
            title="Tarik & letakkan gambar yang ingin dipotong"
            subtitle="Mendukung JPG, PNG, WEBP, dan format foto lainnya"
          />
        ) : (
          <div className="space-y-6">
            {/* Header info berkas */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Resolusi Asli: <span className="font-semibold text-slate-700">{naturalDimensions.w} × {naturalDimensions.h} px</span> • Ukuran: <span className="font-semibold text-slate-700">{formatBytes(file.size)}</span>
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

            {/* Area Editor Pemotongan Gambar */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Sesuaikan Area Potongan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Geser atau ubah ukuran persegi panjang untuk menentukan bagian gambar yang akan disimpan.
                  </p>
                </div>

                {/* Tombol Aksi Potong */}
                <button
                  type="button"
                  disabled={isProcessing || actualPixelCrop.w <= 0}
                  onClick={handleProcessCrop}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Memotong...</span>
                    </>
                  ) : (
                    <>
                      <span>Potong Gambar</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Tampilan Koordinat Piksel Real-time */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Koordinat X</p>
                  <p className="mt-0.5 text-base font-bold text-slate-800">{actualPixelCrop.x} px</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Koordinat Y</p>
                  <p className="mt-0.5 text-base font-bold text-slate-800">{actualPixelCrop.y} px</p>
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Lebar (W)</p>
                  <p className="mt-0.5 text-base font-bold text-indigo-700">{actualPixelCrop.w} px</p>
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Tinggi (H)</p>
                  <p className="mt-0.5 text-base font-bold text-indigo-700">{actualPixelCrop.h} px</p>
                </div>
              </div>

              {/* Interactive ReactCrop Canvas */}
              <div className="flex justify-center rounded-xl bg-slate-900/5 p-4 overflow-auto max-h-[580px]">
                <ReactCrop
                  crop={cropState}
                  onChange={(pixelCrop, percentCrop) => {
                    setCropState(percentCrop);
                    updateActualCrop(pixelCrop);
                  }}
                  onComplete={(c) => updateActualCrop(c)}
                  className="max-h-[520px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Area potong"
                    onLoad={onImageLoad}
                    className="max-h-[520px] max-w-full object-contain select-none"
                  />
                </ReactCrop>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Hasil Potongan */}
            {processedBlob && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Pemotongan Berhasil!
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      Hasil Potongan Gambar
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
                    Unduh Gambar Terpotong
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">Dimensi Hasil Potongan</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {actualPixelCrop.w} × {actualPixelCrop.h} px
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
                    Pratinjau Hasil
                  </p>
                  <div className="relative max-h-96 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={processedUrl}
                      alt="Hasil Potongan"
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
