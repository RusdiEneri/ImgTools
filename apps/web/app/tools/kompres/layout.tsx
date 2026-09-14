import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kompres Gambar Online Gratis — Perkecil Ukuran Foto | ImgTools",
  description: "Kompres dan perkecil ukuran file gambar JPG, PNG, WEBP tanpa mengurangi kualitas visual secara signifikan. Cepat, aman, langsung di browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
