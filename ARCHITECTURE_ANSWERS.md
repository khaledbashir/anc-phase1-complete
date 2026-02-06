# Architecture Answers — Codebase Facts

Exact file paths, function names, and line numbers. No suggestions, only facts.

---

## PDF GENERATION

### 1. What library/tool generates the PDF?

**Puppeteer** (`puppeteer-core` in production with `@sparticuz/chromium`; full `puppeteer` in development).

- **Package:** `package.json` lines 66, 101: `"puppeteer-core": "^24.9.0"`, `"puppeteer": "^24.10.0"`.
- **Usage:** `services/proposal/server/generateProposalPdfServiceV2.ts` lines 65–104: `import("puppeteer-core")`, `puppeteer.connect()` or `puppeteer.launch()`.
- **Next.js:** `next.config.js` line 7: `serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]`.

---

### 2. Where is the PDF template defined?

Budget, Proposal, and LOI all use the **same** React template; mode is controlled by `documentMode` in the payload.

- **Single template file:** `app/components/templates/proposal-pdf/ProposalTemplate5.tsx` (default “ANC Hybrid”).
- **Dynamic loader (client):** `app/components/templates/proposal-pdf/DynamicProposalTemplate.tsx` — loads `ProposalTemplate${templateId}` (line 28), default 5; templates 1–4 are deprecated and map to 5.
- **Server-side loader:** `lib/helpers.ts` lines 280–295: `getProposalTemplate(templateId)` dynamically imports `@/app/components/templates/proposal-pdf/ProposalTemplate${actualId}`.
- **Layout wrapper:** `app/components/templates/proposal-pdf/ProposalLayout.tsx` wraps template content (print CSS, footer, etc.).
- **Other template files (deprecated/fallback):**  
  `app/components/templates/proposal-pdf/ProposalTemplate2.tsx`,  
  `ProposalTemplate3.tsx`,  
  `ProposalTemplate4.tsx`,  
  `NataliaMirrorTemplate.tsx` (referenced in codebase but Hybrid is primary).  
- **Share view:** `app/share/[hash]/page.tsx` line 53 uses `ProposalTemplate5` directly.

---

### 3. Where does the text "[PROJECT TOTAL]" appear in the codebase?

**Exact string in source (code/docs):**

| File | Line |
|------|------|
| `lib/security/sanitizeForClient.ts` | 55 — `projectTotal: '[PROJECT TOTAL]'` |

**Documentation/notes only (not runtime template code):**

- `PROMPTS_STATUS_UPDATE.md` line 44 (describes replacement with "—").
- `prisma/clientneed` line 607.
- `ppp/All notes 1_31_2026.html` lines 15, 150, 253, 579.
- `ppp/ANC Studio PRD.pdf.html` line 474.
- `MASTER_TRUTH_PDF_VERIFICATION.md` lines 17, 273.
- `AI_WHAT_WE_HAVE_AND_QUESTIONS.md` lines 87, 102.
- `APPROVED_SHIT.md` line 42.

**Template display:** In `ProposalTemplate5.tsx` the placeholder for zero total was changed from `"[PROJECT TOTAL]"` to `"—"`; no remaining literal `"[PROJECT TOTAL]"` in the active template TSX.

---

### 4. How does pricing data flow from Excel upload to PDF output?

- **Excel parsing:**  
  - **File:** `services/proposal/server/excelImportService.ts`.  
  - **Entry:** Excel upload is triggered from the app; the service reads workbook sheets, parses LED sheet and Margin Analysis, and returns structured data (including `pricingDocument` and `marginAnalysis`).

- **Where parsed data is stored:**  
  - **In-memory / form state:** `details.pricingDocument` (PricingDocument), `details.marginAnalysis` (array), `details.internalAudit` (JSON).  
  - **Database:** `prisma/schema.prisma` — `Proposal.pricingDocument` (Json), `Proposal.marginAnalysis` (Json), `Proposal.internalAudit` (String, JSON stringified).  
  - **Auto-save:** `lib/useAutoSave.ts` lines 86–88 sends `pricingDocument`, `marginAnalysis`, `pricingMode` in the PATCH body.  
  - **API:** `app/api/projects/[id]/route.ts` lines 106–107, 194–196 accept and persist `pricingDocument`, `marginAnalysis`, `pricingMode`.

- **What reads that data when generating the PDF:**  
  - **API:** `app/api/proposal/generate/route.ts` POST calls `generateProposalPdfServiceV2(req)`.  
  - **Service:** `services/proposal/server/generateProposalPdfServiceV2.ts` — receives request body (ProposalType), optionally sanitizes with `sanitizeForClient`, then renders the template with that data (line 55–56: `ReactDOMServer.renderToStaticMarkup(ProposalTemplate(sanitizedBody))`).  
  - **Template:** `app/components/templates/proposal-pdf/ProposalTemplate5.tsx` (and any other template) receives the full proposal object; it reads `details.screens`, `details.quoteItems`, `details.internalAudit`, `details.pricingDocument`, and root-level `marginAnalysis` (if passed) to render pricing tables and totals.

- **Mapping step:**  
  - **Excel → pricing tables:** `services/proposal/server/excelImportService.ts` builds `pricingDocument` (tables with items, subtotals, grandTotals) and `marginAnalysis` (grouped rows).  
  - **Template:** ProposalTemplate5 uses `details.quoteItems` (and optional `details.screens` + `internalAudit`) for line items; for Mirror mode it can use `pricingDocument.tables` and/or `marginAnalysis`.  
  - **Per-screen mapping:** In Mirror mode, `pricingDocument.tables` is an array of pricing tables; template and Math step map by index (e.g. `pricingDocument.tables[idx].grandTotal`) to screen/row.

---

### 5. Where is the Margin Analysis sheet parsed?

- **File:** `services/proposal/server/excelImportService.ts`.  
- **Function that reads section headers and selling prices:**  
  - **`parseMarginAnalysisRows(data: any[][])`** — lines 499–614.  
  - **Behavior:** Finds header row by looking for "cost" and "selling price" / "sell price" (lines 527–528). Determines column indices for cost, sell, margin amount, margin %, label. Iterates rows (from header + 1), tracks `currentSection` from section headers, skips total-like and alternate rows, pushes rows with name, cost, sell, marginAmount, marginPct, rowIndex, section, isAlternate, isTotalLike.  
- **`groupMarginAnalysisRows(rows)`** — lines 617–655. Groups parsed rows by section and builds items with name, sellingPrice, isIncluded.  
- **`pickBestMarginRow(marginRows, screenName)`** — lines 658–673. Picks best matching margin row for a screen name (for mapping to screens).  
- **Call site:** Line 165: `const marginRows = marginSheet ? parseMarginAnalysisRows(marginData) : [];` then line 432: `const marginAnalysis = groupMarginAnalysisRows(marginRows);`; result is attached to the import result (line 464) and persisted.

---

## PROJECT & STATE

### 6. When a new project is created, what database record is created?

- **Model:** `Proposal` in `prisma/schema.prisma` (lines 81–161).  
- **Create path:** New project is created via `app/api/workspaces/create/route.ts` (e.g. POST with `createInitialProposal: true`), which creates a `Proposal` record.  
- **Schema (all fields):**  
  `id`, `workspaceId`, `clientName`, `clientLogo`, `clientAddress`, `clientCity`, `clientZip`, `venue`, `documentMode`, `documentConfig`, `quoteItems`, `paymentTerms`, `additionalNotes`, `signatureBlockText`, `customProposalNotes`, `status`, `calculationMode`, `internalAudit`, `clientSummary`, `aiThreadId`, `aiWorkspaceSlug`, `taxRateOverride`, `bondRateOverride`, `shareHash`, `shareExpiresAt`, `sharePasswordHash`, `structuralTonnage`, `reinforcingTonnage`, `isLocked`, `lockedAt`, `documentHash`, `parentProposalId`, `versionNumber`, `createdAt`, `updatedAt`, `verificationManifest`, `reconciliationReport`, `verificationStatus`, `aiFilledFields`, `verifiedFields`, `lastVerifiedBy`, `lastVerifiedAt`, `pricingDocument`, `marginAnalysis`, `pricingMode`, `insuranceRateOverride`, `overheadRate`, `profitRate`, `signerName`, `signerTitle`, and relations (`manualOverrides`, `proposalVersions`, `signatureAuditTrail`, `comments`, `activityLogs`, `changeRequests`, `versions`, `workspace`, `screens`, `snapshots`, `rfpDocuments`).

---

### 7. Where is the client name field populated? (Setup form → save → PDF)

- **User input:** Setup/Step 1 form has "Client Name" bound to **`receiver.name`** (e.g. in `Step1Ingestion.tsx` or form schema; FormInput `receiver.name`).  
- **Load from DB:** `app/projects/[id]/page.tsx` — `mapDbToFormSchema(dbProject)` (lines 14–109) sets `receiver.name = dbProject.clientName || ""` (line 26).  
- **Save:** `lib/useAutoSave.ts` (lines 74–89) sends `receiverData: formData.receiver` (and `proposalName`) in PATCH body. It does **not** send a top-level `clientName` field.  
- **API:** `app/api/projects/[id]/route.ts` — `effectiveClientName = clientName || proposalName` (line 174); `clientName` is from `body.clientName` (line 84). So with current auto-save payload, only `proposalName` is sent, and the DB `clientName` is updated from **proposalName**, not from `receiverData.name`. Address fields are mapped from `receiverData`: `clientAddress = body.clientAddress ?? receiverData?.address`, etc. (lines 111–114).  
- **PDF:** Template reads client/purchaser name from the proposal object passed at render time: e.g. `receiver?.name` in `app/components/templates/proposal-pdf/ProposalTemplate5.tsx` (line 532: `receiver?.name || "Client Name"`). That data comes from the request body to the PDF API (full proposal state), which was loaded from DB where `receiver.name` is hydrated from `dbProject.clientName` when loading the project page.

**Fact:** The PATCH handler does **not** set `clientName` from `receiverData.name`; it only sets `clientName` from `body.clientName` or `body.proposalName`. So the “Client Name” form field (`receiver.name`) is only persisted to the DB as `clientName` if some other code path sends `clientName` in the body (e.g. a different save flow). Auto-save sends `receiverData` and `proposalName` only.

---

### 8. What causes a new project to load with a stale/old Excel file?

- **Where Excel preview is stored (Prompt 55 — database only):**
  - **In-memory:** React state in `contexts/ProposalContext.tsx` — `excelPreview`, `excelSourceData`, etc. Only used for NEW projects between upload and first save.
  - **Database:** `pricingDocument`, `marginAnalysis`, `screens`, and `internalAudit` are persisted via the follow-up PATCH on project creation and auto-save thereafter. For existing projects, form data is hydrated from the database via `WizardWrapper`'s `reset(initialData)`.
  - **No localStorage:** All `anc:excelPreview:*` localStorage keys were removed in Prompt 55. A one-time cleanup effect removes any old keys on app load.

- **Why a new project could see old Excel (fixed):**
  - A **scoped** `ProposalContextProvider` in `app/components/ProposalPage.tsx` wraps the editor with `initialData` and `projectId`. When `projectId` changes or is `"new"`, a cleanup effect clears all Excel state (`excelPreview`, `excelSourceData`, etc.) so the new project starts with an empty upload zone.
  - For existing projects, structured data (screens, pricingDocument, marginAnalysis) is hydrated from the database — the visual ExcelPreview grid is not reconstructed since the structured data is what matters.

---

## TEMPLATES & MODES

### 9. Where is the logic that switches between Budget / Proposal / LOI?

- **Mode resolution:** `lib/documentMode.ts` — `resolveDocumentMode(details)` (lines 3–14). Returns `details.documentMode` if it is BUDGET/PROPOSAL/LOI, else infers from `documentType` or `pricingType`.  
- **Header and intro in template:** `app/components/templates/proposal-pdf/ProposalTemplate5.tsx`:  
  - Line 25: `import { resolveDocumentMode } from "@/lib/documentMode";`  
  - Line 45: `const documentMode = resolveDocumentMode(details);`  
  - Line 46: `const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : documentMode === "PROPOSAL" ? "SALES QUOTATION" : "LETTER OF INTENT";`  
  - Line 47: `const isLOI = documentMode === "LOI";`  
  - Lines 531–532: Header shows `docLabel` and `receiver?.name || "Client Name"`.  
  - Lines 539–558: Intro paragraph branches on `documentMode` (LOI vs PROPOSAL vs default budget).  
- **Which sections show/hide:** Controlled by `details` flags passed in the proposal payload (e.g. `showPaymentTerms`, `showSignatureBlock`, `showExhibitA`, `showExhibitB`, `showSpecifications`, `showNotes`, `showScopeOfWork`). Template uses these booleans (e.g. `showPaymentTerms && (...)`, `showSignatureBlock && (...)`). Defaults per mode are in `lib/documentMode.ts` — `applyDocumentModeDefaults(mode, current)` (lines 26–60).  
- **Payload for PDF:** In `generateProposalPdfServiceV2.ts` and in context when calling the PDF API, `body.details` includes `documentMode` and the show/hide flags; server renders the same template (ProposalTemplate5) with that payload.

---

### 10. Where is the Exhibit A summary table generated?

- **File:** `app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs.tsx`.  
- **Component:** `ExhibitA_TechnicalSpecs` (default export, line 33).  
- **Column headers (lines 52–59):**  
  - "Display Name" (col-span-3)  
  - "Dimensions" (col-span-2)  
  - "Pitch" (col-span-2)  
  - "Resolution" (col-span-2)  
  - "Brightness" (col-span-2)  
  - "Qty" (col-span-1)  
- **Rows:** Lines 64–106 — map over `details?.screens || []`; each row uses `screen.externalName` or `screen.name`, dimensions (height × width), pitch (formatPitchMm), resolution (pixelsH × pixelsW), brightness, quantity.  
- **Used by:** ProposalTemplate5 (and possibly other templates) imports and renders `<ExhibitA_TechnicalSpecs />` or equivalent when Exhibit A is enabled.

---

## FEATURE FLAGS

### 11. Is there a feature flag system? Where is it configured?

**Yes.**

- **File:** `lib/featureFlags.ts`.  
- **Export:** `export const FEATURES = { ... } as const;`  
- **Flags:** `INTELLIGENCE_MODE`, `RFP_CHAT`, `AI_AUDIT`, `DOCUMENT_INTELLIGENCE`, `DASHBOARD_CHAT`, `STRATEGIC_MATCH_BADGE`, `CLIENT_REQUESTS`, `VERIFICATION_STUDIO` (all `false`).  
- **Usage:** Components import `FEATURES` and conditionally render (e.g. `FEATURES.DASHBOARD_CHAT`, `FEATURES.CLIENT_REQUESTS`).

---

### 12. List every UI component/section that is non-functional or placeholder and their file paths

| Feature | File(s) | How disabled |
|--------|---------|--------------|
| Dashboard “Ask the Intelligence Core” search bar | `app/components/DashboardChat.tsx` (component); rendered from `app/projects/page.tsx` | Wrapped in `FEATURES.DASHBOARD_CHAT` in `app/projects/page.tsx` — not rendered when false. |
| RFP upload (empty state + “Add RFP” in preview) | `app/components/proposal/form/wizard/steps/Step1Ingestion.tsx` | RFP card and “Add RFP” block wrapped in `FEATURES.DOCUMENT_INTELLIGENCE`. |
| Intelligence mode (sidebar/toggle) | `app/components/reusables/ModeToggle.tsx`, `app/components/layout/StudioLayout.tsx` | `showIntelligence={FEATURES.INTELLIGENCE_MODE}`; when false, only Drafting shown. |
| 17/20 Strategic Match badge | `app/components/ProposalPage.tsx` | Badge wrapped in `FEATURES.STRATEGIC_MATCH_BADGE`. |
| Client Requests (Review step) | `app/components/proposal/form/wizard/steps/Step4Export.tsx` | Entire Client Requests card wrapped in `FEATURES.CLIENT_REQUESTS`. |
| Verification Studio (Review step) | `app/components/proposal/form/wizard/steps/Step4Export.tsx` | Entire Verification Studio card wrapped in `FEATURES.VERIFICATION_STUDIO`. |
| Product Type field (screen editor) | `app/components/proposal/form/SingleScreen.tsx` | Rendered only when `FEATURES.INTELLIGENCE_MODE`. |

---

## QUICK REFERENCE

### 13. Tech stack

- **Framework:** Next.js (App Router).  
- **UI:** React.  
- **Database:** PostgreSQL (Prisma `provider = "postgresql"` in `prisma/schema.prisma`).  
- **ORM:** Prisma (`prisma/client`, `@prisma/client` in package.json).  
- **PDF:** Puppeteer / puppeteer-core + @sparticuz/chromium; React rendered to static HTML then PDF via headless browser.  
- **Forms:** react-hook-form, @hookform/resolvers, Zod (ProposalSchema).  
- **Styling:** Tailwind CSS.  
- **Package manager:** pnpm (package.json `"packageManager": "pnpm@10.28.2"`).

---

### 14. How is the app deployed?

- **Docker:** `Dockerfile` at project root — multi-stage build (node:22-bullseye-slim), `next build`, production stage runs `docker-entrypoint.sh`, EXPOSE 3000.  
- **No `vercel.json` or `easypanel` config** in the repo.  
- **Comments:** `generateProposalPdfServiceV2.ts` and `PROJECT_OVERVIEW.md` mention Browserless (BROWSERLESS_URL) and production Chromium path; deployment can use Docker + optional separate Browserless for PDF.

---

### 15. Main API route that handles PDF export/download

- **Route:** `app/api/proposal/generate/route.ts`.  
- **Method:** POST.  
- **Handler:** `export async function POST(req: NextRequest)` — calls `generateProposalPdfServiceV2(req)` and returns its result.  
- **Service:** `services/proposal/server/generateProposalPdfServiceV2.ts` — `generateProposalPdfServiceV2(req)` builds HTML from the proposal template, uses Puppeteer to generate PDF, returns NextResponse with PDF body.  
- **Client constant:** `lib/variables.ts` line 18: `export const GENERATE_PDF_API = "/api/proposal/generate";`.  
- **Download (bundle):** Context in `contexts/ProposalContext.tsx` exposes `downloadPdf`, `downloadBundlePdfs`; they call the same or related generate API and then trigger download (e.g. blob URL). Export UI is in `app/components/proposal/form/wizard/steps/Step4Export.tsx`.

---

## Diagnostic Q&A (follow-up)

### 1. What generates the final downloadable PDF? (A/B/C/D)

**A) The React template rendered to HTML then converted to PDF via Puppeteer.**

- **Export function:** `generateProposalPdfServiceV2` in **`services/proposal/server/generateProposalPdfServiceV2.ts`** (lines 32–214).
- **Flow:**  
  - Line 55–56: `ReactDOMServer.renderToStaticMarkup(ProposalTemplate(sanitizedBody))` → HTML string.  
  - Line 64: HTML wrapped in `<!doctype html>...<body>...</body></html>`.  
  - Lines 66–104: Puppeteer (puppeteer-core) connect or launch.  
  - Lines 111–122: `page.setContent(html, ...)`, then Tailwind CDN injected.  
  - Lines 153–165: `page.pdf({ format: "a4", ... })` → PDF buffer.  
  - Lines 167–175: Returns `NextResponse` with PDF blob and `Content-Disposition: attachment; filename=proposal.pdf`.
- **API route that calls it:** **`app/api/proposal/generate/route.ts`** — POST handler calls `generateProposalPdfServiceV2(req)`.

Not B (no jsPDF/pdfkit/pdfmake). Not C (server-side headless browser, not user’s browser print). Not D.

---

### 2. In ProposalTemplate5.tsx, where is the PROJECT PRICING table rendered? Data source?

- **Section title:** Line 568: `SectionHeader title={isLOI ? "Detailed Breakdown" : "Project Pricing"}`. The table is inside **`PricingSection`** (lines 279–417).
- **Exact JSX for header and rows:**  
  - **Header (Description / Amount):** Lines 363–369 — `grid grid-cols-12`, `col-span-8` “Description”, `col-span-4 text-right` “Amount”.  
  - **Rows:** Lines 373–398 — `lineItems.map((item, idx) => (...))` — each row: `col-span-8` (item.name, item.description), `col-span-4 text-right` (formatCurrency(item.price)).  
  - **Total row:** Lines 401–414 — “Project Total” + subtotal (hidden when `isLOI`).
- **Data source variable:** **`lineItems`** (array of `{ key, name, description, price, isAlternate }`).
- **Where `lineItems` comes from:** Lines 284–358. If **`details.quoteItems`** has length > 0, `lineItems` = mapped `quoteItems` (locationName, description, price, etc.). Else fallback: mapped **`screens`** + **`internalAudit?.perScreen`** (sell price) plus **`internalAudit?.softCostItems`**. So the primary data source is **`(details as any)?.quoteItems`**; variable used in the block is **`quoteItems`** (line 284).

---

### 3. Where does Margin Analysis / Excel pricing get stored? Shape of pricingDocument?

- **Stored in:** **`Proposal.pricingDocument`** (Prisma, Json) and in form state **`details.pricingDocument`**. API: **`app/api/projects/[id]/route.ts`** lines 106, 194 — accepts and persists `pricingDocument`.
- **Type/interface:** **`types/pricing.ts`** — **`PricingDocument`** (lines 79–101):
  - `tables: PricingTable[]`
  - `mode: "MIRROR" | "CALCULATED"`
  - `sourceSheet: string`
  - `currency: "CAD" | "USD"`
  - `documentTotal: number`
  - `metadata: { importedAt, fileName, tablesCount, itemsCount, alternatesCount }`
- **`pricingDocument.tables`:** Array of **`PricingTable`** (lines 44–76):
  - `id: string`, `name: string`, `currency: "CAD" | "USD"`
  - `items: PricingLineItem[]` — each item: `description`, `sellingPrice`, `isIncluded`, `sourceRow?`
  - `subtotal`, `tax: TaxInfo | null`, `bond`, `grandTotal`
  - `alternates: AlternateItem[]`
  - `sourceStartRow?`, `sourceEndRow?`
- **Yes:** Each table has a name/header (`name`), line items with descriptions and amounts (`items[].description`, `items[].sellingPrice`), and a grand total (`grandTotal`).

---

### 4. Does the PDF template iterate over pricingDocument.tables?

**No.** In **`app/components/templates/proposal-pdf/ProposalTemplate5.tsx`** there is no reference to `pricingDocument` or `details.pricingDocument`. The only pricing table rendered is **`PricingSection`**, which uses **`details.quoteItems`** (or fallback screens + internalAudit + softCostItems) to build **`lineItems`** and renders a single table with one “Project Total” row at the bottom. So the template does **not** iterate over `pricingDocument.tables`; it only renders one table from quoteItems/derived lineItems and one total row.

---

### 5. Exhibit A summary table — where, column headers, RESOLUTION/BRIGHTNESS/QTY merging?

- **Where:** **`app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs.tsx`** — default export **`ExhibitA_TechnicalSpecs`**.
- **Column headers (exact code):** Lines 52–59 — a single **`grid grid-cols-12`** row with:
  - `col-span-3`: “Display Name”
  - `col-span-2`: “Dimensions”
  - `col-span-2`: “Pitch”
  - `col-span-2`: “Resolution”
  - `col-span-2`: “Brightness”
  - `col-span-1`: “Qty”
- **RESOLUTION, BRIGHTNESS, QTY merging:** In code they are **separate** `<div>`s (lines 56–58). There is no single string that concatenates them. If they appear as one string on the page, it is likely CSS (e.g. narrow width, `whitespace-nowrap`, or overflow) causing them to run together visually, not a variable that merges the three values.

---

### 6. Document mode in PDF template — header, intro, payment terms, etc.

All in **`app/components/templates/proposal-pdf/ProposalTemplate5.tsx`**:

- **Mode variable:** Line 45: `const documentMode = resolveDocumentMode(details);` (from **`lib/documentMode.ts`**).
- **Header text:** Line 46: `const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : documentMode === "PROPOSAL" ? "SALES QUOTATION" : "LETTER OF INTENT";`  
  Rendered at line 531: `{docLabel}`.
- **Intro paragraph:** Lines 539–558 — inside `showIntroText`:  
  - If `customIntroText` (i.e. `details.introductionText`) is non-empty → use it.  
  - Else if `documentMode === "LOI"` → hardcoded “This Sales Quotation establishes…” with purchaserName, purchaserAddress, ancAddress, displayTypeLabel.  
  - Else if `documentMode === "PROPOSAL"` → “ANC is pleased to present the following proposal for … per the specifications and pricing below.”  
  - Else (Budget) → “ANC is pleased to present the following … budget to … per the specifications below.”
- **Payment terms / signatures:** Lines 97–98: `showPaymentTerms = (details as any)?.showPaymentTerms ?? true`, `showSignatureBlock = (details as any)?.showSignatureBlock ?? true`.  
  Used at lines 577 (`showPaymentTerms && <PaymentTermsSection />`) and 631 (`showSignatureBlock && <SignatureBlock />`).

---

### 7. Where does the LOI legal paragraph text come from?

- **In template:** **`app/components/templates/proposal-pdf/ProposalTemplate5.tsx`** lines 541–548.  
  - If **`(details as any)?.introductionText`** is set, that is used as the intro (line 542–543).  
  - Else, for LOI, the hardcoded paragraph is used: “This Sales Quotation establishes the terms by which …” (lines 544–548).
- **Editable in UI:** **`app/components/proposal/TextEditorPanel.tsx`** — field `details.introductionText` (lines 27, 62–71). So it is **not** only hardcoded: it can be overridden per project via Document Text Settings; the template reads `details.introductionText`. Stored as part of proposal form state (and persisted via PATCH to **`app/api/projects/[id]/route.ts`**; `documentConfig` is persisted and may hold doc-level text — the form’s `details` are part of the payload).

---

### 8. Exhibit A column widths — what sets them? Why is Display Name narrow?

- **What sets them:** **Tailwind CSS** — no table library, no inline width values. **`ExhibitA_TechnicalSpecs.tsx`** uses **`grid grid-cols-12`** (lines 52, 89) and **`col-span-*`** on each cell: Display Name **col-span-3**, Dimensions **col-span-2**, Pitch **col-span-2**, Resolution **col-span-2**, Brightness **col-span-2**, Qty **col-span-1**. So column widths are 3/12, 2/12, 2/12, 2/12, 2/12, 1/12.
- **Why Display Name is “narrow”:** Display Name gets **3/12 (25%)** of the grid; the other five columns share 9/12 (75%). So relative to the rest, it’s the widest single column but still only one-quarter of the table; if content is long, it can feel narrow. No other code overrides this (e.g. no min-width on other columns that would squeeze Display Name).

---

## Prompts (ready to implement)

### Prompt 10 (REVISED) — LOI Header Paragraph Field

**FILE:** The Document Text Settings section in **Step2Intelligence.tsx** (or wherever the Budget/Proposal/LOI tabs with Payment Terms, Notes, etc. are rendered). If Document Text is in a separate panel, use **`app/components/proposal/TextEditorPanel.tsx`** (which already has `details.introductionText` for the intro).

**ADD:** A new editable text field at the **TOP** of the **LOI** tab called **"LOI Header Text"**.

**Default value (pre-filled):**
"This Sales Quotation will set forth the terms by which [Purchaser Name] ("Purchaser") located at [Purchaser Address] and ANC Sports Enterprises, LLC ("ANC") located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 (collectively, the "Parties") agree that ANC will provide following LED Display and services (the "Display System") described below for the [Project Name]."

**Requirements:**
- [Purchaser Name] should auto-populate from the Client Name field in Setup
- [Purchaser Address] should auto-populate from the Address fields in Setup
- [Project Name] should auto-populate from the Project Name field
- The user must be able to edit the entire paragraph manually
- Store per-project in the database (same pattern as paymentTerms, additionalNotes in **`app/api/projects/[id]/route.ts`**)
- Include a "Load default" link (same pattern as Signature Legal Text)
- This field should **ONLY** appear in the LOI tab, not Budget or Proposal

This text becomes the opening paragraph of the LOI PDF, replacing the current incomplete legal paragraph in **ProposalTemplate5.tsx** (lines 544–548).

---

### Prompt 18 (REVISED with file paths) — Fix Proposal Header

**FILE:** **`app/components/templates/proposal-pdf/ProposalTemplate5.tsx`** (or wherever the document mode determines header text).

**BUG:** When document mode is "Proposal", the PDF header says **"SALES QUOTATION"**. It should say **"PROPOSAL"**.

Find the conditional that sets the header text based on document mode. It is at **line 46**:
`const docLabel = documentMode === "BUDGET" ? "BUDGET ESTIMATE" : documentMode === "PROPOSAL" ? "SALES QUOTATION" : "LETTER OF INTENT";`

Change it to:
- Budget → "BUDGET ESTIMATE"
- Proposal → **"PROPOSAL"** (currently wrong: shows "SALES QUOTATION")
- LOI → "LETTER OF INTENT"

Also check the intro paragraph text for Proposal mode (lines 549–551). It should say:
"ANC is pleased to present the following **proposal** for [Client Name] per the specifications and pricing below."

The word "proposal" (not "budget", not "Sales Quotation") should appear in both the header and the intro text.
