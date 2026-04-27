import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/30 blur-[160px]" />
      </div>

      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          AI marketing content for e-commerce brands
        </div>

        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          AI BrandScale
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed">
          Generate video ad scripts, advertorials, marketing angles, and static
          ad creatives for every brand and product in your portfolio — in
          minutes, not days.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Start free — 50 credits
          </Link>
          <Link
            href="/signin"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign in
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          No credit card required.
        </p>
      </div>
    </main>
  );
}
