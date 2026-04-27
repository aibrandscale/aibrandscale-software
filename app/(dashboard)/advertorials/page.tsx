import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { fetchGenerations, type GenerationsTab } from "@/lib/generations-query";
import { PageHeader } from "@/components/dashboard/page-shell";
import { ResultsTabs } from "@/components/generators/results-tabs";
import { AdvertorialForm } from "./_components/advertorial-form";
import { AdvertorialCard } from "./_components/advertorial-card";

export const metadata = { title: "Advertorials — AI BrandScale" };

type PageProps = { searchParams: Promise<{ tab?: string }> };

function asTab(v: string | undefined): GenerationsTab {
  return v === "liked" || v === "disliked" ? v : "all";
}

export default async function AdvertorialsPage({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const tab = asTab(tabParam);
  const ws = await getActiveWorkspace();

  const [brands, products, results] = await Promise.all([
    prisma.brand.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, name: true, languages: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { brand: { workspaceId: ws.id } },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    fetchGenerations({ workspaceId: ws.id, type: "ADVERTORIAL", tab }),
  ]);

  const brandLanguageMap: Record<string, string[]> = {};
  for (const b of brands) brandLanguageMap[b.id] = b.languages;

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Advertorials"
        description="Long-form articles in editorial style."
      />

      <AdvertorialForm
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        products={products}
        brandLanguageMap={brandLanguageMap}
      />

      <ResultsTabs current={tab} counts={results.counts} />

      {results.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-muted-foreground">
          {tab === "all"
            ? "No advertorials yet."
            : tab === "liked"
              ? "No liked advertorials yet."
              : "No disliked advertorials yet."}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {results.items.map((g) => (
            <li key={g.id}>
              <AdvertorialCard generation={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
