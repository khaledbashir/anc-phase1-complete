import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Builder as XMLBuilder } from "xml2js";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "JSON").toUpperCase();
    const body = await req.json();

    // Basic normalization: include details and items
    const details = body.details || {};
    const items = details.items || [];

    if (format === "JSON") {
      return NextResponse.json(body, { status: 200 });
    }

    if (format === "CSV") {
      // Simple CSV serializer to avoid dependency issues in different builds
      const rows = items || [];
      if (rows.length === 0) {
        return new Response("", {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=proposal-${details.proposalId || "export"}.csv`,
          },
        });
      }
      const keys = Object.keys(rows[0]);
      const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csv = [keys.join(","), ...rows.map((r: any) => keys.map((k) => escape(r[k])).join(","))].join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=proposal-${details.proposalId || "export"}.csv`,
        },
      });
    }

    if (format === "XML") {
      const builder = new XMLBuilder({ headless: true, renderOpts: { pretty: true } });
      const xml = builder.buildObject({ proposal: { details, items } });
      return new Response(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `attachment; filename=proposal-${details.proposalId || "export"}.xml`,
        },
      });
    }

    if (format === "XLSX") {
      const wb = XLSX.utils.book_new();
      const wsDetails = XLSX.utils.json_to_sheet([details]);
      XLSX.utils.book_append_sheet(wb, wsDetails, "Details");

      if (items.length > 0) {
        const wsItems = XLSX.utils.json_to_sheet(items);
        XLSX.utils.book_append_sheet(wb, wsItems, "Items");
      }

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=proposal-${details.proposalId || "export"}.xlsx`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}