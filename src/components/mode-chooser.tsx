"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chooseTrackerMode } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ModeChooser() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(mode: "envelopes" | "ledger") {
    startTransition(async () => {
      const result = await chooseTrackerMode(mode);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">How do you want to use Nirvah?</h1>
        <p className="mt-1 text-sm text-muted">You can reset later in Settings if you pick the wrong one.</p>
      </div>
      <Card className="space-y-3">
        <h2 className="text-base font-semibold">Plan my salary</h2>
        <p className="text-sm text-muted">
          Split payday into envelopes, a weekly target, and leftover that rolls to the next salary.
        </p>
        <Button disabled={pending} onClick={() => choose("envelopes")}>
          {pending ? "Saving…" : "Use salary plan"}
        </Button>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-base font-semibold">Track income and expenses</h2>
        <p className="text-sm text-muted">
          Log money in and out with categories. No planned amounts. Personal and business stay in one place.
        </p>
        <Button disabled={pending} onClick={() => choose("ledger")}>
          {pending ? "Saving…" : "Use income tracker"}
        </Button>
      </Card>
    </div>
  );
}
