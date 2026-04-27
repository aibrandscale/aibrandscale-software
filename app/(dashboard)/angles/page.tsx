import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { fetchGenerations, type GenerationsTab } from "@/lib/generations-query";
import { PageHeader } from "@/components/dashboard/page-shell";
import { ResultsTabs } from "@/components/generators/results-tabs";
import { AngleForm } from "./_components/angle-form";
import { AngleCard } from "./_components/angle-card";

export const metadata = { title: "Angles — AI BrandScale" };

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function asTab(value: string | undefined): GenerationsTab {
  if (value === "liked" || value === "disliked") return value;
  return "all";
}

export default async function AnglesPage({ searchParams }: PageProps) {
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
    fetchGenerations({ workspaceId: ws.id, type: "ANGLE", tab }),
  ]);

  const brandLanguageMap: Record<string, string[]> = {};
  for (const b of brands) brandLanguageMap[b.id] = b.languages;

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Angles"
        description="Generate fresh marketing angles for any product."
      />

      <AngleForm
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        products={products}
        brandLanguageMap={brandLanguageMap}
      />

      <ResultsTabs current={tab} counts={results.counts} />

      {results.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-muted-foreground">
          {tab === "all"
            ? "No angles generated yet. Use the form above to create your first."
            : tab === "liked"
              ? "No liked angles yet."
              : "No disliked angles yet."}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {results.items.map((g) => (
            <li key={g.id}>
              <AngleCard generation={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
