import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Träningsdagbok",
    short_name: "Träning",
    description: "Din personliga träningsdagbok — logga pass, följ trender och personbästa.",
    start_url: "/",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#07080c",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
