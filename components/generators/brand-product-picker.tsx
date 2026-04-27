"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BrandOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; brandId: string };

type Props = {
  brands: BrandOption[];
  products: ProductOption[];
  brandId: string | null;
  productId: string | null;
  onBrandChange: (id: string) => void;
  onProductChange: (id: string) => void;
};

export function BrandProductPicker({
  brands,
  products,
  brandId,
  productId,
  onBrandChange,
  onProductChange,
}: Props) {
  const filteredProducts = brandId
    ? products.filter((p) => p.brandId === brandId)
    : products;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Brand</label>
        <Select
          value={brandId ?? ""}
          onValueChange={(v) => v && onBrandChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Product</label>
        <Select
          value={productId ?? ""}
          onValueChange={(v) => v && onProductChange(v)}
          disabled={filteredProducts.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                filteredProducts.length === 0
                  ? "No products in this brand"
                  : "Select product"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filteredProducts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
