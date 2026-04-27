"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteBrand } from "@/app/actions/brands";

export function DeleteBrandButton({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Delete ${brandName}? This removes all its products and generations.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("brandId", brandId);
    startTransition(() => {
      void deleteBrand(fd);
    });
  }

  return (
    <Button
      variant="outline"
      onClick={onDelete}
      disabled={pending}
      className="text-error"
    >
      <Trash2 className="size-4" />
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
