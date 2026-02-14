/**
 * /api/rate-card/template — Download a CSV template for rate card import
 *
 * GET: Returns a CSV file with headers and 2 example rows
 */

import { NextResponse } from "next/server";

export async function GET() {
    const csv = [
        "category,key,label,value,unit,provenance,confidence",
        'margin,margin.led_hardware,LED Hardware Margin,0.30,pct,"NBCU LED Cost Sheet V=0.3",validated',
        'install,install.steel_fab.standard,Steel Fabrication Standard,35,per_lb,"Indiana Fever: =D19*35",validated',
    ].join("\n");

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=rate-card-template.csv",
        },
    });
}
