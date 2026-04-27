"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            aria-label="Open menu"
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground md:hidden"
          >
            <Menu className="size-4" />
          </button>
        )}
      />
      <SheetContent
        side="left"
        className="w-64 border-r border-white/10 bg-sidebar p-0"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div onClick={() => setOpen(false)}>
          <SidebarNav />
        </div>
      </SheetContent>
    </Sheet>
  );
}
