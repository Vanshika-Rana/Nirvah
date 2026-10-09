"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmImport } from "@/actions/excel";
import type { ImportPreview } from "@/lib/excel/import";

export function ExcelTools() {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState("");

  async function download() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/export");
        if (!response.ok) {
          toast.error("Could not export Excel. Nothing in the database was changed.");
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `nirvah-backup-${stamp}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Excel backup downloaded.");
      } catch {
        toast.error("Could not export Excel.");
      }
    });
  }

  async function onFile(file: File) {
    setFileName(file.name);
    const form = new FormData();
    form.set("file", file);
    startTransition(async () => {
      const response = await fetch("/api/import/preview", { method: "POST", body: form });
      if (!response.ok) {
        toast.error("Could not read that workbook.");
        return;
      }
      const data = (await response.json()) as ImportPreview;
      setPreview(data);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel backup</CardTitle>
      </CardHeader>
      <p className="mb-3 text-sm text-muted">
        Download is a snapshot only. It does not change your live Supabase data. Import never overwrites existing transaction IDs unless you confirm it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={download}>
          {pending ? "Working…" : "Download Excel"}
        </Button>
        <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border bg-white px-4 text-sm font-semibold">
          Preview import
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>
      {preview ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            {fileName}: {preview.rows.length} valid rows, {preview.duplicates.length} existing IDs, {preview.errors.length} errors.
          </p>
          {preview.errors.slice(0, 5).map((error) => (
            <p key={error} className="text-danger">
              {error}
            </p>
          ))}
          {preview.duplicates.length > 0 ? (
            <p className="text-warning">Duplicate IDs will be skipped. Existing records will not be overwritten.</p>
          ) : null}
          <Button
            disabled={pending || preview.rows.length === 0}
            onClick={() => {
              if (!confirm("Import new rows only? Existing transaction IDs will be skipped.")) return;
              startTransition(async () => {
                const result = await confirmImport(preview.rows.filter((row) => !preview.duplicates.includes(row.id ?? "")));
                if (!result.ok) toast.error(result.error);
                else toast.success(`Imported ${result.data.created} new transactions.`);
                setPreview(null);
              });
            }}
          >
            Confirm import
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
