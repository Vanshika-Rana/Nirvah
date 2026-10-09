"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, History, Home, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/add", label: "Add expense", icon: Plus },
  { href: "/weekly", label: "Weekly", icon: CalendarRange },
  { href: "/history", label: "History", icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-card p-5 md:flex md:flex-col">
      <div className="mb-8">
        <p className="text-lg font-semibold tracking-tight">Nirvah</p>
        <p className="text-sm text-muted">Personal budget</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
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
            pathname === "/settings" ? "bg-accent-soft text-accent" : "text-foreground hover:bg-[#f3eee6]",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
