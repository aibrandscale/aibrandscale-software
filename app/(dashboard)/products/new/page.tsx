import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { PageHeader } from "@/components/dashboard/page-shell";
import { ProductForm } from "../_components/product-form";

export const metadata = { title: "New product — AI BrandScale" };

type PageProps = {
  searchParams: Promise<{ brand?: string }>;
};

export default async function NewProductPage({ searchParams }: PageProps) {
  const { brand: brandIdHint } = await searchParams;
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") redirect("/products");

  const brands = await prisma.brand.findMany({
    where: { workspaceId: ws.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <span className="px-1.5">/</span>
        <span>New</span>
      </nav>
      <PageHeader
        title="Add product"
        description="Add the products you want to generate marketing content for."
      />
      <ProductForm
        brands={brands}
        defaultBrandId={brandIdHint}
        currency={ws.currency}
      />
    </div>
  );
}
