import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountPaydayRow } from "@/lib/finance/accounts";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

export function HomeAccounts({ rows }: { rows: AccountPaydayRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your accounts</CardTitle>
        <Link href="/accounts" className="text-sm font-medium text-accent">
          Details
        </Link>
      </CardHeader>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          <Link href="/accounts" className="font-medium text-accent">
            Add an account
          </Link>{" "}
          to see what’s left in each one.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href="/accounts" className="flex items-center justify-between gap-3 py-2.5">
                <p className="min-w-0 truncate font-medium">{row.name}</p>
                <p className={cn("shrink-0 text-sm font-semibold tabular-nums", row.left < 0 ? "text-danger" : "text-accent")}>
                  {formatINR(row.left)} left
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
