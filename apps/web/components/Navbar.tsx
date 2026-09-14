"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { ToolIcon } from "@/components/ToolIcons";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Teks ImgTools */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-emerald-500 shadow-sm transition group-hover:scale-105">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Img<span className="text-indigo-600">Tools</span>
              </span>
            </div>
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Beranda
            </Link>

            {/* Dropdown 13 Tool */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
                aria-expanded={dropdownOpen}
              >
                <span>Semua Alat</span>
                <svg
                  className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-[580px] origin-top-left rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-slate-900/5 transition focus:outline-none">
                  <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      13 Utilitas Gambar
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">
                      Cepat, Aman & Privat
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.id}
                        href={`/tools/${tool.slug}`}
                        onClick={() => setDropdownOpen(false)}
                        className="group flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-indigo-50/70"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                          <ToolIcon name={tool.icon} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-800 transition group-hover:text-indigo-950">
                              {tool.name}
                            </p>
                            {tool.badge === "Baru!" ? (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Baru!
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                Di browser
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-1 text-xs text-slate-500">
                            {tool.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick links */}
            <Link
              href="/tools/kompres"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Kompres
            </Link>
            <Link
              href="/tools/ubah-ukuran"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Ubah Ukuran
            </Link>
            <Link
              href="/tools/hapus-latar-belakang"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <span>Hapus Latar</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                AI
              </span>
            </Link>
          </nav>
        </div>

        {/* Action Kanan Desktop */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Link
            href="/tools/tingkatkan-gambar"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-indigo-500/20 active:scale-95"
          >
            <ToolIcon name="upscale" className="h-4 w-4" />
            <span>Coba AI Enhance</span>
          </Link>
        </div>

        {/* Tombol Mobile Toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Buka menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 md:hidden">
          <div className="space-y-1 pb-3 pt-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-100"
            >
              Beranda
            </Link>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Daftar 13 Alat
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1 max-h-[360px] overflow-y-auto">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600"
                >
                  <div className="flex items-center gap-2.5">
                    <ToolIcon name={tool.icon} className="h-4 w-4 text-slate-500" />
                    <span>{tool.name}</span>
                  </div>
                  {tool.badge === "Baru!" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Baru!
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Di browser
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
