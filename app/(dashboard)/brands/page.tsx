import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { PageHeader } from "@/components/dashboard/page-shell";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Brands — AI BrandScale" };

export default async function BrandsPage() {
  const ws = await getActiveWorkspace();
  const brands = await prisma.brand.findMany({
    where: { workspaceId: ws.id },
    select: {
      id: true,
      name: true,
      logoKey: true,
      website: true,
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const canCreate = ws.role !== "MEMBER";

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Brands"
        description="Brands you generate marketing content for."
        actions={
          canCreate ? (
            <Link href="/brands/new" className={buttonVariants()}>
              <Plus className="size-4" /> Add brand
            </Link>
          ) : null
        }
      />

      {brands.length === 0 ? (
        <EmptyState canCreate={canCreate} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const logo = b.logoKey ? publicStorageUrl(b.logoKey) : null;
            return (
              <li key={b.id}>
                <Link
                  href={`/brands/${b.id}`}
                  className="flex h-full flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                      {logo ? (
                        <Image
                          src={logo}
                          alt={b.name}
                          width={48}
                          height={48}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {b.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {b.name}
                      </span>
                      {b.website && (
                        <span className="truncate text-xs text-muted-foreground">
                          {b.website.replace(/^https?:\/\//, "")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto text-xs text-muted-foreground">
                    {b._count.products} product
                    {b._count.products === 1 ? "" : "s"}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold">No brands yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Add your first brand to start generating marketing content tailored to
        its voice and audience.
      </p>
      {canCreate && (
        <Link
          href="/brands/new"
          className={buttonVariants({ size: "lg" }) + " mt-2"}
        >
          <Plus className="size-4" /> Add brand
        </Link>
      )}
    </div>
  );
}
