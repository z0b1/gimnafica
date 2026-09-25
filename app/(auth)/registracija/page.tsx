import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Registracija",
  description: "Napravite nalog za Gimnaficu kao profesor ili kao član kuhinje. Nalog postaje aktivan kada ga administrator odobri.",
  alternates: { canonical: "/registracija" },
};

export default function SignUpPage() {
  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-bold">Registracija</h1>
      <p className="mb-5 text-sm text-stone-600">
        Nalog postaje aktivan kada ga administrator odobri.
      </p>
      <SignUpForm />
      <p className="mt-5 text-center text-sm text-stone-600">
        Već imate nalog?{" "}
        <Link href="/prijava" className="font-semibold text-amber-800 hover:underline">
          Prijavite se
        </Link>
      </p>
    </div>
  );
}
