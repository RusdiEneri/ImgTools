import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Putar Gambar Online 90°, 180°, 270° & Flip | ImgTools",
  description: "Putar arah orientasi gambar atau balik secara horizontal dan vertikal dengan cepat dan gratis.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
