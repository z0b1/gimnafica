import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";
import { APP_NAME } from "@/lib/strings";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: SITE_DESCRIPTION,
    lang: "sr",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#92400e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
