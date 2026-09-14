import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konversi HTML ke Gambar Online (PNG / SVG) | ImgTools",
  description: "Konversi kode HTML/JSX atau alamat URL halaman web menjadi gambar visual beresolusi tinggi tanpa Puppeteer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
