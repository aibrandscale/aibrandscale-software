import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { PageHeader } from "@/components/dashboard/page-shell";
import { BrandForm } from "../../_components/brand-form";

type PageProps = { params: Promise<{ brandId: string }> };

export const metadata = { title: "Edit brand — AI BrandScale" };

export default async function EditBrandPage({ params }: PageProps) {
  const { brandId } = await params;
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") redirect(`/brands/${brandId}`);

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, workspaceId: ws.id },
  });
  if (!brand) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span className="px-1.5">/</span>
        <Link
          href={`/brands/${brand.id}`}
          className="hover:text-foreground"
        >
          {brand.name}
        </Link>
        <span className="px-1.5">/</span>
        <span>Edit</span>
      </nav>

      <PageHeader
        title="Edit brand"
        description={brand.name}
      />

      <BrandForm
        initial={{
          id: brand.id,
          name: brand.name,
          website: brand.website,
          logoKey: brand.logoKey,
          logoUrl: brand.logoKey ? publicStorageUrl(brand.logoKey) : null,
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          accentColor: brand.accentColor,
          description: brand.description,
          targetAudience: brand.targetAudience,
          features: brand.features,
          languages: brand.languages,
        }}
      />
    </div>
  );
}
