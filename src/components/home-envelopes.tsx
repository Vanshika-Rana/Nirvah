"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveEnvelope } from "@/actions/plan";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/finance/money";
import type { EnvelopeKind } from "@/lib/finance/month-plan";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<string, string> = {
  spend: "#0f766e",
  save: "#b45309",
  commit: "#7c3aed",
};

export function HomeEnvelopes({
  month,
  envelopes,
}: {
  month: string;
  envelopes: {
    id: string;
    name: string;
    kind: EnvelopeKind;
    planned: number;
    spent: number;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function saveAmount(envelope: (typeof envelopes)[number], raw: string) {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0 || amount === envelope.planned) return;
    startTransition(async () => {
      const result = await saveEnvelope({
        id: envelope.id,
        yearMonth: month,
        name: envelope.name,
        kind: envelope.kind,
        amount,
      });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  if (envelopes.length === 0) return null;

  return (
    <div className="space-y-4">
      {envelopes.map((row) => {
        const leftover = Math.max(0, row.planned - row.spent);
        const percent = row.planned > 0 ? Math.min(100, (row.spent / row.planned) * 100) : 0;
        const over = row.spent > row.planned && row.planned > 0;
        const fill = over ? "#b42318" : KIND_COLOR[row.kind] ?? "#0f766e";
        const headline = row.kind === "save" ? "kept" : over ? "over" : "left";
        const headlineValue = row.kind === "save" ? leftover : over ? row.spent - row.planned : leftover;
        return (
          <div key={row.id}>
            <div className="mb-1 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted">
                  {formatINR(row.spent)} spent of assigned
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className={cn("text-sm font-semibold tabular-nums", over ? "text-danger" : "text-accent")}>
                  {formatINR(headlineValue)} {headline}
                </p>
                <div className="w-24">
                  <Input
                    inputMode="decimal"
                    defaultValue={row.planned || ""}
                    aria-label={`Assigned for ${row.name}`}
                    disabled={pending}
                    className="h-9 px-2 text-right text-sm tabular-nums"
                    onBlur={(event) => saveAmount(row, event.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#efe8de]">
              <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: fill }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
