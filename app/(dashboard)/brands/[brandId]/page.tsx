import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { publicStorageUrl } from "@/lib/supabase";
import { PageHeader } from "@/components/dashboard/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { DeleteBrandButton } from "../_components/delete-brand-button";

type PageProps = { params: Promise<{ brandId: string }> };

export default async function BrandDetailPage({ params }: PageProps) {
  const { brandId } = await params;
  const ws = await getActiveWorkspace();

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, workspaceId: ws.id },
  });
  if (!brand) notFound();

  const canEdit = ws.role !== "MEMBER";
  const logo = brand.logoKey ? publicStorageUrl(brand.logoKey) : null;
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span className="px-1.5">/</span>
        <span>{brand.name}</span>
      </nav>

      <PageHeader
        title={brand.name}
        description={brand.website ?? undefined}
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/brands/${brand.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="size-4" /> Edit
              </Link>
              <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <div className="grid size-24 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {logo ? (
            <Image
              src={logo}
              alt={brand.name}
              width={96}
              height={96}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground">
              {brand.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Meta label="Created">{dateFmt.format(brand.createdAt)}</Meta>
          <Meta label="Languages">{brand.languages.join(", ") || "—"}</Meta>
          <Meta label="Primary">
            <ColorChip color={brand.primaryColor} />
          </Meta>
          <Meta label="Secondary">
            <ColorChip color={brand.secondaryColor} />
          </Meta>
          <Meta label="Accent">
            <ColorChip color={brand.accentColor} />
          </Meta>
        </dl>
      </div>

      <Card title="Brand description">
        <p className="whitespace-pre-wrap text-sm">{brand.description}</p>
      </Card>

      <Card title="Features & benefits">
        {brand.features.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {brand.features.map((f, i) => (
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

      <Card title="Target audience">
        <p className="whitespace-pre-wrap text-sm">{brand.targetAudience}</p>
      </Card>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ColorChip({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="size-4 rounded-md border border-white/10"
        style={{ background: color }}
      />
      <code className="text-xs text-muted-foreground">{color}</code>
    </span>
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
