import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Multiverso Girls — comunidade de motoqueiras",
    short_name: "Multiverso Girls",
    description:
      "Uma comunidade para mulheres que andam de moto encontrarem outras motoqueiras, criarem conexões e combinarem rolês com mais segurança.",
    id: "/",
    categories: ["social", "lifestyle"],
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#141319",
    theme_color: "#5B21B6",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
