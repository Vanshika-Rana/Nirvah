"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, History, Home, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const envelopeItems = [
  { href: "/", label: "Home", short: "Home", icon: Home },
  { href: "/add", label: "Add expense", short: "Add", icon: Plus },
  { href: "/weekly", label: "Weekly", short: "Week", icon: CalendarRange },
  { href: "/history", label: "History", short: "History", icon: History },
];

const ledgerItems = [
  { href: "/", label: "Home", short: "Home", icon: Home },
  { href: "/add", label: "Add", short: "Add", icon: Plus },
  { href: "/history", label: "History", short: "History", icon: History },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ mode = "envelopes" }: { mode?: "envelopes" | "ledger" }) {
  const pathname = usePathname();
  const items = mode === "ledger" ? ledgerItems : envelopeItems;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <ul className={`grid ${mode === "ledger" ? "grid-cols-3" : "grid-cols-4"}`}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const isAdd = item.href === "/add";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  isAdd && "relative -top-2",
                  active && !isAdd ? "text-accent" : "text-muted",
                )}
              >
                {isAdd ? (
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_8px_20px_rgba(15,118,110,0.35)]",
                      active && "ring-2 ring-accent-soft",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ mode = "envelopes" }: { mode?: "envelopes" | "ledger" }) {
  const pathname = usePathname();
  const items = mode === "ledger" ? ledgerItems : envelopeItems;
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-card p-5 md:flex md:flex-col">
      <div className="mb-8">
        <p className="text-lg font-semibold tracking-tight">Nirvah</p>
        <p className="text-sm text-muted">{mode === "ledger" ? "Income and expenses" : "Personal budget"}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                active ? "bg-accent-soft text-accent" : "text-foreground hover:bg-[#f3eee6]",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            "mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
            isActive(pathname, "/settings") ? "bg-accent-soft text-accent" : "text-foreground hover:bg-[#f3eee6]",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
