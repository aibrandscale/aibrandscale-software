"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  current: "all" | "liked" | "disliked";
  counts: { all: number; liked: number; disliked: number };
};

export function ResultsTabs({ current, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setTab(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("tab");
    else next.set("tab", value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Tabs value={current} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="all">Generated ({counts.all})</TabsTrigger>
        <TabsTrigger value="liked">Liked ({counts.liked})</TabsTrigger>
        <TabsTrigger value="disliked">Disliked ({counts.disliked})</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
