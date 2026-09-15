"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";
import { removeBg, wakeUpRembg, RembgModel } from "@/lib/ai";
import { download, formatBytes } from "@/lib/image";

const MODEL_OPTIONS: { id: RembgModel; label: string; desc: string; badge?: string }[] = [
  {
    id: "birefnet-portrait",
    label: "BiRefNet Portrait",
    desc: "Khusus potret manusia, wajah, dan rambut dengan detail potongan sangat halus.",
    badge: "Terbaik",
  },
  {
    id: "birefnet-general",
    label: "BiRefNet General",
    desc: "Optimal untuk produk e-commerce, kendaraan, hewan, dan objek umum.",
  },
  {
    id: "isnet-general-use",
    label: "IS-Net General Use",
    desc: "Model serbaguna untuk segmentasi foreground berbagai jenis foto.",
  },
  {
    id: "u2net_human_seg",
    label: "U2-Net Human Segmentation",
    desc: "Model U2-Net klasik untuk segmentasi tubuh dan siluet manusia.",
  },
];

export default function HapusBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Opsi Model & Pemrosesan
  const [selectedModel, setSelectedModel] = useState<RembgModel>("birefnet-portrait");
  const [alphaMatting, setAlphaMatting] = useState<boolean>(false);

  // Status Hugging Face Space
  const [spaceStatus, setSpaceStatus] = useState<"checking" | "ready" | "offline">("checking");

  useEffect(() => {
    wakeUpRembg()
      .then((ok) => setSpaceStatus(ok ? "ready" : "offline"))
      .catch(() => setSpaceStatus("offline"));
  }, []);

  // Terima berkas dari Dropzone
  const handleFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;
    const selected = incomingFiles[0];
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setOriginalUrl(url);
    setResultBlob(null);
    setResultUrl("");
    setErrorMessage("");
    setProgressText("");
  };

  // Proses hapus latar belakang
  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");
    setProgressText("Memulai pemrosesan...");

    try {
      const blob = await removeBg(file, {
        model: selectedModel,
        alphaMatting,
        onProgress: (msg) => setProgressText(msg),
      });

      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setSpaceStatus("ready");
    } catch (err: unknown) {
      const detail =
        err instanceof Error
          ? (err as { detail?: string }).detail || err.message
          : "Gagal memproses gambar.";
      setErrorMessage(detail);
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  // Unduh hasil PNG
  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    download(resultBlob, `${baseName}-transparan.png`);
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalUrl("");
    setResultBlob(null);
    setResultUrl("");
    setErrorMessage("");
    setProgressText("");
  };

  return (
    <ToolShell
      title="Hapus Latar Belakang AI"
      description="Hapus background gambar secara otomatis dengan presisi potongan piksel menggunakan ZeroGPU BiRefNet via Space Hugging Face ilhamdev/rembg."
      badge="BiRefNet AI"
    >
      <div className="space-y-6">
        {/* Status Koneksi Server Hugging Face Space */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm text-xs backdrop-blur-sm">
            {spaceStatus === "ready" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-slate-700">
                  Hugging Face Space: <strong className="text-emerald-700 font-semibold">ilhamdev/rembg</strong>
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  ZeroGPU Aktif
                </span>
              </>
            )}
            {spaceStatus === "checking" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="font-medium text-amber-700">Memeriksa koneksi Space ilhamdev/rembg...</span>
              </>
            )}
            {spaceStatus === "offline" && (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-800">
                  Space siap (akan wake-up otomatis saat memproses)
                </span>
              </>
            )}
          </div>

          {file && (
            <button
              type="button"
              onClick={handleReset}
              className="self-start sm:self-auto text-xs font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Ganti Gambar
            </button>
          )}
        </div>

        {/* Belum ada gambar */}
        {!file && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <Dropzone
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
              multiple={false}
              onFiles={handleFiles}
              title="Pilih gambar untuk dihapus latar belakangnya"
              subtitle="Mendukung JPG, PNG, WEBP, dan BMP. Diproses dengan ZeroGPU BiRefNet"
            />
          </div>
        )}

        {/* Sudah ada gambar */}
        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Preview & Compare */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-800">
                      {resultUrl ? "Perbandingan Hasil Transparan" : "Gambar Asli"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {file.name} ({formatBytes(file.size)})
                    </p>
                  </div>
                  {resultUrl && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Berhasil Dipotong
                    </span>
                  )}
                </div>

                {/* Jika sudah ada hasil, tampilkan ImageCompare */}
                {resultUrl ? (
                  <div
                    className="rounded-xl p-2"
                    style={{
                      backgroundImage: `repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)`,
                      backgroundSize: "20px 20px",
                    }}
                  >
                    <ImageCompare
                      beforeUrl={originalUrl}
                      afterUrl={resultUrl}
                      beforeLabel="Sebelum"
                      afterLabel="Transparan"
                    />
                  </div>
                ) : (
                  /* Preview gambar asli sebelum proses */
                  <div className="flex h-[360px] sm:h-[450px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 relative group">
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

            {/* Panel Kontrol & Aksi */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengaturan AI (ilhamdev/rembg)</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Pilih model yang paling sesuai dengan karakteristik subjek foto Anda.
                  </p>
                </div>

                {/* Pilihan Model */}
                <div className="space-y-2">
                  <label htmlFor="model-select" className="text-xs font-semibold text-slate-700 block">
                    Pilihan Model AI
                  </label>
                  <div className="relative">
                    <select
                      id="model-select"
                      disabled={isProcessing}
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as RembgModel)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-60"
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} {opt.badge ? `(${opt.badge})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {MODEL_OPTIONS.find((m) => m.id === selectedModel)?.desc}
                  </p>
                </div>

                {/* Alpha Matting Checkbox */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isProcessing}
                      checked={alphaMatting}
                      onChange={(e) => setAlphaMatting(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-800 block">
                        Alpha Matting (Edge Halus)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-normal block">
                        Menghaluskan helaian rambut tipis atau bulu hewan peliharaan di tepi potongan.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Pesan Kesalahan */}
                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <div className="flex gap-2">
                      <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-semibold">Gagal memproses:</span> {errorMessage}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tombol Eksekusi */}
                <div className="space-y-3 pt-1">
                  {!resultUrl ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRemoveBackground}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="truncate">{progressText || "Memotong Latar Belakang..."}</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                          <span>Hapus Latar Belakang</span>
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
                        <span>Unduh Gambar PNG Transparan</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveBackground}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Proses Ulang
                      </button>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 space-y-1">
                  <p>✓ Menghasilkan PNG dengan alpha mask transparan.</p>
                  <p>✓ Didukung ZeroGPU A10G Space: <span className="font-mono text-slate-500">ilhamdev/rembg</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
