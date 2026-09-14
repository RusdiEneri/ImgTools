import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konversi ke JPG Online (HEIC, TIFF, PNG, RAW) | ImgTools",
  description: "Ubah berbagai format gambar HEIC, TIFF, SVG, PNG, WEBP, dan RAW kamera menjadi JPG berkualitas tinggi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
