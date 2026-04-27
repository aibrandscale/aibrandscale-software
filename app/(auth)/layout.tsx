import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[160px]" />
      </div>

      <Link
        href="/"
        className="mb-8 text-sm font-semibold tracking-tight text-foreground"
      >
        AI BrandScale
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        {children}
      </div>
    </main>
  );
}
