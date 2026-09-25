import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Registracija" };

export default function SignUpPage() {
  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-bold">Registracija</h1>
      <p className="mb-5 text-sm text-stone-600">
        Administrator će odobriti vaš nalog pre prve prijave.
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
