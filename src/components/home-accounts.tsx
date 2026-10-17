import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountPaydayRow } from "@/lib/finance/accounts";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

export function HomeAccounts({ rows }: { rows: AccountPaydayRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your accounts</CardTitle>
        <Link
          href="/accounts"
          aria-label="Manage accounts"
          className="flex size-10 items-center justify-center rounded-xl text-accent hover:bg-[#efe8de]"
        >
          <Wallet className="size-5" />
        </Link>
      </CardHeader>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing to show yet. Open Manage to add an account.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <p className="min-w-0 truncate font-medium">{row.name}</p>
              <p className={cn("shrink-0 text-sm font-semibold tabular-nums", row.left < 0 ? "text-danger" : "text-accent")}>
                {formatINR(row.left)} left
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Link href="/accounts" className="text-sm font-medium text-accent">
          Manage
        </Link>
      </div>
    </Card>
  );
}
