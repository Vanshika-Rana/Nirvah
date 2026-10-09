import { getAllExportData } from "@/lib/data";
import { buildWorkbook, exportFileName, workbookToBuffer } from "@/lib/excel/export";
import { isSupabaseConfigured } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }
  try {
    const payload = await getAllExportData();
    const workbook = buildWorkbook(payload);
    const buffer = workbookToBuffer(workbook);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exportFileName()}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not export Excel." }, { status: 500 });
  }
}
