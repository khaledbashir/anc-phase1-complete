/**
 * /api/rate-card/template — Download CSV templates for rate card
 *
 * GET ?type=dev   → Dev template (7 columns: category, key, label, value, unit, provenance, confidence)
 * GET ?type=anc   → ANC-facing template for Matt (5 columns: Category, Item, Rate, Unit, Notes)
 * GET (default)   → Dev template
 */

import { NextRequest, NextResponse } from "next/server";

const DEV_TEMPLATE = [
    "category,key,label,value,unit,provenance,confidence",
    'margin,margin.led_hardware,LED Hardware Margin,0.30,pct,"NBCU LED Cost Sheet V=0.3",validated',
    'install,install.steel_fab.standard,Steel Fabrication Standard,35,per_lb,"Indiana Fever: =D19*35",validated',
].join("\n");

const ANC_TEMPLATE = [
    "Category,Item,Rate,Unit,Notes",
    "LED Pricing,1.2mm LED panels,,$ per sqft,",
    "LED Pricing,1.5mm LED panels,,$ per sqft,",
    "LED Pricing,1.875mm LED panels,,$ per sqft,",
    "LED Pricing,2.5mm LED panels,,$ per sqft,",
    "LED Pricing,3.9mm LED panels,,$ per sqft,",
    "LED Pricing,4mm LED panels,,$ per sqft,",
    "LED Pricing,6mm LED panels,,$ per sqft,",
    "LED Pricing,10mm LED panels,,$ per sqft,",
    "LED Pricing,16mm LED panels,,$ per sqft,",
    "Margins,LED hardware margin,,% (e.g. 30),",
    "Margins,Services margin (standard),,% (e.g. 20),",
    "Margins,Services margin (small displays),,% (e.g. 30),",
    "Margins,Software / CMS margin,,% (e.g. 35),",
    "Bond & Tax,Performance bond rate,,% (e.g. 1.5),",
    "Bond & Tax,Default sales tax rate,,% (e.g. 9.5),",
    "Install - Steel Fabrication,Simple (basic wall mount),,$ per lb,",
    "Install - Steel Fabrication,Standard (standard rigging),,$ per lb,",
    "Install - Steel Fabrication,Complex (difficult access),,$ per lb,",
    "Install - Steel Fabrication,Heavy (crane work / extreme),,$ per lb,",
    "Install - LED,Simple install,,$ per sqft,",
    "Install - LED,Standard install,,$ per sqft,",
    "Install - LED,Complex install,,$ per sqft,",
    "Install - Other,Heavy equipment,,$ per lb,",
    "Install - Other,PM / GC / Travel,,$ per lb,",
    "Install - Other,Electrical materials,,$ per sqft,",
    "Other,Spare parts (% of LED cost),,% (e.g. 5),",
    "Other,Demolition (flat fee per display),,$ flat,",
    "Other,Warranty annual escalation (yr 4-10),,% (e.g. 10),",
].join("\n");

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type") || "dev";

    if (type === "anc") {
        return new NextResponse(ANC_TEMPLATE, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=ANC_Rate_Card_Template.csv",
            },
        });
    }

    return new NextResponse(DEV_TEMPLATE, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=rate-card-dev-template.csv",
        },
    });
}
