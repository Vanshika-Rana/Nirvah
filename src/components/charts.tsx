"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "@/lib/finance/money";
import { formatDayLabel } from "@/lib/finance/dates";
import { cn } from "@/lib/utils";

const COLORS = ["#0f766e", "#0d9488", "#14b8a6", "#b45309", "#ea580c", "#7c3aed", "#0369a1"];

const KIND_COLOR: Record<string, string> = {
  spend: "#0f766e",
  save: "#b45309",
  commit: "#7c3aed",
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e7dfd4",
  background: "#fffcf7",
};

export function MoneyRing({
  spent,
  remaining,
  label,
}: {
  spent: number;
  remaining: number;
  label: string;
}) {
  const kept = Math.max(0, remaining);
  const total = Math.max(spent + kept, 1);
  const percent = Math.round((kept / total) * 100);
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div
        className="relative size-28 shrink-0 rounded-full sm:size-36"
        style={{
          background: `conic-gradient(#0f766e ${percent * 3.6}deg, #efe8de 0)`,
        }}
      >
        <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-card sm:inset-3">
          <p className="text-xl font-semibold tracking-tight sm:text-2xl">{percent}%</p>
          <p className="text-[11px] text-muted">still yours</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{formatINR(kept)}</p>
        <p className="mt-1 text-sm text-muted">{formatINR(spent)} spent this month</p>
      </div>
    </div>
  );
}

export function MoneyFlow({
  opening,
  income,
  spent,
  remaining,
}: {
  opening: number;
  income: number;
  spent: number;
  remaining: number;
}) {
  const pot = Math.max(opening + income, 1);
  const kept = Math.max(0, remaining);
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">This month’s pot</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-[#efe8de]">
          {opening > 0 ? (
            <div
              className="bg-[#b45309]"
              style={{ width: `${(opening / pot) * 100}%` }}
              title={`From last month ${formatINR(opening)}`}
            />
          ) : null}
          {income > 0 ? (
            <div
              className="bg-[#0d9488]"
              style={{ width: `${(income / pot) * 100}%` }}
              title={`Added this month ${formatINR(income)}`}
            />
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {opening > 0 ? (
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-[#b45309]" />
              Last month {formatINR(opening)}
            </span>
          ) : null}
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-[#0d9488]" />
            Added {formatINR(income)}
          </span>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Spent vs kept</p>
        <div className="flex h-4 overflow-hidden rounded-full bg-[#efe8de]">
          <div
            className="bg-[#c2410c] transition-all"
            style={{ width: `${Math.min(100, (spent / pot) * 100)}%` }}
            title={`Spent ${formatINR(spent)}`}
          />
          <div
            className="bg-accent transition-all"
            style={{ width: `${Math.min(100, (kept / pot) * 100)}%` }}
            title={`Kept ${formatINR(kept)}`}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
          <span className="text-muted">Spent {formatINR(spent)}</span>
          <span className="font-medium text-accent">Kept {formatINR(kept)} → next month</span>
        </div>
      </div>
    </div>
  );
}

export function EnvelopeBars({
  data,
}: {
  data: { name: string; spent: number; planned: number; kind: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="space-y-4">
      {data.map((row) => {
        const leftover = Math.max(0, row.planned - row.spent);
        const percent = row.planned > 0 ? Math.min(100, (row.spent / row.planned) * 100) : 0;
        const over = row.spent > row.planned && row.planned > 0;
        const fill = over ? "#b42318" : KIND_COLOR[row.kind] ?? "#0f766e";
        const headline = row.kind === "save" ? "kept" : over ? "over" : "left";
        const headlineValue = row.kind === "save" ? leftover : over ? row.spent - row.planned : leftover;
        return (
          <div key={row.name}>
            <div className="mb-1 flex items-end justify-between gap-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted">
                  {formatINR(row.spent)} of {formatINR(row.planned)}
                </p>
              </div>
              <p className={cn("text-sm font-semibold tabular-nums", over ? "text-danger" : "text-accent")}>
                {formatINR(headlineValue)} {headline}
              </p>
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

export function SpendPie({ data }: { data: { name: string; value: number }[] }) {
  const rows = data.filter((row) => row.value > 0);
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No spending to chart yet.</p>;
  }
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="mx-auto h-44 w-full max-w-[14rem] sm:h-48 sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={46} outerRadius={74} paddingAngle={2} stroke="none">
              {rows.map((row, index) => (
                <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatINR(Number(value))} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {rows.map((row, index) => (
          <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{row.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatINR(row.value)} · {Math.round((row.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeeklyBarChart({
  data,
}: {
  data: { start: string; spent: number; target: number }[];
}) {
  const rows = data.map((row) => ({
    ...row,
    label: formatDayLabel(row.start).split(" ").slice(0, 2).join(" "),
  }));
  const target = rows.find((row) => row.target > 0)?.target ?? 0;
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7dfd4" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b635b" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            formatter={(value, name) => [formatINR(Number(value)), name === "spent" ? "Spent" : "Target"]}
            contentStyle={tooltipStyle}
          />
          {target > 0 ? <ReferenceLine y={target} stroke="#b45309" strokeDasharray="4 4" /> : null}
          <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
            {rows.map((row) => (
              <Cell key={row.start} fill={row.spent > row.target && row.target > 0 ? "#b42318" : "#0f766e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyBarChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  const rows = data.map((row) => ({
    ...row,
    label: formatDayLabel(row.date).split(",")[0] ?? row.date,
  }));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid vertical={false} stroke="#e7dfd4" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b635b" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip formatter={(value) => formatINR(Number(value))} contentStyle={tooltipStyle} />
          <Bar dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
