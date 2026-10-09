import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="h-dvh" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
