import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the public pages; everything else is behind login.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/prijava", SITE_URL).toString(), changeFrequency: "yearly", priority: 1 },
    { url: new URL("/registracija", SITE_URL).toString(), changeFrequency: "yearly", priority: 0.8 },
  ];
}
