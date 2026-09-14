"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { fileToBitmap, convert, download, formatBytes } from "@/lib/image";
import { encodeGif } from "@/lib/gif";
import { processQueue, downloadZip } from "@/lib/batch";

interface FrameItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface ConvertBatchItem {
  id: string;
  file: File;
  status: "idle" | "processing" | "done" | "error";
  resultBlob?: Blob;
  resultUrl?: string;
  error?: string;
}

export default function KonversiDariJpgPage() {
  // Mode: "convert" (JPG ke PNG/GIF statis/WebP) atau "gif" (Kumpulan JPG ke GIF Animasi)
  const [toolMode, setToolMode] = useState<"convert" | "gif">("gif");

  // State Mode 1: Konversi Format (Multi-File Batch)
  const [convertItems, setConvertItems] = useState<ConvertBatchItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<"image/png" | "image/gif" | "image/webp">("image/png");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [convertGlobalProgress, setConvertGlobalProgress] = useState<number>(0);

  // State Mode 2: GIF Animasi
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [frameDelay, setFrameDelay] = useState<number>(500); // 500ms default
  const [outputWidth, setOutputWidth] = useState<number>(480); // 480px default
  const [isEncodingGif, setIsEncodingGif] = useState(false);
  const [gifProgressText, setGifProgressText] = useState<string>("");
  const [animatedGifBlob, setAnimatedGifBlob] = useState<Blob | null>(null);
  const [animatedGifUrl, setAnimatedGifUrl] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");

  // Bersihkan URL objek
  useEffect(() => {
    return () => {
      convertItems.forEach((it) => {
        if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
      });
      if (animatedGifUrl) URL.revokeObjectURL(animatedGifUrl);
      frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [convertItems, animatedGifUrl, frames]);

  // Handler penambahan berkas untuk Konversi Format
  const handleAddConvertFiles = (files: File[]) => {
    if (files.length === 0) return;
    const newItems: ConvertBatchItem[] = files.map((file, idx) => ({
      id: `${file.name}-${Date.now()}-${idx}`,
      file,
      status: "idle",
    }));
    setConvertItems((prev) => [...prev, ...newItems]);
    setErrorMsg("");
  };

  // Handler penambahan berkas untuk GIF Animasi
  const handleAddFrames = (files: File[]) => {
    if (files.length === 0) return;

    const newFrames: FrameItem[] = files.map((file, idx) => ({
      id: `${file.name}-${Date.now()}-${idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setFrames((prev) => [...prev, ...newFrames]);
    setAnimatedGifBlob(null);
    if (animatedGifUrl) {
      URL.revokeObjectURL(animatedGifUrl);
      setAnimatedGifUrl("");
    }
    setErrorMsg("");
  };

  // Reorder frames
  const moveFrameUp = (index: number) => {
    if (index <= 0) return;
    setFrames((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveFrameDown = (index: number) => {
    setFrames((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Proses Konversi Format Massal (Multi-File via processQueue)
  const handleProcessBatch = async () => {
    const pending = convertItems.filter((i) => i.status !== "done");
    if (pending.length === 0) return;

    setIsProcessingBatch(true);
    setErrorMsg("");
    setConvertGlobalProgress(0);

    try {
      await processQueue(
        convertItems,
        async (item, idx) => {
          if (item.status === "done" && item.resultBlob) return item;

          setConvertItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, status: "processing" } : it))
          );

          try {
            let blob: Blob;
            if (targetFormat === "image/png") {
              blob = await convert(item.file, "image/png");
            } else if (targetFormat === "image/webp") {
              blob = await convert(item.file, "image/webp");
            } else {
              // GIF 1 Frame
              const bmp = await fileToBitmap(item.file);
              blob = await encodeGif(
                [{ bitmap: bmp, delay: 1000 }],
                Math.min(bmp.width, 1080)
              );
              bmp.close();
            }

            const resUrl = URL.createObjectURL(blob);
            const doneItem: ConvertBatchItem = {
              ...item,
              status: "done",
              resultBlob: blob,
              resultUrl: resUrl,
            };

            setConvertItems((prev) =>
              prev.map((it, i) => (i === idx ? doneItem : it))
            );

            return doneItem;
          } catch (err: unknown) {
            const errItem: ConvertBatchItem = {
              ...item,
              status: "error",
              error: err instanceof Error ? err.message : "Gagal konversi",
            };
            setConvertItems((prev) =>
              prev.map((it, i) => (i === idx ? errItem : it))
            );
            return errItem;
          }
        },
        {
          concurrency: 2,
          onProgress: (p) => setConvertGlobalProgress(p.percent),
        }
      );
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Unduh satu berkas hasil konversi
  const handleDownloadSingleConvert = (item: ConvertBatchItem) => {
    if (!item.resultBlob) return;
    const dot = item.file.name.lastIndexOf(".");
    const base = dot !== -1 ? item.file.name.substring(0, dot) : item.file.name;
    const ext = targetFormat === "image/png" ? ".png" : targetFormat === "image/gif" ? ".gif" : ".webp";
    download(item.resultBlob, `${base}${ext}`);
  };

  // Unduh semua berkas hasil konversi dalam format ZIP
  const handleDownloadConvertZip = async () => {
    const readyItems = convertItems.filter((i) => i.status === "done" && i.resultBlob);
    if (readyItems.length === 0) return;

    const ext = targetFormat === "image/png" ? ".png" : targetFormat === "image/gif" ? ".gif" : ".webp";
    const filesToZip = readyItems.map((item) => {
      const dot = item.file.name.lastIndexOf(".");
      const base = dot !== -1 ? item.file.name.substring(0, dot) : item.file.name;
      return {
        name: `${base}${ext}`,
        blob: item.resultBlob as Blob,
      };
    });

    await downloadZip(filesToZip, `hasil-konversi-dari-jpg.zip`);
  };

  const handleRemoveConvertItem = (id: string) => {
    setConvertItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleResetConvert = () => {
    convertItems.forEach((it) => {
      if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
    });
    setConvertItems([]);
    setConvertGlobalProgress(0);
  };

  // Proses Pembuatan GIF Animasi dari Kumpulan JPG
  const handleBuildAnimatedGif = async () => {
    if (frames.length === 0) return;
    setIsEncodingGif(true);
    setErrorMsg("");
    setGifProgressText("Membaca frame gambar...");

    try {
      // Decode semua frame ke ImageBitmap
      const decodedFrames: { bitmap: ImageBitmap; delay: number }[] = [];

      for (let i = 0; i < frames.length; i++) {
        setGifProgressText(`Mempersiapkan frame ${i + 1} dari ${frames.length}...`);
        const bmp = await fileToBitmap(frames[i].file);
        decodedFrames.push({
          bitmap: bmp,
          delay: frameDelay,
        });
      }

      setGifProgressText("Mengodekan GIF animasi (kuantisasi palet warna)...");
      const gifBlob = await encodeGif(decodedFrames, outputWidth);

      // Tutup semua bitmap
      decodedFrames.forEach((df) => df.bitmap.close());

      setAnimatedGifBlob(gifBlob);
      if (animatedGifUrl) URL.revokeObjectURL(animatedGifUrl);
      setAnimatedGifUrl(URL.createObjectURL(gifBlob));
      setGifProgressText("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal membuat GIF animasi.");
    } finally {
      setIsEncodingGif(false);
      setGifProgressText("");
    }
  };

  return (
    <ToolShell
      title="Konversi dari JPG & Pembuat GIF Animasi"
      description="Ubah foto JPG ke format PNG atau GIF statis, atau gabungkan beberapa foto JPG menjadi GIF animasi bergerak."
      badge="Di browser"
    >
      <div className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 max-w-md">
          <button
            type="button"
            onClick={() => setToolMode("gif")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              toolMode === "gif"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎬 Buat GIF Animasi (Multi-JPG)
          </button>
          <button
            type="button"
            onClick={() => setToolMode("convert")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              toolMode === "convert"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔄 Konversi Format (JPG → PNG/GIF)
          </button>
        </div>

        {/* MODE 1: PEMBUAT GIF ANIMASI DARI BEBERAPA JPG */}
        {toolMode === "gif" && (
          <div className="space-y-6">
            {/* Dropzone untuk memilih frame */}
            <Dropzone
              multiple={true}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onFiles={handleAddFrames}
              title="Pilih beberapa berkas JPG untuk dijadikan GIF animasi"
              subtitle="Urutkan frame, atur kecepatan, dan buat GIF bergerak langsung di browser"
            />

            {frames.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
                {/* Header Frame Manager */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Urutan Frame GIF ({frames.length} Frame)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gunakan tombol ▲ dan ▼ untuk mengatur urutan pergerakan animasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                      setFrames([]);
                      setAnimatedGifBlob(null);
                    }}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Hapus Semua Frame
                  </button>
                </div>

                {/* List Frame dengan Thumbnail & Tombol Urutan */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {frames.map((frame, idx) => (
                    <div
                      key={frame.id}
                      className="group relative rounded-xl border border-slate-200 bg-slate-50 p-2 flex flex-col items-center gap-1.5"
                    >
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white z-10">
                        #{idx + 1}
                      </span>

                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frame.previewUrl}
                          alt={frame.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <p className="truncate text-[10px] font-medium text-slate-600 w-full text-center" title={frame.file.name}>
                        {frame.file.name}
                      </p>

                      {/* Tombol Reorder */}
                      <div className="flex items-center gap-1 w-full justify-center pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveFrameUp(idx)}
                          className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                          title="Geser ke Kiri/Atas"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={idx === frames.length - 1}
                          onClick={() => moveFrameDown(idx)}
                          className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                          title="Geser ke Kanan/Bawah"
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(frame.id)}
                          className="h-6 w-6 rounded bg-rose-50 border border-rose-200 flex items-center justify-center text-[10px] text-rose-600 hover:bg-rose-100"
                          title="Hapus Frame"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kontrol Pengaturan GIF */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  {/* Slider Delay per Frame */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Kecepatan (Delay per Frame)</span>
                      <span className="text-indigo-600 font-bold">{frameDelay} ms ({Math.round(1000 / frameDelay)} FPS)</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1500"
                      step="50"
                      value={frameDelay}
                      onChange={(e) => setFrameDelay(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>100ms (Cepat)</span>
                      <span>500ms (Standar)</span>
                      <span>1500ms (Lambat)</span>
                    </div>
                  </div>

                  {/* Lebar Output */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Lebar Gambar GIF
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[320, 480, 600, 800].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setOutputWidth(w)}
                          className={`rounded-lg py-1.5 text-xs font-medium border transition ${
                            outputWidth === w
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Loop: Terus menerus (*Infinite Loop*)
                    </p>
                  </div>
                </div>

                {/* Tombol Buat GIF */}
                <div>
                  <button
                    type="button"
                    disabled={isEncodingGif || frames.length < 2}
                    onClick={handleBuildAnimatedGif}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {isEncodingGif ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{gifProgressText || "Membuat GIF Animasi..."}</span>
                      </>
                    ) : (
                      <>
                        <span>Buat GIF Animasi ({frames.length} Frame)</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                  {frames.length < 2 && (
                    <span className="ml-3 text-xs text-slate-400">
                      Tambahkan minimal 2 gambar untuk membuat animasi.
                    </span>
                  )}
                </div>

                {/* Pratinjau GIF Bergerak Live & Tombol Unduh */}
                {animatedGifBlob && animatedGifUrl && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          ✓ GIF Animasi Berhasil Dibuat
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-slate-900">
                          Pratinjau Animasi Bergerak
                        </h4>
                        <p className="text-xs text-slate-500">
                          Ukuran Berkas: {formatBytes(animatedGifBlob.size)} • {frames.length} Frame • Delay {frameDelay}ms
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => download(animatedGifBlob, `animasi-${Date.now()}.gif`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Unduh GIF Animasi
                      </button>
                    </div>

                    <div className="flex justify-center rounded-xl bg-slate-950 p-4 max-h-96 overflow-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={animatedGifUrl}
                        alt="GIF Animasi Hasil"
                        className="max-h-80 max-w-full object-contain rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: KONVERSI FORMAT (MULTI-FILE BATCH) */}
        {toolMode === "convert" && (
          <div className="space-y-6">
            {convertItems.length === 0 ? (
              <Dropzone
                multiple={true}
                accept="image/jpeg,image/jpg"
                onFiles={handleAddConvertFiles}
                title="Pilih foto JPG untuk diubah formatnya (Mendukung Multi-Berkas)"
                subtitle="Konversi cepat ke format PNG, GIF statis, atau WebP"
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
                {/* Header & Format Chooser */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Daftar Berkas JPG ({convertItems.length} Foto)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih format target di bawah ini, lalu klik &ldquo;Proses Semua&rdquo;.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Tambah Berkas
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleAddConvertFiles(Array.from(e.target.files));
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isProcessingBatch}
                      onClick={handleResetConvert}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                {/* Format Target Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Format Target:</span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      disabled={isProcessingBatch}
                      onClick={() => setTargetFormat("image/png")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        targetFormat === "image/png"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      PNG (.png)
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingBatch}
                      onClick={() => setTargetFormat("image/webp")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        targetFormat === "image/webp"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      WebP (.webp)
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingBatch}
                      onClick={() => setTargetFormat("image/gif")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        targetFormat === "image/gif"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      GIF 1 Frame (.gif)
                    </button>
                  </div>
                </div>

                {/* Progress Bar Global */}
                {isProcessingBatch && (
                  <div className="space-y-1.5 rounded-xl bg-indigo-50/50 p-4 border border-indigo-100">
                    <div className="flex items-center justify-between text-xs font-medium text-indigo-900">
                      <span>Memproses antrean konversi...</span>
                      <span>{Math.round(convertGlobalProgress)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${convertGlobalProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* List Berkas */}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {convertItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 bg-white hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 max-w-xs sm:max-w-md">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Ukuran Asal: {formatBytes(item.file.size)}
                            {item.resultBlob && (
                              <span className="text-emerald-600 font-medium ml-2">
                                → {formatBytes(item.resultBlob.size)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {item.status === "idle" && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            Menunggu
                          </span>
                        )}
                        {item.status === "processing" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 animate-pulse">
                            Memproses...
                          </span>
                        )}
                        {item.status === "done" && (
                          <>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              ✓ Selesai
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleConvert(item)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              Unduh
                            </button>
                          </>
                        )}
                        {item.status === "error" && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            {item.error || "Gagal"}
                          </span>
                        )}

                        {!isProcessingBatch && (
                          <button
                            type="button"
                            onClick={() => handleRemoveConvertItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                            title="Hapus berkas"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Bar Bawah */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingBatch}
                    onClick={handleProcessBatch}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {isProcessingBatch ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Memproses Semua...</span>
                      </>
                    ) : (
                      <>
                        <span>Proses Semua ({convertItems.length} Foto)</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>

                  {convertItems.some((i) => i.status === "done" && i.resultBlob) && (
                    <button
                      type="button"
                      onClick={handleDownloadConvertZip}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Unduh Semua (ZIP)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
