import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-shell";
import { BrandForm } from "../_components/brand-form";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { redirect } from "next/navigation";

export const metadata = { title: "New brand — AI BrandScale" };

export default async function NewBrandPage() {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") redirect("/brands");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span className="px-1.5">/</span>
        <span>New</span>
      </nav>
      <PageHeader
        title="Add brand"
        description="Set the brand voice once — every generator inherits it."
      />
      <BrandForm />
    </div>
  );
}
