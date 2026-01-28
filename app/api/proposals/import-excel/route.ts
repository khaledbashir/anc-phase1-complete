import { NextRequest, NextResponse } from "next/server";
import { parseANCExcel } from "@/services/proposal/server/excelImportService";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await parseANCExcel(buffer);

        return NextResponse.json(data);
    } catch (err) {
        console.error("Excel import error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
