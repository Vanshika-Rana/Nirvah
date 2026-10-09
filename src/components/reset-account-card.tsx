"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resetAccount } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ResetAccountCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");

  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle>Reset account</CardTitle>
      </CardHeader>
      <p className="mb-3 text-sm text-muted">
        Deletes your expenses, income, envelopes, accounts, and categories. Your login stays. This cannot be undone, and
        it does not touch anyone else’s data.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={confirmation}
          placeholder="Type RESET"
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resetAccount(confirmation);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Account reset.");
                setConfirmation("");
                router.refresh();
              }
            })
          }
        >
          {pending ? "Resetting…" : "Reset account"}
        </Button>
      </div>
    </Card>
  );
}
