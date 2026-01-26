import { NextRequest, NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { syncDocumentsToAnythingLLM } from "@/lib/rag-sync";

export async function POST(req: NextRequest) {
  try {
    const catalog = loadCatalog();
    const docs = catalog.map((c: any) => ({ name: c.product_id, content: JSON.stringify(c) }));
    const res = await syncDocumentsToAnythingLLM(docs);
    return NextResponse.json({ ok: true, result: res }, { status: 200 });
  } catch (err: any) {
    console.error("/api/rag/sync error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}