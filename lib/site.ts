import type { Metadata } from "next";
import { APP_NAME } from "./strings";

/**
 * Public URL of the site, used for absolute links in OG tags, the sitemap and
 * robots.txt. Set SITE_URL for a custom domain; on Vercel the production URL
 * is picked up automatically.
 */
export const SITE_URL = new URL(
  process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

export const SITE_TITLE = `${APP_NAME}: kafa za veliki odmor`;
export const SITE_DESCRIPTION =
  "Profesori poručuju kafu pre velikog odmora, a školska kuhinja uživo vidi tačan broj kafa po vrsti.";

/** Pages behind login: keep them out of search results. */
export const PRIVATE_PAGE: Metadata["robots"] = { index: false, follow: false };

/** Paths crawlers should skip (everything behind login). */
export const PRIVATE_PATHS = [
  "/admin",
  "/kuhinja",
  "/profesor",
  "/istorija",
  "/na-cekanju",
  "/odjava",
  "/api/",
];

export const AUTHOR = { name: "Božidar Mišković", classLabel: "II6", url: "https://z0b1.tech" };
