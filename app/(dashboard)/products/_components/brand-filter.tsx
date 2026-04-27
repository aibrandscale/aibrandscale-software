"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  brands: { id: string; name: string }[];
  current: string;
};

export function ProductBrandFilter({ brands, current }: Props) {
  const router = useRouter();

  function onChange(value: string | null) {
    if (!value) return;
    if (value === "all") {
      router.push("/products");
    } else {
      router.push(`/products?brand=${value}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Brand</span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
