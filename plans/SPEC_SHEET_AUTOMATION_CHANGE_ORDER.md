# Change Order: Spec Sheet Auto-Generator

**Date:** February 18, 2026  
**Requested by:** Natalia Kovaleva  
**Priority:** Urgent (identified by estimators)

---

## Problem Statement

Natalia currently **manually types 50+ spec sheets per project** by copying data from two Excel tabs:
- **FORM** sheet — contains per-display technical specs (manufacturer, model, pixel pitch, resolution, dimensions, weight, power, brightness, shipping, etc.)
- **LED Cost Sheet** — contains pricing, product codes, nit ratings, service type, cost/sqft

Each spec sheet is a formatted document for a single display that clients receive. Some clients want specs in a particular format (e.g., the Jacksonville Jaguars spec sheet PDF).

**Time cost:** ~2-4 hours per project at 50+ displays. Repeated for every revision.

---

## Proposed Solution

### "Spec Sheet Generator" — one-click PDF generation from any ANC Excel workbook

**How it works:**
1. User imports an ANC Cost Analysis Excel (already supported)
2. System auto-detects FORM + LED Cost Sheet + Config tabs
3. For each display found, extracts all technical specifications
4. Generates a branded PDF spec sheet per display (ANC header, formatted table)
5. Outputs a combined PDF (all displays) or individual PDFs (per display)

### Data Fields Extracted Per Display (from FORM + LED Cost Sheet + Config)

| Field | Source |
|---|---|
| Display Name / Use | FORM R4 |
| Manufacturer | FORM R9 |
| Model | FORM R10 |
| Physical Pixel Pitch (mm) | FORM R11 |
| Panel Resolution (W × H) | FORM R13-R14 |
| Spec Width (ft) | FORM R15 |
| Spec Height (ft) | FORM R16 |
| Actual Width (ft) | FORM R28 |
| Actual Height (ft) | FORM R29 |
| Total Resolution (W × H) | FORM R24-R25 |
| Area per Screen (sqft) | FORM R30 |
| Number of Screens | FORM R20 |
| Panel Weight (lbs) | FORM R32 |
| Max Power (W) | FORM R35 |
| Typical Power (W) | FORM R38 |
| Brightness (nits) | FORM R59 |
| Indoor/Outdoor | FORM R70 |
| Panel Size (mm) | FORM R61-R62 |
| Cabinet Count | Config (per section) |
| Controller Config | Config (MCTRL4K, CVT4KS counts) |
| Service Type | LED Cost Sheet (Top/Front-Rear) |
| Cost per SqFt | LED Cost Sheet |
| Shipping Method | FORM R76 |
| IP Rating | Product catalog lookup |
| Color Temperature | Manual input (not in Excel) |

### UI Integration

- **New button** in the proposal Import page: "Generate Spec Sheets"
- Appears after Excel import succeeds
- Shows preview of detected displays with extracted specs
- User can edit/override any field before generating
- "Download All Spec Sheets" → combined branded PDF
- "Download Individual" → one PDF per display

### PDF Template

- ANC branded header (logo, French Blue accents)
- Project name + client name
- Display name as section title
- Two-column spec table (Field | Value)
- Matches the format of the Jacksonville Jaguars spec sheet Natalia shared
- Work Sans typography per Natalia's brand rules

---

## Technical Scope

| Component | Effort |
|---|---|
| **FORM Sheet Parser** — extract per-display specs from FORM tab (column-per-display layout) | 4 hrs |
| **LED Cost Sheet Parser** — extract pricing/service data per display | 3 hrs |
| **Config Sheet Parser** — extract controller/cabinet config per display | 2 hrs |
| **Spec Data Model** — TypeScript interface + validation | 1 hr |
| **PDF Template** — branded spec sheet layout using @react-pdf/renderer | 4 hrs |
| **UI — Generate Button + Preview** — display detected specs, allow edits | 3 hrs |
| **Combined PDF Export** — multi-display document generation | 2 hrs |
| **Testing** — against Ravens, Jaguars, and at least 2 other workbooks | 3 hrs |
| **Edge cases** — missing fields, different Excel layouts, formula resolution | 2 hrs |
| **Total** | **24 hrs** |

---

## Delivery

- **Phase 1 (Day 1-2):** Parser + data extraction working against Ravens + Jaguars workbooks
- **Phase 2 (Day 2-3):** PDF template + UI integration + export
- **Phase 3 (Day 3):** Testing, edge cases, deploy

**Estimated delivery: 3 working days from approval**

---

## Dependencies

- Need the **Jacksonville Jaguars spec sheet PDF** from Natalia (to match exact output format)
- Need the **Jacksonville Jaguars Excel workbook** to validate parser against a second project
- Confirmation on whether color temperature should be a manual input field or if there's another data source

---

## Notes

- This uses the same Excel import pipeline we already have — no new upload flow needed
- The FORM sheet parser is the key new component; the rest leverages existing infrastructure
- Once built, this eliminates 2-4 hours of manual work per project and removes transcription errors
