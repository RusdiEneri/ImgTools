"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ImageCompare from "@/components/ImageCompare";
import AiStatus from "@/components/AiStatus";
import { removeBg, wakeUp } from "@/lib/ai";
import { download, formatBytes } from "@/lib/image";

export default function HapusBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Panggil wakeUp saat pertama kali halaman dibuka
  useEffect(() => {
    wakeUp();
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
  };

  // Proses hapus latar belakang
  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const blob = await removeBg(file);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? (err as { detail?: string }).detail || err.message : "Gagal memproses gambar.";
      setErrorMessage(detail);
    } finally {
      setIsProcessing(false);
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
  };

  return (
    <ToolShell
      title="Hapus Latar Belakang AI"
      description="Hapus background gambar secara otomatis dengan presisi potongan piksel menggunakan model AI RMBG-1.4."
      badge="Baru!"
    >
      <div className="space-y-6">
        {/* Status Koneksi Server AI */}
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

        {/* Belum ada gambar */}
        {!file && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <Dropzone
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
              multiple={false}
              onFiles={handleFiles}
              title="Pilih gambar untuk dihapus latar belakangnya"
              subtitle="Mendukung JPG, PNG, WEBP, dan BMP hingga 25 MB"
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
                      {resultUrl ? "Perbandingan Hasil" : "Gambar Asli"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {file.name} ({formatBytes(file.size)})
                    </p>
                  </div>
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

            {/* Panel Kontrol & Aksi */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengaturan AI</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Model memproses subjek secara cerdas dan menghasilkan format PNG transparan berkualitas tinggi.
                  </p>
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
                <div className="space-y-3 pt-2">
                  {!resultUrl ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRemoveBackground}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Memotong Latar Belakang...</span>
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

                <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-400 space-y-1">
                  <p>✓ Menghasilkan PNG dengan alpha mask transparan.</p>
                  <p>✓ Resolusi dimensi gambar dipertahankan sesuai aslinya.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
