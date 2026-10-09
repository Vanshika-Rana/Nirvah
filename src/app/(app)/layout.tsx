import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { BottomNav, Sidebar } from "@/components/layout/nav";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <p className="text-lg font-semibold tracking-tight">Nirvah</p>
            <Link href="/settings" aria-label="Settings" className="flex size-11 items-center justify-center rounded-xl hover:bg-[#efe8de]">
              <Settings className="size-5" />
            </Link>
          </div>
          {!isSupabaseConfigured() ? <SetupNotice /> : null}
          {children}
        </main>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  );
}
