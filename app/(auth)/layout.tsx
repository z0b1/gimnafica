import { Logo } from "@/components/AppHeader";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo />
          <p className="muted mt-1">Kafa za veliki odmor, poručena unapred.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
