"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";
import AiStatus from "@/components/AiStatus";
import { faceBlur, wakeUp } from "@/lib/ai";
import { download, formatBytes } from "@/lib/image";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function BuramkanWajahPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [origDim, setOrigDim] = useState<{ w: number; h: number } | null>(null);

  // Pengaturan Blur
  const [mode, setMode] = useState<"gaussian" | "pixelate">("gaussian");
  const [blur, setBlur] = useState<number>(25);

  // Kotak Manual (koordinat skala gambar asli)
  const [manualBoxes, setManualBoxes] = useState<Box[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<Box | null>(null);

  // Hasil
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    wakeUp();
  }, []);

  const handleFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;
    const selected = incomingFiles[0];
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setOriginalUrl(url);

    const img = new Image();
    img.onload = () => {
      setOrigDim({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;

    setManualBoxes([]);
    setResultBlob(null);
    setResultUrl("");
    setErrorMessage("");
  };

  // Redraw kotak manual di atas canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const imgEl = previewImgRef.current;
    if (!canvas || !imgEl || !origDim) return;

    const rect = imgEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = rect.width / origDim.w;
    const scaleY = rect.height / origDim.h;

    // Gambar kotak manual tersimpan
    ctx.lineWidth = 2;
    manualBoxes.forEach((b, idx) => {
      const bx = b.x * scaleX;
      const by = b.y * scaleY;
      const bw = b.w * scaleX;
      const bh = b.h * scaleY;

      ctx.strokeStyle = "#ef4444"; // merah
      ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillRect(bx, by, bw, bh);

      // Label nomor
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`#${idx + 1}`, bx + 4, by + 14);
    });

    // Gambar kotak yang sedang digambar
    if (currentBox) {
      const bx = currentBox.x * scaleX;
      const by = currentBox.y * scaleY;
      const bw = currentBox.w * scaleX;
      const bh = currentBox.h * scaleY;

      ctx.strokeStyle = "#6366f1"; // indigo
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }
  }, [manualBoxes, currentBox, origDim]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle Menggambar Kotak Manual
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !origDim || !previewImgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = origDim.w / rect.width;
    const scaleY = origDim.h / rect.height;

    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDrawStart({ x: clientX, y: clientY });
    setCurrentBox({ x: clientX, y: clientY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current || !origDim) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = origDim.w / rect.width;
    const scaleY = origDim.h / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);

    // Minimal 5x5 px
    if (currentBox.w > 5 && currentBox.h > 5) {
      setManualBoxes((prev) => [
        ...prev,
        {
          x: Math.round(currentBox.x),
          y: Math.round(currentBox.y),
          w: Math.round(currentBox.w),
          h: Math.round(currentBox.h),
        },
      ]);
    }
    setCurrentBox(null);
    setDrawStart(null);
  };

  // Jalankan Face Blur
  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const boxesPayload =
        manualBoxes.length > 0 ? manualBoxes.map((b) => [b.x, b.y, b.w, b.h]) : undefined;

      const blob = await faceBlur(file, blur, mode, boxesPayload);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? (err as { detail?: string }).detail || err.message : "Gagal memproses blur wajah.";
      setErrorMessage(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    download(resultBlob, `${baseName}-blur.png`);
  };

  const handleReset = () => {
    setFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalUrl("");
    setOrigDim(null);
    setManualBoxes([]);
    setResultBlob(null);
    setResultUrl("");
    setErrorMessage("");
  };

  return (
    <ToolShell
      title="Buramkan Wajah & Sensor Area (AI)"
      description="Sensor wajah secara otomatis dengan deteksi YOLOv8 Face atau tandai area manual (pelat nomor, data pribadi) dengan gaya Gaussian Blur atau Pixelate."
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
              title="Pilih foto untuk disensor wajah atau area sensitifnya"
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
                      {resultUrl ? "Hasil Sensor Perbandingan" : "Tandai Area atau Biarkan AI Mendeteksi"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {file.name} ({formatBytes(file.size)})
                    </p>
                  </div>

                  {!resultUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {manualBoxes.length} kotak manual
                      </span>
                      {manualBoxes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setManualBoxes([])}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                        >
                          Hapus Kotak
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {resultUrl ? (
                  <ImageCompare
                    beforeUrl={originalUrl}
                    afterUrl={resultUrl}
                    beforeLabel="Asli"
                    afterLabel="Disensor"
                  />
                ) : (
                  <div className="relative flex h-[360px] sm:h-[460px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={previewImgRef}
                      src={originalUrl}
                      alt="Pratinjau Asli"
                      className="max-h-full max-w-full object-contain pointer-events-none"
                      onLoad={redrawCanvas}
                    />
                    {/* Kanvas interaktif untuk drag-box */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className="absolute inset-0 h-full w-full cursor-crosshair"
                    />
                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm pointer-events-none">
                      Tip: Klik & tarik pada gambar untuk menandai area sensor tambahan manual
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Kontrol Pengaturan */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengaturan Sensor</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Pilih gaya pengaburan dan atur intensitas penyamaran area.
                  </p>
                </div>

                {/* Mode Pilihan: Gaussian vs Pixelate */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Gaya Sensor</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("gaussian")}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        mode === "gaussian"
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Gaussian Blur
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("pixelate")}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        mode === "pixelate"
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Pixelate (Mosaik)
                    </button>
                  </div>
                </div>

                {/* Slider Kekuatan Blur / Ukuran Pixel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700">
                      {mode === "gaussian" ? "Radius Blur" : "Ukuran Pixel Mosaik"}
                    </label>
                    <span className="font-mono font-bold text-indigo-600">{blur} px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>10 px</span>
                    <span>25 px (Normal)</span>
                    <span>60 px</span>
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
                      onClick={handleProcess}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Mendeteksi & Memburamkan...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Deteksi Otomatis & Buramkan</span>
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
                        <span>Unduh Gambar Disensor</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Proses Ulang
                      </button>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-400 space-y-1">
                  <p>✓ Model YOLOv8 Face mendeteksi sudut wajah secara akurat.</p>
                  <p>✓ Mendukung kombinasi deteksi AI otomatis + area manual.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
