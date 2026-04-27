import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { ProductBrandFilter } from "./_components/brand-filter";

export const metadata = { title: "Products — AI BrandScale" };

type PageProps = {
  searchParams: Promise<{ brand?: string }>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const { brand: brandFilter } = await searchParams;
  const ws = await getActiveWorkspace();

  const brands = await prisma.brand.findMany({
    where: { workspaceId: ws.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const products = await prisma.product.findMany({
    where: {
      brand: { workspaceId: ws.id },
      ...(brandFilter ? { brandId: brandFilter } : {}),
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const canCreate = ws.role !== "MEMBER" && brands.length > 0;
  const newHref = brandFilter
    ? `/products/new?brand=${brandFilter}`
    : "/products/new";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Products"
        description="Each product belongs to a brand and feeds the generators."
        actions={
          canCreate ? (
            <Link href={newHref} className={buttonVariants()}>
              <Plus className="size-4" /> Add product
            </Link>
          ) : null
        }
      />

      {brands.length === 0 ? (
        <EmptyNoBrands />
      ) : (
        <>
          <ProductBrandFilter
            brands={brands}
            current={brandFilter ?? "all"}
          />

          {products.length === 0 ? (
            <Empty
              message={
                brandFilter
                  ? "No products in this brand yet."
                  : "No products yet."
              }
              canCreate={canCreate}
              newHref={newHref}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const cover = p.imageKeys[0]
                  ? publicStorageUrl(p.imageKeys[0])
                  : null;
                const price = formatPrice(p.priceCents, ws.currency);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.id}`}
                      className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                    >
                      <div className="relative aspect-[4/3] w-full bg-white/5">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={p.name}
                            fill
                            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <span className="text-xs text-muted-foreground">
                          {p.brand.name}
                        </span>
                        <span className="line-clamp-1 text-sm font-medium">
                          {p.name}
                        </span>
                        {price && (
                          <span className="mt-auto text-sm font-medium text-brand-muted">
                            {price}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Empty({
  message,
  canCreate,
  newHref,
}: {
  message: string;
  canCreate: boolean;
  newHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold">{message}</h3>
      {canCreate && (
        <Link href={newHref} className={buttonVariants() + " mt-1"}>
          <Plus className="size-4" /> Add product
        </Link>
      )}
    </div>
  );
}

function EmptyNoBrands() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold">No brands yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Products live under a brand. Create your first brand to add products.
      </p>
      <Link
        href="/brands/new"
        className={buttonVariants() + " mt-1"}
      >
        Create a brand
      </Link>
    </div>
  );
}
