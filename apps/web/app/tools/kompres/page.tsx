"use client";

import React, { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { compress, download, formatBytes } from "@/lib/image";
import { processQueue, downloadZip, BatchProgress } from "@/lib/batch";

interface CompressItem {
  id: string;
  file: File;
  status: "idle" | "processing" | "done" | "error";
  resultBlob: Blob | null;
  resultUrl: string;
  originalSize: number;
  newSize: number;
  errorMsg?: string;
}

export default function KompresPage() {
  const [items, setItems] = useState<CompressItem[]>([]);

  // Mode: "quality" (slider 10-100) atau "targetKB" (input KB)
  const [mode, setMode] = useState<"quality" | "targetKB">("quality");
  const [quality, setQuality] = useState<number>(75);
  const [targetKB, setTargetKB] = useState<number>(200);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  // Terima berkas dari Dropzone
  const handleFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    const newItems: CompressItem[] = incomingFiles.map((f, idx) => ({
      id: `${f.name}-${Date.now()}-${idx}`,
      file: f,
      status: "idle",
      resultBlob: null,
      resultUrl: "",
      originalSize: f.size,
      newSize: 0,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setProgress(null);
  };

  // Proses kompresi satu berkas
  const processOne = async (item: CompressItem): Promise<CompressItem> => {
    try {
      const outputFormat = item.file.type || "image/jpeg";
      let result: Blob;

      if (mode === "quality") {
        result = await compress(item.file, {
          quality,
          format: outputFormat,
        });
      } else {
        result = await compress(item.file, {
          maxKB: targetKB,
          format: outputFormat,
        });
      }

      const url = URL.createObjectURL(result);
      return {
        ...item,
        status: "done",
        resultBlob: result,
        resultUrl: url,
        newSize: result.size,
      };
    } catch (err: unknown) {
      return {
        ...item,
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Gagal mengompres gambar.",
      };
    }
  };

  // Proses semua berkas dalam antrean menggunakan processQueue
  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const updatedList = [...items];

      await processQueue(
        items,
        async (item, idx) => {
          // Update status item ke processing
          setItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, status: "processing" } : it))
          );

          const res = await processOne(item);
          updatedList[idx] = res;

          setItems((prev) =>
            prev.map((it, i) => (i === idx ? res : it))
          );

          return res;
        },
        {
          concurrency: 2,
          onProgress: (p) => setProgress(p),
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Unduh satu berkas
  const handleDownloadSingle = (item: CompressItem) => {
    if (!item.resultBlob) return;
    const dotIndex = item.file.name.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? item.file.name.substring(0, dotIndex) : item.file.name;
    const ext = dotIndex !== -1 ? item.file.name.substring(dotIndex) : ".jpg";
    download(item.resultBlob, `${baseName}-terkompres${ext}`);
  };

  // Unduh semua berkas siap pakai ZIP
  const handleDownloadZip = async () => {
    const readyItems = items.filter((i) => i.status === "done" && i.resultBlob);
    if (readyItems.length === 0) return;

    const filesToZip = readyItems.map((item) => {
      const dotIndex = item.file.name.lastIndexOf(".");
      const baseName = dotIndex !== -1 ? item.file.name.substring(0, dotIndex) : item.file.name;
      const ext = dotIndex !== -1 ? item.file.name.substring(dotIndex) : ".jpg";
      return {
        name: `${baseName}-terkompres${ext}`,
        blob: item.resultBlob as Blob,
      };
    });

    await downloadZip(filesToZip, "hasil-kompres.zip");
  };

  // Hapus item dari daftar
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
    setProgress(null);
  };

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <ToolShell
      title="Kompres Gambar"
      description="Kecilkan ukuran berkas gambar tanpa mengurangi kualitas secara signifikan. Mendukung pemrosesan batch banyak gambar sekaligus."
      badge="Di browser"
    >
      <div className="space-y-6">
        {/* Dropzone Multi-File */}
        <Dropzone
          multiple={true}
          accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
          onFiles={handleFiles}
          title="Tarik & letakkan gambar untuk dikompres"
          subtitle="Mendukung banyak gambar sekaligus (JPG, PNG, WEBP, BMP)"
        />

        {items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
            {/* Header Kontrol Antrean */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Antrean Kompresi ({items.length} Gambar)
                </h3>
                <p className="text-xs text-slate-500">
                  {doneCount} dari {items.length} gambar telah selesai diproses.
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
              </div>
            </div>

            {/* Pengaturan Kompresi */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Opsi Kualitas Kompresi</h4>
                  <p className="text-[11px] text-slate-500">Pilihan ini akan diterapkan ke semua berkas yang diproses.</p>
                </div>

                {/* Tab Pemilihan Mode */}
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMode("quality")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      mode === "quality"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Slider Kualitas (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("targetKB")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      mode === "targetKB"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Target Ukuran (KB)
                  </button>
                </div>
              </div>

              {mode === "quality" ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>Kualitas Kompresi:</span>
                    <span className="font-bold text-indigo-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>10% (Ukuran terkecil)</span>
                    <span>75% (Rekomendasi)</span>
                    <span>100% (Kualitas maksimal)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <label htmlFor="targetKB">Target Ukuran Maksimal:</label>
                    <span className="font-bold text-indigo-600">{targetKB} KB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="targetKB"
                      type="number"
                      min="5"
                      max="25000"
                      value={targetKB}
                      onChange={(e) => setTargetKB(Math.max(5, Number(e.target.value)))}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500">Kilobyte (KB) per berkas</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Global Bar */}
            {progress && (
              <div className="space-y-1.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="flex justify-between text-xs font-medium text-indigo-900">
                  <span>Memproses antrean batch...</span>
                  <span>{progress.current} / {progress.total} ({progress.percent}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Daftar Berkas */}
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto rounded-xl border border-slate-200">
              {items.map((item, idx) => {
                const saved = item.originalSize > 0 && item.newSize > 0
                  ? Math.round(((item.originalSize - item.newSize) / item.originalSize) * 100)
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Asli: {formatBytes(item.originalSize)}</span>
                          {item.status === "done" && (
                            <>
                              <span>→</span>
                              <span className="font-semibold text-emerald-700">
                                {formatBytes(item.newSize)}
                              </span>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-bold text-emerald-800 text-[10px]">
                                Hemat {saved}%
                              </span>
                            </>
                          )}
                          {item.status === "error" && (
                            <span className="text-rose-600">{item.errorMsg}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {item.status === "idle" && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Menunggu
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 animate-pulse">
                          Memproses...
                        </span>
                      )}
                      {item.status === "done" && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Unduh</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Hapus berkas"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Aksi Utama */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing || items.length === 0}
                onClick={handleProcessAll}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Memproses Antrean...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>Proses Semua ({items.length} Gambar)</span>
                  </>
                )}
              </button>

              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh Semua (ZIP)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
