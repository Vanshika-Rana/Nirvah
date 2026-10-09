"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonthLabel } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";

export function MonthSelector({
  month,
  path = "/",
}: {
  month: string;
  path?: string;
}) {
  const router = useRouter();
  function go(next: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("month", next);
    router.push(`${path}?${params.toString()}`);
  }
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => go(addMonths(month, -1))}>
        <ChevronLeft />
      </Button>
      <p className="min-w-0 flex-1 text-center text-sm font-semibold sm:min-w-40 sm:flex-none sm:text-base">
        {formatMonthLabel(month)}
      </p>
      <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => go(addMonths(month, 1))}>
        <ChevronRight />
      </Button>
    </div>
  );
}
