import type { ReactNode } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { BottomNav, Sidebar } from "@/components/layout/nav";
import { ModeChooser } from "@/components/mode-chooser";
import { SetupNotice } from "@/components/setup-notice";
import { getProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { connection } from "next/server";

export async function AppShell({ children }: { children: ReactNode }) {
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <Shell mode="envelopes">
        <SetupNotice />
        {children}
      </Shell>
    );
  }

  const profile = await getProfile();
  if (profile.tracker_mode === null) {
    return (
      <Shell mode="envelopes" hideNav>
        <ModeChooser />
      </Shell>
    );
  }

  return <Shell mode={profile.tracker_mode}>{children}</Shell>;
}

function Shell({
  children,
  mode,
  hideNav = false,
}: {
  children: ReactNode;
  mode: "envelopes" | "ledger";
  hideNav?: boolean;
}) {
  return (
    <div className="flex min-h-dvh">
      {hideNav ? null : <Sidebar mode={mode} />}
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10 md:pt-6">
          <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between border-b border-border/80 bg-background/90 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
            <p className="text-base font-semibold tracking-tight">Nirvah</p>
            {hideNav ? (
              <span />
            ) : (
              <Link href="/settings" aria-label="Settings" className="flex size-11 items-center justify-center rounded-xl hover:bg-[#efe8de]">
                <Settings className="size-5" />
              </Link>
            )}
          </div>
          {children}
        </main>
        {hideNav ? null : <BottomNav mode={mode} />}
      </div>
    </div>
  );
}
