# Comprehensive Status Update — All Prompts (1–15)

**Branch:** `phase2/product-database`  
**Date:** February 2026

---

## Prompt 1 — Kill the Stale Excel Bug ✅

**Issue:** New project opened with a previously uploaded Excel (e.g. "Cost Analysis - Indiana Fever") instead of an empty state.

**Done:**
- **ProposalPage.tsx:** Wrapped the project editor in a scoped `ProposalContextProvider` that receives `initialData` and `projectId`, so each project gets fresh context and cleared Excel state.
- **ProposalContext.tsx:** When a project has no Excel (`!details.pricingDocument` and `!marginAnalysis`), Excel state and related localStorage keys are cleared on hydration and on `projectId` change. Storage keys cleared for draft, new, and current/previous project id.

**Result:** New projects start with an empty Setup step ("Drop your Excel here"); no workbook tabs or preview until the user uploads a file.

---

## Prompt 2 — Rename All the Jargon ✅

**Done:**
- **Dashboard greeting:** "Evening User," → time-based "Good morning," / "Good afternoon," / "Good evening," (`app/projects/page.tsx`).
- **New Project modal:** Title "Initialize AI Strategic Hub" → **"New Project"**. Description → **"Start a new proposal"**. Button **"Initialize Project"** → **"Create Project"**. Loading text → "Creating your project..."
- **Editor Step 1:** "Ingestion Studio" → **"Import"**. Subtitle when no Excel → "Drop your Excel here or upload to get started" (removed "Reviewing Excel Data").
- **Project cards:** Fallback "Standard Project Resolution" → **"Budget"** / **"Proposal"** / **"LOI"** from `project.documentMode` (`ProjectCard.tsx`).

---

## Prompt 3 — Hide Phase 2 Features ✅

**Done:**
- **lib/featureFlags.ts:** Added `DASHBOARD_CHAT`, `STRATEGIC_MATCH_BADGE`, `INTELLIGENCE_MODE`, `DOCUMENT_INTELLIGENCE`, later `CLIENT_REQUESTS`, `VERIFICATION_STUDIO` (all `false`).
- **Dashboard:** "Ask the Intelligence Core anything..." bar hidden unless `FEATURES.DASHBOARD_CHAT` is true.
- **Editor:** "17/20 Strategic Match" badge hidden unless `FEATURES.STRATEGIC_MATCH_BADGE` is true.
- **Intelligence mode:** `ModeToggle` has `showIntelligence={FEATURES.INTELLIGENCE_MODE}`; when false, only Drafting is shown. `StudioLayout` resets view to form when switching away from AI.
- **RFP upload:** Empty-state RFP card and "Add RFP" in preview mode wrapped in `FEATURES.DOCUMENT_INTELLIGENCE`.

---

## Prompt 4 — Fix Preview Placeholders ✅

**Done:**
- **ProposalTemplate5.tsx:** Replaced `[PROJECT TOTAL]` with **"—"** for zero/negligible total and subtotal. Line item prices use "—" when zero.
- **ProposalTemplate2.tsx:** `[CLIENT ADDRESS]` → **"—"** when address empty.
- **lib/helpers.ts:** `formatCurrency` uses placeholder for `|amount| < 0.01` when placeholder is provided.
- **PdfViewer.tsx:** When `!excelPreview`, shows placeholder: "Live Preview" + "Upload an Excel file to see your proposal preview here."

---

## Prompt 5 — Hide Phase 2 Upload Zone (Option A) ✅

**Done:**
- **Step1Ingestion.tsx:** Empty state shows only the Excel upload card: full width, centered in a `max-w-lg` container. RFP card remains behind `FEATURES.DOCUMENT_INTELLIGENCE`. "Vault Empty" removed; when RFP is shown, label is "X file(s) uploaded" or nothing.

---

## Prompt 6 — Fix $0 and Placeholder Displays ✅

**Done:**
- **SingleScreen.tsx:** Screen list price when 0 → "—". Margin when 0% → "—". Price/SqFt when 0 → "—". "Add dimensions to calculate" only when `isMissingDimensions`; hidden when both width and height are set.
- **Step3Math.tsx:** All KPI and total values use "—" when zero/negligible (Selling Price/SqFt, Structural Labor, Shipping, Final Client Total, per-screen and project totals).
- **Step4Export.tsx:** Copy for missing total → "Project total has no value yet. Check Excel mapping or screen pricing in the Math step."

---

## Prompt 7 — Clean Up "AI Analysis" and Match Badge ✅

**Done:**
- **StudioHeader.tsx:** Match badge shown only when `completionRate > 0`. Label → **"X% filled"** with tooltip "Percentage of required proposal fields filled (from Excel or form)."
- **Step2Intelligence.tsx:** "AI Analysis · X screens detected" → **"Screen Configuration"** and badge **"X screen(s)"**. Sparkles icon removed from that header.

---

## Prompt 8 — Screen Editor Cleanup ✅

**Done:**
- **SingleScreen.tsx:** Product Type field shown only when `FEATURES.INTELLIGENCE_MODE`. Outlet Dist (ft) moved to Advanced Settings. "Add dimensions to calculate" conditional (same as Prompt 6).
- **ProposalTemplate5.tsx:** `getScreenHeader` prefers `externalName` (PDF/Client Name), normalizes " -" to " - ", returns ALL CAPS. Quote line item header normalized; screen-based label uses externalName first.

---

## Prompt 9 — Fix Truncated ORIGINAL Labels (Option B) ✅

**Done:**
- **PricingTableEditor.tsx:** Replaced side-by-side "Original:" + truncated name + input with: "Original" label, full table name on next line (no truncation, `break-words`), then input + Reset. Full original name always visible.

---

## Prompt 10 — LOI Header Paragraph Field

**Status:** Not implemented in this pass.  
**Required:** Editable "LOI Header Text" at the TOP of the LOI tab in Document Text Settings, with default legal boilerplate including [Purchaser Name] and [Purchaser Address]. Needs location in Document Text Settings (e.g. Screens/Step2 or Step4) and schema/DB if stored per project.

---

## Prompt 11 — Data Persistence Check

**Status:** Verified in code; not end-to-end tested.  
**Findings:** `app/api/projects/[id]/route.ts` persists `paymentTerms`, `additionalNotes`, `customProposalNotes`, and `tableHeaderOverrides`. `mapDbToFormSchema` in `app/projects/[id]/page.tsx` maps these from DB. Scope of Work and Signature Legal Text are likely under the same `details` or document config; recommend a quick test: fill all Document Text fields, navigate away, return and confirm values persist.

---

## Prompt 12 — CRITICAL: Fix $0.00 on Individual Screens in Math Step ✅

**Done:**
- **Step3Math.tsx:** In "Excel Values Summary" (Mirror mode), each row’s Client Total now uses **pricing document** when present: `pricingDocument.tables[idx].grandTotal` for that index, else `screen.breakdown?.finalClientTotal`. So per-screen amounts come from Margin Analysis tables; project total at bottom unchanged (e.g. $507,262.53). Matching is by index (table order = screen order).

---

## Prompt 13 — Hide Phase 2 Features on Review Step ✅

**Done:**
- **lib/featureFlags.ts:** `CLIENT_REQUESTS: false`, `VERIFICATION_STUDIO: false`.
- **Step4Export.tsx:** "Client Requests · X open" section wrapped in `FEATURES.CLIENT_REQUESTS`. "Verification Studio" section wrapped in `FEATURES.VERIFICATION_STUDIO`. When Verification Studio is enabled, title shown as **"Compare"** with same description.

---

## Prompt 14 — Math Step Cleanup ✅

**Done:**
- **Step3Math.tsx:** Subtitle "Phase 3: Automated Engineering & Math" → **"Math Verification"**. Structural Labor and Shipping & Logistics cards hidden when value is 0 or &lt; 0.01. Final Client Total card always shown with actual total or "—". Sparkle icon given tooltip: "Natalia Math Engine — strategic pricing and margin verification."

---

## Prompt 15 — Export Bundle Label ✅

**Done:**
- **Step4Export.tsx:** Global Export Bundle description updated to: **"Downloads Budget PDF, Proposal PDF, LOI PDF, and Internal Audit Excel"** (option B — 4 files). No behavior change.

---

## Summary Table

| Prompt | Title                         | Status   |
|--------|-------------------------------|----------|
| 1      | Stale Excel bug               | Done     |
| 2      | Rename jargon                 | Done     |
| 3      | Hide Phase 2 features         | Done     |
| 4      | Preview placeholders          | Done     |
| 5      | Hide RFP upload zone          | Done     |
| 6      | $0 and placeholder displays   | Done     |
| 7      | AI Analysis / match badge     | Done     |
| 8      | Screen editor cleanup         | Done     |
| 9      | Truncated ORIGINAL labels     | Done     |
| 10     | LOI header paragraph field    | Not done |
| 11     | Data persistence check        | Verified in code |
| 12     | $0 per-screen in Math step    | Done     |
| 13     | Hide Phase 2 on Review step   | Done     |
| 14     | Math step cleanup             | Done     |
| 15     | Export bundle label           | Done     |

---

## Files Touched (Across All Prompts)

- `contexts/ProposalContext.tsx`
- `app/components/ProposalPage.tsx`
- `app/projects/page.tsx`
- `app/components/modals/NewProjectModal.tsx`
- `app/components/ProjectCard.tsx`
- `app/components/layout/StudioHeader.tsx`
- `app/components/layout/StudioLayout.tsx`
- `app/components/reusables/ModeToggle.tsx`
- `app/components/proposal/form/wizard/steps/Step1Ingestion.tsx`
- `app/components/proposal/form/wizard/steps/Step2Intelligence.tsx`
- `app/components/proposal/form/wizard/steps/Step3Math.tsx`
- `app/components/proposal/form/wizard/steps/Step4Export.tsx`
- `app/components/proposal/form/SingleScreen.tsx`
- `app/components/proposal/actions/PdfViewer.tsx`
- `app/components/templates/proposal-pdf/ProposalTemplate5.tsx`
- `app/components/templates/proposal-pdf/ProposalTemplate2.tsx`
- `app/components/proposal/form/sections/PricingTableEditor.tsx`
- `lib/featureFlags.ts` (new)
- `lib/helpers.ts`

---

## Branch Rule

Per workspace rules: **Do not merge** `rag` and `phase2/product-database`. Push only to the current branch (`phase2/product-database`).
