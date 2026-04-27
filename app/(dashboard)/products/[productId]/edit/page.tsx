import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { PageHeader } from "@/components/dashboard/page-shell";
import { ProductForm } from "../../_components/product-form";

type PageProps = { params: Promise<{ productId: string }> };

export const metadata = { title: "Edit product — AI BrandScale" };

export default async function EditProductPage({ params }: PageProps) {
  const { productId } = await params;
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") redirect(`/products/${productId}`);

  const [product, brands] = await Promise.all([
    prisma.product.findFirst({
      where: { id: productId, brand: { workspaceId: ws.id } },
      include: { brand: { select: { id: true, name: true } } },
    }),
    prisma.brand.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <span className="px-1.5">/</span>
        <Link
          href={`/products/${product.id}`}
          className="hover:text-foreground"
        >
          {product.name}
        </Link>
        <span className="px-1.5">/</span>
        <span>Edit</span>
      </nav>

      <PageHeader title="Edit product" description={product.name} />

      <ProductForm
        brands={brands}
        currency={ws.currency}
        initial={{
          id: product.id,
          brandId: product.brandId,
          name: product.name,
          description: product.description,
          features: product.features,
          priceCents: product.priceCents,
          images: product.imageKeys.map((key) => ({
            key,
            url: publicStorageUrl(key),
          })),
        }}
      />
    </div>
  );
}
