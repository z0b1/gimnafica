import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { APP_NAME } from "@/lib/strings";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  // The public entry page: use the full site title rather than "Prijava · Gimnafica".
  title: { absolute: SITE_TITLE },
  alternates: { canonical: "/prijava" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  url: new URL("/prijava", SITE_URL).toString(),
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "sr",
  offers: { "@type": "Offer", price: "0", priceCurrency: "RSD" },
};

export default function LoginPage() {
  return (
    <div className="card">
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1 className="mb-5 text-xl font-bold">Prijava</h1>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-stone-600">
        Nemate nalog?{" "}
        <Link href="/registracija" className="font-semibold text-amber-800 hover:underline">
          Registrujte se
        </Link>
      </p>
    </div>
  );
}
