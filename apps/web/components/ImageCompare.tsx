"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface ImageCompareProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  initialSliderPosition?: number; // 0 to 100
}

export default function ImageCompare({
  beforeUrl,
  afterUrl,
  beforeLabel = "Sebelum",
  afterLabel = "Sesudah",
  className = "",
  initialSliderPosition = 50,
}: ImageCompareProps) {
  const [sliderPos, setSliderPos] = useState<number>(initialSliderPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches.length > 0) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      updatePosition(e.touches[0].clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Container Perbandingan */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="group relative h-[360px] sm:h-[480px] w-full cursor-ew-resize overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner select-none"
      >
        {/* Gambar Sesudah (Lapisan Bawah/Full) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={afterLabel}
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          draggable={false}
        />

        {/* Gambar Sebelum (Lapisan Atas terpotong dengan clipPath) */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={beforeLabel}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Garis Pembatas Vertikal Slider */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Tombol Handle Tengah */}
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-2 ring-indigo-500/80 transition group-hover:scale-110">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
            </svg>
          </div>
        </div>

        {/* Label Sebelum (Kiri) */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <span className="inline-flex items-center rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {beforeLabel}
          </span>
        </div>

        {/* Label Sesudah (Kanan) */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <span className="inline-flex items-center rounded-lg bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm shadow-sm">
            {afterLabel}
          </span>
        </div>
      </div>

      {/* Kontrol Rentang Slider (Aksesibilitas & Penyesuaian Presisi) */}
      <div className="flex items-center justify-between gap-4 px-1">
        <span className="text-xs font-medium text-slate-500">{beforeLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="h-1.5 w-full max-w-xs cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 focus:outline-none"
          aria-label="Geser posisi perbandingan gambar"
        />
        <span className="text-xs font-medium text-indigo-600">{afterLabel}</span>
      </div>
    </div>
  );
}
