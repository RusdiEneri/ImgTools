"use client";

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";

export interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeFormatted: string;
}

interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  title?: string;
  subtitle?: string;
}

export default function Dropzone({
  accept = "image/*",
  multiple = true,
  onFiles,
  title = "Tarik & letakkan gambar di sini",
  subtitle = "atau klik untuk memilih berkas dari perangkat Anda",
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format bytes to readable size
  function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  // Handle addition of new files
  function processFiles(incomingFiles: FileList | File[]) {
    const validFiles: File[] = [];
    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      if (accept === "image/*" && !file.type.startsWith("image/")) {
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newItems: FileItem[] = validFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      sizeFormatted: formatBytes(file.size),
    }));

    setSelectedFiles((prev) => {
      const nextList = multiple ? [...prev, ...newItems] : newItems;
      if (!multiple) {
        // Cleanup old preview URLs if replacing single file
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      }
      if (onFiles) {
        onFiles(nextList.map((item) => item.file));
      }
      return nextList;
    });
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [selectedFiles]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => {
      const fileToRemove = prev.find((item) => item.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      const nextList = prev.filter((item) => item.id !== id);
      if (onFiles) {
        onFiles(nextList.map((item) => item.file));
      }
      return nextList;
    });
  };

  const clearAllFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
    if (onFiles) {
      onFiles([]);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Drop Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
          isDragOver
            ? "border-indigo-600 bg-indigo-50/70 scale-[1.01]"
            : "border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Icon */}
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition group-hover:scale-110 ${
            isDragOver
              ? "bg-indigo-600 text-white shadow-indigo-200"
              : "bg-white text-indigo-600 border border-slate-200"
          }`}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {/* Text */}
        <h3 className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          {subtitle}
        </p>

        {/* Button pill */}
        <div className="mt-5">
          <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Pilih Berkas Gambar
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Mendukung format PNG, JPG, WEBP, SVG {multiple ? "• Multi-file didukung" : ""}
        </p>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Berkas Terpilih
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {selectedFiles.length}
              </span>
            </div>
            {selectedFiles.length > 1 && (
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-xs font-medium text-rose-600 transition hover:text-rose-700 hover:underline"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className="group relative flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 transition hover:bg-slate-50 hover:border-slate-300"
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.sizeFormatted}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => removeFile(item.id, e)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-rose-600"
                  aria-label={`Hapus ${item.file.name}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
