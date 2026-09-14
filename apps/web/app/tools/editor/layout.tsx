import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor Foto Online Lengkap — Teks, Stiker & Filter | ImgTools",
  description: "Edit gambar dengan kanvas interaktif: tambahkan teks, stiker emoji, bingkai, dan filter artistik langsung di browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
