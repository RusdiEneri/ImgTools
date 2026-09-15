export interface ToolItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "edit" | "convert" | "ai";
  badge: "Baru!" | "Di browser";
  icon: string; // SVG icon identifier
}

export const TOOLS: ToolItem[] = [
  {
    id: "kompres",
    slug: "kompres",
    name: "Kompres",
    description: "Kecilkan ukuran file gambar tanpa mengurangi kualitas secara signifikan.",
    category: "edit",
    badge: "Di browser",
    icon: "compress",
  },
  {
    id: "ubah-ukuran",
    slug: "ubah-ukuran",
    name: "Ubah Ukuran",
    description: "Ubah dimensi lebar dan tinggi piksel gambar sesuai kebutuhan.",
    category: "edit",
    badge: "Di browser",
    icon: "resize",
  },
  {
    id: "potong",
    slug: "potong",
    name: "Potong",
    description: "Potong area gambar dengan menentukan koordinat atau rasio aspek.",
    category: "edit",
    badge: "Di browser",
    icon: "crop",
  },
  {
    id: "konversi-ke-jpg",
    slug: "konversi-ke-jpg",
    name: "Konversi ke JPG",
    description: "Ubah gambar PNG, WEBP, GIF, atau SVG menjadi format JPG berkualitas.",
    category: "convert",
    badge: "Di browser",
    icon: "to-jpg",
  },
  {
    id: "konversi-dari-jpg",
    slug: "konversi-dari-jpg",
    name: "Konversi dari JPG",
    description: "Ubah gambar JPG menjadi PNG, WEBP, atau format lainnya secara instan.",
    category: "convert",
    badge: "Di browser",
    icon: "from-jpg",
  },
  {
    id: "editor-foto",
    slug: "editor-foto",
    name: "Editor Foto",
    description: "Sesuaikan kecerahan, kontras, saturasi, dan efek filter pada gambar.",
    category: "edit",
    badge: "Di browser",
    icon: "edit",
  },
  {
    id: "tingkatkan-gambar",
    slug: "tingkatkan-gambar",
    name: "Tingkatkan Gambar",
    description: "Perjelas dan tingkatkan resolusi gambar buram menggunakan kecerdasan buatan.",
    category: "ai",
    badge: "Baru!",
    icon: "upscale",
  },
  {
    id: "hapus-latar-belakang",
    slug: "hapus-latar-belakang",
    name: "Hapus Latar Belakang",
    description: "Hapus latar belakang foto secara otomatis dengan presisi potongan AI.",
    category: "ai",
    badge: "Baru!",
    icon: "remove-bg",
  },
  {
    id: "tanda-air",
    slug: "tanda-air",
    name: "Tanda Air",
    description: "Tambahkan teks atau logo cap watermark untuk melindungi hak cipta karya Anda.",
    category: "edit",
    badge: "Di browser",
    icon: "watermark",
  },
  {
    id: "pembuat-meme",
    slug: "pembuat-meme",
    name: "Pembuat Meme",
    description: "Buat meme kreatif dengan teks atas dan bawah secara mudah dan cepat.",
    category: "edit",
    badge: "Di browser",
    icon: "meme",
  },
  {
    id: "putar",
    slug: "putar",
    name: "Putar",
    description: "Putar orientasi orientasi gambar 90°, 180°, atau 270° sesuai arah yang diinginkan.",
    category: "edit",
    badge: "Di browser",
    icon: "rotate",
  },
  {
    id: "html-ke-gambar",
    slug: "html-ke-gambar",
    name: "HTML ke Gambar",
    description: "Konversi kode HTML atau cuplikan web menjadi format gambar beresolusi tinggi.",
    category: "convert",
    badge: "Di browser",
    icon: "html",
  },
  {
    id: "buramkan-wajah",
    slug: "buramkan-wajah",
    name: "Buramkan Wajah",
    description: "Deteksi dan buramkan wajah subjek foto secara otomatis untuk menjaga privasi.",
    category: "ai",
    badge: "Baru!",
    icon: "blur-face",
  },
];
