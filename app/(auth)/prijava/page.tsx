import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Prijava" };

export default function LoginPage() {
  return (
    <div className="card">
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
