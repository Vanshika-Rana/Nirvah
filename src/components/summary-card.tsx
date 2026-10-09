import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { BudgetBar } from "@/components/ui/progress";
import { budgetStatusLabel, formatINR, type BudgetStatus } from "@/lib/finance/money";

export function SummaryCard({
  label,
  value,
  hint,
  percent,
  status,
}: {
  label: string;
  value: number;
  hint?: string;
  percent?: number;
  status?: BudgetStatus;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {status ? <StatusBadge status={status} label={budgetStatusLabel(status)} /> : null}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{formatINR(value)}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      {percent != null && status ? (
        <div className="mt-3">
          <BudgetBar percent={percent} status={status} />
          <p className="mt-1 text-xs text-muted">{Math.round(percent)}% used</p>
        </div>
      ) : null}
    </Card>
  );
}
