import { getActiveWorkspace } from "@/lib/workspace-context";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { BrandContextHeader } from "@/components/dashboard/brand-context-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getActiveWorkspace();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-sidebar md:flex md:flex-col">
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <BrandContextHeader workspace={workspace} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
