# Handover: Hybrid Master Template & Next Steps

**Date:** February 3, 2026  
**Source:** Template Design and Development Meeting (Natalia, Alison, Ahmed)  
**Status:** Spec locked; implementation pending

---

## Summary

The team agreed on **one unified “Hybrid” Master Template** for all three deliverables (Budget, Proposal, LOI). The design combines:

- **Base:** Modern template (clean, preferred by Ahmed and Alison)
- **Tables:** Modern styling (blue headers, zebra striping)
- **Footer:** Bold template footer (dark blue slash/accent at bottom)
- **Pricing/Spec text:** Classic hierarchy (display name ALL CAPS/BOLD, specs smaller underneath)
- **Layout:** Tightened everywhere (9–10pt fonts, reduced margins, minimal row padding) so more content fits on the first page

Notes, Scope of Work, and Signature Lines must be **optional for all document types** (Budget, Proposal, LOI), not tied to LOI only.

---

## What Was Agreed (from transcript)

| Item | Decision |
|------|----------|
| Template count | One template for Budget, Proposal, and LOI |
| Header | Logo left-aligned with content margin (no extra indent) |
| Margins | Smaller overall; first page should fit: title, pricing, payment terms, notes, signatures |
| Font size | 9pt or 10pt for pricing, payment terms, signatures |
| Pricing table | Display name UPPERCASE + BOLD; technical specs smaller, tight line-height below |
| Row styling | Alternating gray rows; no heavy borders |
| Spec tables | Modern design (blue headers, two-column layout) for all three doc types |
| Footer | Bold-style footer (company name + dark blue slash accent) |
| PDF artifacts | Remove browser print headers/footers (timestamps, URLs) |
| Sections | Notes, Scope of Work, Signature Lines = **toggleable for ALL** (Budget, Proposal, LOI) |

---

## Next Steps (implementation)

### 1. Global CSS / PDF output (Prompt 1)

**Goal:** One global theme for PDF with tightened layout and clean print.

- **Theme:** Use Modern as base (colors, table headers); swap in Bold footer (dark blue slash).
- **Density:** Reduce page margins; set base font to 9pt/10pt for body, pricing, payment terms, signatures.
- **Logo:** Header padding so logo is flush left with content margin.
- **Print:** Add `@media print` rules to suppress browser headers/footers (timestamp, URL).

**Files to touch:**

- `app/components/templates/proposal-pdf/ProposalLayout.tsx` – global wrapper, print styles
- `app/components/templates/proposal-pdf/PdfStyles.ts` – shared PDF colors/typography
- `services/proposal/server/generateProposalPdfServiceV2.ts` – disable Puppeteer `displayHeaderFooter` (or use minimal footer only); reduce `margin` in `page.pdf()` options

---

### 2. Pricing table component (Prompt 2)

**Goal:** Classic text hierarchy inside Modern table styling.

- **Description column:**
  - Line 1: Display name **UPPERCASE** and **BOLD**
  - Line 2+: Technical specs in smaller, lighter font, tight line-height
- **Rows:** Zebra striping (alternating gray); remove aggressive borders; reduce row padding to fit more lines per page.

**Files to touch:**

- Where pricing table is rendered in the chosen template (e.g. `ProposalTemplate2.tsx` “Simple” pricing block, or a dedicated component if extracted). Apply the two-line structure and the new row/style rules there.

---

### 3. Business logic – universal sections (Prompt 3)

**Goal:** Notes, Scope of Work, and Signatures available for Budget, Proposal, and LOI.

- **Decouple from document type:** Do not gate these sections on “LOI only” (or “Proposal only”). They are optional for all.
- **State/UI:** Expose three toggles (e.g. “Include Notes”, “Include Scope of Work”, “Include Signature Lines”) for every document type. When unchecked, section is hidden; when checked, section appears with Modern styling.
- **Backend/PDF:** Pass these flags into the template so the same template can show/hide Notes, SOW, and Signatures regardless of Budget vs Proposal vs LOI.

**Files to touch:**

- Proposal/details schema or form state (e.g. `details.showNotes`, `details.showScopeOfWork`, `details.showSignatureBlock`) – ensure they exist and are persisted.
- Export/configuration UI (e.g. Step4Export or equivalent) – show the three checkboxes for all doc types.
- Template component(s) – render Notes, Scope of Work, Signature blocks based on these booleans, not on `documentMode === 'LOI'` (or similar).

---

### 4. Optional: Single “Hybrid” template component

- Either refactor the **default** template (e.g. ProposalTemplate2 or the one used when `pdfTemplate` is 2) into the Hybrid design, **or**
- Add **ProposalTemplate5** as “Hybrid” and switch the default/selector to use it. Then apply steps 1–3 to that single template so one code path owns the unified look.

---

## Reference: existing templates

| File | Role |
|------|------|
| `ProposalTemplate2.tsx` | Classic + Premium (templateId 2 and 4); has Classic text hierarchy and many toggles |
| `ProposalTemplate3.tsx` | Modern; clean, blue accents, card-style sections |
| `ProposalTemplate4.tsx` | Bold; gradient header, dark footer with slash |
| `ProposalLayout.tsx` | Wrapper; fonts, print CSS (page breaks, break-inside-avoid) |
| `generateProposalPdfServiceV2.ts` | Puppeteer PDF; margins, displayHeaderFooter, footerTemplate |

---

## Quick checklist for implementer

- [ ] Reduce PDF page margins in `generateProposalPdfServiceV2.ts`
- [ ] Disable or minimalize Puppeteer header/footer so no timestamp/URL
- [ ] Add/modify `@media print` in ProposalLayout to suppress browser headers/footers
- [ ] Set 9pt/10pt for pricing, payment terms, signatures; tighten row padding
- [ ] Align logo with content margin (header padding)
- [ ] Pricing table: Line 1 = UPPERCASE BOLD name; Line 2+ = smaller specs; zebra rows; no heavy borders
- [ ] Add/use Bold-style footer (dark blue slash) in the chosen template
- [ ] Add three toggles (Notes, Scope of Work, Signatures) for Budget, Proposal, and LOI
- [ ] Template reads toggles from `details` and shows sections for any document type when enabled
- [ ] Confirm CSS page breaks (e.g. in ProposalLayout) still prevent tables from cutting mid-row

---

**Last updated:** February 3, 2026
