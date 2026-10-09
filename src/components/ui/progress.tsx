import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/finance/money";

export function BudgetBar({
  percent,
  status,
}: {
  percent: number;
  status: BudgetStatus;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#efe8de]">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          status === "ok" && "bg-ok",
          status === "warning" && "bg-warning",
          status === "over" && "bg-danger",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
