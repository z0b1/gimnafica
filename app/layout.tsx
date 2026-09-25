import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AUTHOR, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { APP_NAME } from "@/lib/strings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// OG/Twitter images come from app/opengraph-image.jpg and app/twitter-image.jpg.
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: SITE_TITLE, template: `%s · ${APP_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  keywords: ["kafa", "škola", "gimnazija", "veliki odmor", "poručivanje kafe", "školska kuhinja", "profesori"],
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    siteName: APP_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: { title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#92400e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <footer className="px-4 py-4 text-xs text-stone-500">
          Razvio{" "}
          <a
            href={AUTHOR.url}
            target="_blank"
            rel="noopener"
            className="font-medium text-stone-700 underline-offset-2 hover:text-amber-800 hover:underline"
          >
            {AUTHOR.name}
          </a>{" "}
          {AUTHOR.classLabel}
        </footer>
      </body>
    </html>
  );
}
