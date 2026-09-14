import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tambahkan Tanda Air (Watermark) Teks & Logo ke Gambar | ImgTools",
  description: "Lindungi hak cipta foto Anda dengan cap watermark teks kustom atau logo transparan secara batch.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
