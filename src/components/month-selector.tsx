"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatCycleLabel, formatMonthLabel, payCycleForMonth } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";

export function MonthSelector({
  month,
  path = "/",
  salaryDates = [],
}: {
  month: string;
  path?: string;
  salaryDates?: string[];
}) {
  const router = useRouter();
  const cycle = payCycleForMonth(salaryDates, month);
  const label =
    cycle && cycle.start.startsWith(month) ? formatCycleLabel(cycle.start, cycle.end) : formatMonthLabel(month);

  function go(next: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("month", next);
    router.push(`${path}?${params.toString()}`);
  }
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button variant="secondary" size="icon" aria-label="Previous payday" onClick={() => go(addMonths(month, -1))}>
        <ChevronLeft />
      </Button>
      <p className="min-w-0 flex-1 text-center text-sm font-semibold sm:min-w-40 sm:flex-none sm:text-base">
        {label}
      </p>
      <Button variant="secondary" size="icon" aria-label="Next payday" onClick={() => go(addMonths(month, 1))}>
        <ChevronRight />
      </Button>
    </div>
  );
}
