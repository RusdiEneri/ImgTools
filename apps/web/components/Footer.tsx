import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Info Brand */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Img<span className="text-indigo-600">Tools</span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Platform utilitas pemrosesan gambar profesional berbasis peramban. Seluruh proses pengeditan client-side berjalan cepat tanpa menyimpan data pribadi Anda.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Aman & Menjaga Privasi Berkas
            </div>
          </div>

          {/* Kolom Alat Populer */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Alat Populer
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tools/kompres" className="transition hover:text-indigo-600">
                  Kompres Gambar
                </Link>
              </li>
              <li>
                <Link href="/tools/ubah-ukuran" className="transition hover:text-indigo-600">
                  Ubah Ukuran
                </Link>
              </li>
              <li>
                <Link href="/tools/potong" className="transition hover:text-indigo-600">
                  Potong Foto
                </Link>
              </li>
              <li>
                <Link href="/tools/konversi-ke-jpg" className="transition hover:text-indigo-600">
                  Konversi ke JPG
                </Link>
              </li>
              <li>
                <Link href="/tools/tanda-air" className="transition hover:text-indigo-600">
                  Tanda Air
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom Alat AI & Baru */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Kecerdasan Buatan (AI)
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tools/tingkatkan-gambar" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Tingkatkan Gambar</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/hapus-latar-belakang" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Hapus Latar Belakang</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/buramkan-wajah" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Buramkan Wajah</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/editor-foto" className="transition hover:text-indigo-600">
                  Editor Foto Lengkap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ImgTools. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-6">
            <span>Privasi & Keamanan</span>
            <span>Syarat Penggunaan</span>
            <span>Kontak Dukungan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
