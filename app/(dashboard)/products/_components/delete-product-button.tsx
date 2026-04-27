"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/actions/products";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Delete ${productName}? This removes its images and any generations referencing it.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("productId", productId);
    startTransition(() => {
      void deleteProduct(fd);
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
