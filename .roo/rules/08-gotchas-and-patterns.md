# Gotchas & Patterns

## Known Gotchas
1. **Auth.js v5 in Docker:** Must have explicit `secret: process.env.AUTH_SECRET` in BOTH `auth.ts` AND `auth-middleware.ts`. Without this, auth silently fails.
2. **No .env in Docker:** All environment variables come from EasyPanel config. Never create a .env file.
3. **Stale JS chunks after deploy:** Container restart → users see old cached JS → hard refresh fixes it.
4. **Prisma in Docker:** Uses `npx prisma db push --accept-data-loss` in entrypoint. Schema changes auto-apply on deploy.
5. **ExcelJS memory:** Large workbooks can OOM. Stream when possible.
6. **Browserless timeout:** PDF generation can take 10-30 seconds for large proposals. `maxDuration` is set to 300-600 on relevant routes.
7. **pdftotext for large PDFs:** Use bulk extraction (single call + split by \f) not per-page. 1,380 pages in seconds vs minutes.

## Code Patterns
### API Routes
```typescript
// Always use Next.js 15 app router pattern
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... logic
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Excel Generation (ExcelJS)
```typescript
const workbook = new ExcelJS.Workbook();
workbook.creator = "ANC Proposal Engine";
workbook.created = new Date();
const ws = workbook.addWorksheet("Sheet Name", {
  properties: { tabColor: { argb: "FF0A52EF" } },
});
// ... build sheet
const buffer = await workbook.xlsx.writeBuffer();
return buffer as unknown as Buffer;
```

### Colors
```
ANC Blue:    #0A52EF (FF0A52EF in Excel ARGB)
Dark Header: #1F2937 (FF1F2937)
Excel Green: #217346
Light Gray:  #F8F9FA (stripe rows)
Green BG:    #D4EDDA (totals)
Amber BG:    #FFF8E1 (editable input cells)
```

### Margin Formula (CRITICAL — used everywhere)
```typescript
// DIVISOR MODEL — NOT markup
sellingPrice = cost / (1 - marginPercent)
// Example: $100 cost at 20% margin = $100 / 0.8 = $125 selling
```

### Context Pattern
```typescript
// All major state lives in React Context
import { useProposalContext } from "@/contexts/ProposalContext";
const { proposal, updateProposal } = useProposalContext();
```

### Auto-save Pattern
```typescript
// 2-second debounced save
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
useDebouncedSave(proposalData, 2000);
```

## Styling
- Always use Tailwind + shadcn/ui
- Work Sans font family
- French Blue (#0A52EF) as brand color
- Calibri font in Excel exports
- Green title bar (#217346) for Excel-like UI components
