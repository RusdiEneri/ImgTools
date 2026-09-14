import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potong Gambar (Crop) Online Bebas & Presisi | ImgTools",
  description: "Potong area foto dengan rasio aspek kustom atau standar secara presisi langsung di browser Anda.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
