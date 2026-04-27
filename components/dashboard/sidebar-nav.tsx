"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Box,
  Lightbulb,
  Image as ImageIcon,
  Video,
  Newspaper,
  Users,
  CreditCard,
  LifeBuoy,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/products", label: "Products", icon: Box },
  { href: "/angles", label: "Angles", icon: Lightbulb },
  { href: "/statics", label: "Statics", icon: ImageIcon },
  { href: "/video-scripts", label: "Video Scripts", icon: Video },
  { href: "/advertorials", label: "Advertorials", icon: Newspaper },
];

const FOOTER_NAV = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-6 px-3 py-6">
      <Link
        href="/brands"
        className="flex items-center gap-2 px-3 text-sm font-semibold tracking-tight"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white">
          <span className="text-xs font-bold">A</span>
        </span>
        AI BrandScale
      </Link>

      <NavSection items={NAV} pathname={pathname} />

      <div className="mt-auto flex flex-col gap-1">
        <NavSection items={FOOTER_NAV} pathname={pathname} />
      </div>
    </nav>
  );
}

function NavSection({
  items,
  pathname,
}: {
  items: typeof NAV;
  pathname: string;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand/15 text-brand-muted"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
