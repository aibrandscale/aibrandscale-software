import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { DeleteProductButton } from "../_components/delete-product-button";

type PageProps = { params: Promise<{ productId: string }> };

export default async function ProductDetailPage({ params }: PageProps) {
  const { productId } = await params;
  const ws = await getActiveWorkspace();

  const product = await prisma.product.findFirst({
    where: { id: productId, brand: { workspaceId: ws.id } },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });
  if (!product) notFound();

  const canEdit = ws.role !== "MEMBER";
  const price = formatPrice(product.priceCents, ws.currency);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <span className="px-1.5">/</span>
        <Link
          href={`/brands/${product.brand.id}`}
          className="hover:text-foreground"
        >
          {product.brand.name}
        </Link>
        <span className="px-1.5">/</span>
        <span>{product.name}</span>
      </nav>

      <PageHeader
        title={product.name}
        description={price ?? product.brand.name}
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/products/${product.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="size-4" /> Edit
              </Link>
              <DeleteProductButton
                productId={product.id}
                productName={product.name}
              />
            </div>
          ) : null
        }
      />

      {product.imageKeys.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {product.imageKeys.map((key, i) => (
            <div
              key={key}
              className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5"
            >
              <Image
                src={publicStorageUrl(key)}
                alt={`${product.name} ${i + 1}`}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <Card title="Description">
        <p className="whitespace-pre-wrap text-sm">{product.description}</p>
      </Card>

      <Card title="Features">
        {product.features.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None set.</p>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
