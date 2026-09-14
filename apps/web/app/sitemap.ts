import { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://imgtools.app";
  const now = new Date();

  // Route Beranda
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Tambahkan semua route tool dari daftar TOOLS
  TOOLS.forEach((tool) => {
    routes.push({
      url: `${siteUrl}/tools/${tool.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // Tambahkan rute alias / fitur pendukung tambahan
  const extraRoutes = [
    "editor",
    "hapus-background",
    "tingkatkan",
    "enhance",
    "meme",
    "konversi-jpg",
  ];

  extraRoutes.forEach((slug) => {
    routes.push({
      url: `${siteUrl}/tools/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return routes;
}
