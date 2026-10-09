import { getAllExportData } from "@/lib/data";
import { previewWorkbook } from "@/lib/excel/import";
import { isSupabaseConfigured } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an Excel file." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const existing = await getAllExportData();
  const preview = previewWorkbook(
    buffer,
    existing.transactions.map((transaction) => transaction.id),
  );
  return NextResponse.json(preview);
}
