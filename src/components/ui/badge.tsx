import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/finance/money";

export function StatusBadge({ status, label }: { status: BudgetStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "ok" && "bg-ok-soft text-ok",
        status === "warning" && "bg-warning-soft text-warning",
        status === "over" && "bg-danger-soft text-danger",
      )}
    >
      {label}
    </span>
  );
}

export function Badge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[#efe8de] px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}
