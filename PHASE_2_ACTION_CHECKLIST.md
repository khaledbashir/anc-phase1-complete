# Phase 2 Intelligence Mode — Action Checklist

**Date:** 2026-02-04  
**Status:** 1 of 5 Items Complete (TTE Extractor Done)  
**Last Updated:** 2026-02-04 13:45 UTC  

---

## SECTION A: READY TO BUILD NOW

These items require no additional information. Can start immediately.

### A.1 Smart Filter — Streaming Parse (Issue #3)

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Implement tournament-style streaming parser | 3 days | Kimi | ⏳ Ready |
| Process 2,500 pages in 300-page chunks | — | — | ⏳ Ready |
| Keep top-scoring pages across all chunks | — | — | ⏳ Ready |
| Output: Best 150 pages from full document | — | — | ⏳ Ready |

**Blockers:** None  
**Decision needed:** Confirm this is the chosen approach (vs. background job)  

---

### A.2 Vision — Smart Ranking + Client Picks (Issue #1, Option B)

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Rank drawing pages by keyword priority | 1 day | Kimi | ⏳ Ready |
| Keywords: "structural attachment", "elevation", "section" = high | — | — | ⏳ Ready |
| Keywords: "legend", "notes", "symbol" = low | — | — | ⏳ Ready |
| UI: Show top 20, let client pick 10 | 1 day | Kimi | ⏳ Ready |

**Blockers:** None  
**Decision needed:** Confirm this approach (vs. progressive on-demand)  

---

### ✅ A.3 TTE — Tonnage Extractor (Issue #2) — COMPLETED 2026-02-04

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Build TTE detector (Thornton Tomasetti keywords) | 0.5 day | Kimi | ✅ DONE |
| Extract tonnage via regex: `(\d+) tons of (reinforcing\|new) steel` | 0.5 day | Kimi | ✅ DONE |
| Handle multiple values (reinforcing + new = total) | — | — | ✅ DONE |
| Calculate steel cost: tons × $3,000 | — | — | ✅ DONE |
| Integrate into RFP upload pipeline | — | — | ✅ DONE |
| Test with WVU sample (34 tons = $102,000) | — | — | ✅ DONE |

**What Was Built:**
- **File:** `services/ingest/tonnage-extractor.ts` (150 lines)
- **Patterns:** Detects "17 tons of reinforcing steel", "17 tons of new steel"
- **Deduplication:** Prevents double-counting overlapping matches
- **Confidence scoring:** 0.95 for exact matches, 0.70 for fallback
- **API Integration:** Merges into `extractedData.rulesDetected.structuralTonnage`

**Test Results (WVU TTE Report L19084.00):**
```
Input: "Approximately 17 tons of reinforcing steel... 17 tons of new steel"
Output: 34 tons total, $102,000 steel cost
Confidence: 0.95
```

**API Response Now Includes:**
```json
{
  "tonnageData": {
    "items": [
      {"tons": 17, "type": "reinforcing", "confidence": 0.95},
      {"tons": 17, "type": "new", "confidence": 0.95}
    ],
    "totalTons": 34,
    "steelCost": 102000,
    "hasTTE": true
  }
}
```

**Blockers:** None  
**Next:** If TTE not detected, system falls back to Gap Fill asking Jeremy for tonnage  

---

### A.4 Regional Labor Multipliers

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Add `laborMultiplier` field to estimator | 0.5 day | Kimi | ⏳ Ready |
| Default 1.0, manual input in Drafting Table | — | — | ⏳ Ready |
| Apply to labor line items | 0.5 day | Kimi | ⏳ Ready |

**Blockers:** None  
**Note:** Basic implementation. Full zip-code lookup = future phase.  

---

### A.5 Per-Screen Verify Button (UX Improvement)

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Add "Verify Screen" button | 0.5 day | Kimi | ⏳ Ready |
| One click verifies all 17 fields for that screen | — | — | ⏳ Ready |
| Still human-verified, just efficient | — | — | ⏳ Ready |
| Reduces 850 clicks → 50 clicks | — | — | ⏳ Ready |

**Blockers:** None  
**Risk:** May violate "no bulk verify" PRD policy. Need Natalia approval?  

---

## SECTION B: BLOCKED — NEED INFORMATION

Cannot proceed without answers from specified people.

---

### B.1 TTE Better Solution (Issue #2, Options B or C)

**What we need:** Sample TTE reports from real projects  
**Who to ask:** Jeremy (Estimator) or Natalia  
**Why:** To see actual table format

| Question | Why It Matters |
|----------|----------------|
| Do TTE reports list tonnage per screen name? | If yes, we can parse by name matching (Option B, 3 days) |
| Are TTE reports scanned PDFs or native text? | If scanned, need Vision OCR (Option C, 5 days) |
| What does a typical TTE table look like? | Need format to build parser |
| How many TTE reports per project? | 1? 5? Affects processing approach |

**Without this:** Stuck with Gap Fill fallback (Option A)  

---

### B.2 Vision Progressive On-Demand (Issue #1, Option C)

**What we need:** Confirmation of chat interaction pattern  
**Who to ask:** Jeremy or UX review  
**Why:** To design on-demand trigger

| Question | Why It Matters |
|----------|----------------|
| Will Jeremy ask "What's on AV-150?" in chat? | If yes, we scan on-demand (Option C, 3 days) |
| Or does he prefer to pick 10 upfront? | If yes, Option B is better |
| How often are drawings referenced after initial scan? | If rarely, on-demand not worth it |

**Without this:** Default to Option B (smart ranking + pick 10)  

---

### B.3 Smart Filter Background Job (Issue #3, Option C)

**What we need:** Infrastructure decisions  
**Who to ask:** DevOps / Natalia  
**Why:** Queue system affects architecture

| Question | Why It Matters |
|----------|----------------|
| Do we have Redis/Bull/BullMQ available? | Needed for background job queue |
| Is async processing acceptable? | User uploads → gets "processing" → notification when ready |
| What's max acceptable wait time? | 30 seconds? 2 minutes? 10 minutes? |

**Without this:** Default to Option B (streaming parse, 3 days)  

---

### B.4 Per-Screen Verify Policy

**What we need:** PRD interpretation  
**Who to ask:** Natalia (product owner)  
**Why:** "No bulk verify" vs. usability conflict

| Question | Why It Matters |
|----------|----------------|
| Is "Verify Screen" (all fields for one screen) acceptable? | Reduces 850→50 clicks, still human-verified per screen |
| Or must every field be individually clicked? | Current implementation — adoption risk |
| Can we A/B test with Jeremy? | See if he actually uses individual verify |

**Without this:** Cannot implement A.5  

---

### B.5 Drawing Priority Keywords

**What we need:** Domain expertise  
**Who to ask:** Jeremy or ANC technical team  
**Why:** To rank which drawings matter most

| Question | Why It Matters |
|----------|----------------|
| What's most important: elevations, plans, or sections? | Affects scoring weights |
| Are structural attachment details critical? | If yes, "structural" = +20 points |
| What sheet prefixes matter most? AV? A? S? | Affects detection patterns |

**Without this:** Use generic weights (A.2)  

---

## SECTION C: DECISION MATRIX

Ahmad: Check one per row, return to Kimi.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ISSUE #1: VISION PAGE LIMIT                                              │
│                                                                          │
│ [ ] A.2 Smart ranking + client picks 10 (2 days)                        │
│     → Build now, no blockers                                             │
│                                                                          │
│ [ ] B.2 Progressive on-demand (3 days) — NEEDS: Jeremy chat pattern     │
│     → Blocked until we know if he asks about drawings in chat           │
│                                                                          │
│ [ ] Increase to 20 pages (1 day, 2x API cost)                           │
│     → Build now, just costs more                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ISSUE #2: TTE TONNAGE MAPPING — ✅ COMPLETED                             │
│                                                                          │
│ [x] A.3 TTE Tonnage Extractor — BUILT 2026-02-04                        │
│     → Regex extraction: "17 tons of reinforcing steel"                  │
│     → Handles multiple values (reinforcing + new = total)               │
│     → WVU test: 34 tons → $102,000 steel cost                           │
│     → Falls back to Gap Fill only if TTE not found                      │
│                                                                          │
│ [ ] B.1 Parse TTE table by name (3 days) — NOT NEEDED                   │
│     → Narrative format works with regex, no complex table parsing needed│
│                                                                          │
│ [ ] C.1 Vision OCR of TTE tables (5 days) — NOT NEEDED                  │
│     → TTE reports are native text, not scanned                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ISSUE #3: SMART FILTER LIMIT                                             │
│                                                                          │
│ [ ] A.1 Streaming parse (3 days)                                        │
│     → Build now, no blockers                                             │
│                                                                          │
│ [ ] B.3 Background chunked job (5 days) — NEEDS: Redis/queue infra      │
│     → Blocked until DevOps confirms queue availability                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ UX: PER-SCREEN VERIFY                                                    │
│                                                                          │
│ [ ] A.5 Add "Verify Screen" button (0.5 days) — NEEDS: Natalia approval │
│     → Blocked until PRD interpretation confirmed                        │
│                                                                          │
│ [ ] Keep individual field verify (0 days)                               │
│     → Current implementation, risk Jeremy rejects tool                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SECTION D: RECOMMENDED PATH (If No Blockers)

If Ahmad wants to ship fast without waiting for answers:

| Priority | Item | Effort | Why |
|----------|------|--------|-----|
| P0 | A.1 Streaming parse | 3 days | Handles 2,500 pages, no blockers |
| P0 | A.2 Smart ranking + pick 10 | 2 days | Better than first 10, no blockers |
| P0 | A.3 TTE Gap Fill | 1 day | Works now, safe fallback |
| P1 | A.4 Regional labor | 1 day | Jeremy asked for this |
| P2 | A.5 Per-screen verify | 0.5 days | If Natalia approves |

**Total: 7.5 days** — All production blockers resolved.

---

## SECTION E: WHO TO ASK FOR WHAT

| Person | Question | Blocking Issue |
|--------|----------|----------------|
| **Jeremy** | Sample TTE reports? | B.1 (TTE better solution) |
| **Jeremy** | Do you ask about drawings in chat? | B.2 (Vision on-demand) |
| **Jeremy** | Which drawing types matter most? | B.5 (Drawing priorities) |
| **Natalia** | Is "Verify Screen" button allowed? | B.4 (Per-screen verify) |
| **DevOps** | Redis/queue available for background jobs? | B.3 (Background parse) |

---

## SECTION F: COMPLETED WORK LOG

| Date | Item | What Was Built | Files |
|------|------|----------------|-------|
| 2026-02-04 | TTE Tonnage Extractor | Pattern-based extraction from Thornton Tomasetti reports. Detects "X tons of reinforcing/new steel", sums multiple values, calculates $3,000/ton cost. Tested on WVU sample: 34 tons → $102,000. | `services/ingest/tonnage-extractor.ts`, `app/api/rfp/upload/route.ts` |

---

## SECTION G: IMMEDIATE NEXT STEPS

1. **Ahmad reviews this checklist**
2. **Ahmad makes decisions** in Section C matrix
3. **Ahmad gathers blocked info** (Section B) or chooses fallback
4. **Kimi starts building** remaining Section A items immediately upon go-ahead

**Ready to build now:**
- A.1 Smart Filter streaming parse (3 days)
- A.2 Vision smart ranking + pick 10 (2 days)
- A.4 Regional labor multipliers (1 day)
- A.5 Per-screen verify button (0.5 days, needs Natalia approval)

---

**END OF CHECKLIST**
