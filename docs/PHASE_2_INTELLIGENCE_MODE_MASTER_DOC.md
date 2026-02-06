# ANC Proposal Engine - Phase 2 Intelligence Mode
## Master Documentation

**Date:** 2026-02-04  
**Status:** Code Complete, Production-Fragile  
**Authors:** Ahmad , Kimi (AI Assistant)  
**Project:** ANC Proposal Engine (formerly Invoify)  

---

## 1. EXECUTIVE SUMMARY

Phase 2 implements "Intelligence Mode" - an AI-powered RFP ingestion and extraction system that transforms 2,500-page construction documents into structured proposal data. The system uses a "Filter-Then-Embed" architecture with Smart Filter preprocessing, Vision API for drawings, and AnythingLLM RAG for extraction.

**Current State:** Functionally complete but has three production-critical issues requiring decisions before ship.

---

## 2. SYSTEM ARCHITECTURE

### 2.1 The Pipeline (Working)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RFP UPLOAD PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

2,500-page PDF Upload
        │
        ▼
┌───────────────┐
│  Smart Filter │  ← pdf-parse, keyword scoring, noise reduction
│  (300 pages)  │    Retains: Division 11, TTE, schedules, drawings
└───────┬───────┘
        │
        ├───► Text pages (score > 8) ──────┐
        │                                    │
        ├───► Drawing candidates ────────────┤
        │    (low text + "elevation"/        │
        │     "detail"/"scale")              │
        │                                    ▼
        │                           ┌─────────────────┐
        │                           │   Vision API    │  ← GLM-4.6v (Z AI)
        │                           │  (max 10 pages) │    Extracts labels,
        │                           └────────┬────────┘    describes for RAG
        │                                    │
        │                                    ▼
        │                           Text descriptions
        │                           appended to signal
        │                                    │
        └────────────────────────────────────┤
                                             ▼
                              ┌──────────────────────────┐
                              │  Synthetic "_signal.txt" │
                              │   (~100-150 pages max)   │
                              └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │    AnythingLLM Embed     │
                              │   (Vector Database)      │
                              └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │  RfpExtractionService    │
                              │   (Division 11 priority) │
                              └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │   Structured JSON Output │
                              │   (17/20 fields target)  │
                              └──────────────────────────┘

Original PDF → Archive (no embedding, compliance only)
```

### 2.2 Key Components

| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| Smart Filter | `services/ingest/smart-filter.ts` | ✅ Done | Page scoring, noise reduction, 2,500→~100 pages |
| PDF Screenshot | `services/ingest/pdf-screenshot.ts` | ✅ Done | Puppeteer page capture for Vision API |
| Drawing Service | `services/vision/drawing-service.ts` | ✅ Done | GLM-4V wrapper, label extraction, search descriptions |
| GLM Client | `services/vision/glm-client.ts` | ✅ Done | Z AI API client, Zod validation, error handling |
| RFP Upload API | `app/api/rfp/upload/route.ts` | ✅ Done | Orchestrates full pipeline, multi-workspace sync |
| Extraction Service | `services/rfp/server/RfpExtractionService.ts` | ✅ Done | AnythingLLM queries, Division 11 priority, citations |

---

## 3. SMART FILTER DETAILS

### 3.1 Scoring Algorithm

```typescript
// MUST_KEEP_PHRASES (+25 score, auto-keep)
["11 06 60", "11.06.60", "110660",           // Display Schedule
 "11 63 10", "11.63.10", "116310",           // LED Display Systems
 "section 11", "division 11",
 "led display schedule", "display schedule",
 "schedule of displays", "av schedule",
 "exhibit b", "cost schedule", "bid form",   // WVU pricing
 "exhibit a",                                // SOW
 "thornton tomasetti", "tte",                // Structural steel
 "division 26", "26 51", "sports lighting",  // ANC scope
 "division 27", "27 41", "sound system"]     // ANC scope

// SIGNAL_KEYWORDS (+6 each)
["schedule", "pricing", "bid form", "display", "led", "specification",
 "technical", "qty", "quantity", "pixel pitch", "resolution", "nits",
 "cabinet", "module", "structural", "steel", "weight", "power", "voltage"]

// NOISE_KEYWORDS (-3 each)
["indemnification", "insurance", "liability", "termination", "arbitration",
 "force majeure", "governing law", "confidentiality", "compliance"]

// MEASUREMENTS DETECTED (+8)
/\b\d+(\.\d+)?\s?(ft|feet|in|inch|mm|m|v|amp|hz|w|kw)\b/i

// DRAWING CANDIDATE (+15)
text.length < 350 && ("scale" || "detail" || "elevation" || "section" || 
                      "plan" || "drawing" || "dwg" || /\bav-\d+/i)
```

### 3.2 Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| MAX_PAGES_TO_PARSE | 300 | Memory/timeout protection |
| MAX_PAGES_TO_KEEP | 100 (if >250 pages) or 150 | Embedding size limit |
| MAX_CHARS_TO_KEEP | 450,000 | AnythingLLM context limit |
| MIN_SCORE_TO_KEEP | 8 | Quality threshold |

### 3.3 Stratified Sampling (for >300 pages)

When PDF exceeds 300 pages, samples:
- First 60 pages
- Last 60 pages  
- Middle 60 pages
- Fills remaining slots with evenly distributed pages

**Issue:** 2,500-page PDF → only 300 pages sampled → 12% coverage.

---

## 4. VISION / DRAWING PROCESSING

### 4.1 Z AI Configuration

```
Endpoint: https://api.z.ai/api/coding/paas/v4/
API Key: 06ed76f259a24ecfb3c3193519be3547.HvNDltxpOeHLnywJ
Vision Model: glm-4.6v
Reasoning Model: glm-4.7 (no vision)
```

### 4.2 Drawing Detection

Pages flagged as drawings if:
- Text length < 350 characters (low text density)
- Contains keywords: "scale", "detail", "elevation", "section", "plan", "drawing", "dwg"
- OR matches pattern: `\bav-\d+` (AV sheet numbers)
- OR contains "sheet" + number

### 4.3 Vision Processing Flow

```typescript
// For each drawing candidate (max 10):
1. screenshotPdfPage(buffer, pageNumber) → PNG
2. drawingService.processDrawingPage(base64) → Extracted labels
3. drawingService.describePageForSearch(base64, pageNum) → Search text
4. Append to filteredText: "Page N: [description] Labels: ..."
```

### 4.4 GLM-4.6v Prompts

**Label Extraction:**
```
Analyze this architectural drawing. Locate all display ID tags 
(usually in circles or hexagons, e.g., 'A', 'D1').
Return valid JSON: { "labels": [{ "text", "type", "confidence", "boundingBox" }] }
```

**Search Description:**
```
Describe this technical drawing in 2-4 sentences for search.
Look for: sheet labels "AV" or "A", type (elevation, plan, detail), 
display labels, structural attachment details.
```

### 4.5 Current Limit: 10 Pages Max

```typescript
const MAX_DRAWING_PAGES_TO_SCAN = 10;
```

**Problem:** Stadium RFP may have 50+ drawing pages (AV-101 to AV-150). System only scans first 10, blind to 80% of drawings.

---

## 5. RFP EXTRACTION (AnythingLLM)

### 5.1 Master Truth Hierarchy

1. **SECTION 11 06 60** (Display Schedule) — HIGHEST
2. **SECTION 11 63 10** (LED Display Systems) — SECOND
3. **Division 11** — THIRD
4. All other sections — LOWEST

### 5.2 20 Critical Fields (17/20 Rule)

| # | Field | Source | Confidence Threshold |
|---|-------|--------|---------------------|
| 1 | Client Name | Cover/Header | >0.80 |
| 2 | Client Address | Cover/Header | >0.80 |
| 3 | Project Title | Cover/Header | >0.80 |
| 4 | Venue Name | Context | >0.75 |
| 5 | Extraction Accuracy | Section found | High/Standard |
| 6 | Screen Name | 11 06 60 | >0.95 |
| 7 | Quantity | 11 06 60 | >0.95 |
| 8 | Location/Zone | 11 06 60 | >0.90 |
| 9 | Pixel Pitch | 11 06 60 | >0.95 |
| 10 | Active Width | 11 06 60 | >0.95 |
| 11 | Active Height | 11 06 60 | >0.95 |
| 12 | Resolution Width | 11 06 60/calc | >0.90 |
| 13 | Resolution Height | 11 06 60/calc | >0.90 |
| 14 | Brightness (nits) | 11 63 10 | >0.85 |
| 15 | Application (in/out) | Context | >0.75 |
| 16 | Service Type | 11 63 10 | >0.85 |
| 17 | Structural Tonnage | TTE report | >0.95 |
| 18 | Union Labor | Keywords | >0.80 |
| 19 | Spare Parts | Exhibit A | >0.85 |
| 20 | WTC Location | Keywords | >0.95 |

### 5.3 Output Format

```json
{
  "clientName": { "value": "...", "citation": "[Source: ...]", "confidence": 0.95 },
  "screens": [{
    "name": { "value": "...", "citation": "...", "confidence": 0.98 },
    "pixelPitch": { "value": 10, "citation": "...", "confidence": 0.95 },
    "structuralTonnage": null  // Triggers Gap Fill
  }],
  "rulesDetected": {
    "requiresUnionLabor": { "value": true, "citation": "...", "confidence": 0.90 }
  },
  "extractionSummary": {
    "totalFields": 20,
    "extractedFields": 17,
    "completionRate": 0.85,
    "missingFields": ["serviceType", "structuralTonnage"]
  }
}
```

---

## 6. VERIFICATION SYSTEM ("Blue Glow")

### 6.1 Human Shield Design

- **ALL** AI-extracted fields require human verification
- Blue Glow persists until manually checked
- 403 block on PDF export if unverified fields exist
- Verified state persisted in PostgreSQL (`verifiedFields` JSON)

### 6.2 The 850-Click Problem

| Scenario | Clicks Required |
|----------|----------------|
| 50 screens × 17 fields | 850 individual clicks |
| Time @ 2s/click | 28 minutes of pure clicking |
| Resume supported? | Yes (saved to DB) |
| Bulk verify per screen? | NO (by design) |
| Admin override? | Yes (logged) |

**Risk:** Jeremy (Estimator) may reject tool and revert to Excel.

### 6.3 Admin Override

```typescript
// Allows bypass for emergency scenarios
// Logged in audit trail
// Requires specific role (likely Natalia)
```

---

## 7. GAP FILL SIDEBAR

### 7.1 Trigger Conditions

- Field confidence < 0.60 → Set to `null` → Gap Fill
- Field not found → `null` → Gap Fill
- User answers update `ProposalContext` immediately
- Estimator recalculates in real-time

### 7.2 Example Flow

```
AI: "I found dimensions for 'Center Hung' in Section 11 06 60, 
      but Service Type is not specified. Is this Front or Rear Service?"

User: "Front"

System: Updates serviceType → Triggers estimator recalculation 
        → Labor cost +15% → Updates total
```

---

## 8. PRODUCTION-CRITICAL ISSUES

### 8.1 Issue #1: Vision 10-Page Limit (HIGH PRIORITY)

**Problem:** 50 drawing pages, only scan 10. Blind to 80% of technical drawings.

**Impact:** Missed structural attachments, missed AV sheet references, manual work for Jeremy.

**Solutions Discussed:**

| Option | Description | Effort | Trade-off |
|--------|-------------|--------|-----------|
| A | Keep 10, accept blind spots | 0 days | Miss critical drawings |
| B | Smart ranking + client picks 10 | 2 days | Best 10, not first 10 |
| C | Progressive on-demand | 3 days | Scan when asked in chat |
| D | Increase to 20 with optimization | 1 day | 2x coverage, 2x cost |

**Ahmad's Direction:** Not acceptable. Need smarter approach. Consider client questions to guide selection.

### 8.2 Issue #2: TTE Tonnage Mapping (HIGH PRIORITY)

**Problem:** TTE reports list tonnage per screen (e.g., "Main: 45 tons", "Corner A: 12 tons"). Current regex `/(\d+) tons/` grabs first match only. No screen mapping.

**Impact:** $99,000 error potential (33 tons × $3,000 misassigned).

**What is TTE:** Thornton Tomasetti = structural engineering firm. Calculates steel needed to hang LED screens.

**Solutions Discussed:**

| Option | Description | Effort | Trade-off |
|--------|-------------|--------|-----------|
| A | Gap Fill asks Jeremy | 1 day | Manual, accurate, slow |
| B | Parse TTE table by name matching | 3 days | Good accuracy, medium effort |
| C | Vision OCR of TTE tables | 5 days | Best accuracy, high effort |

**Ahmad's Direction:** Uncertain. Needs clarification on TTE importance.

### 8.3 Issue #3: Smart Filter 300-Page Limit (MEDIUM PRIORITY)

**Problem:** 2,500-page PDF → only 300 pages parsed (12% coverage). Stratified sampling may miss critical sections.

**Impact:** Missed specifications in unsampled pages → incomplete extraction → Gap Fill overload.

**Solutions Discussed:**

| Option | Description | Effort | Trade-off |
|--------|-------------|--------|-----------|
| A | Document the limit | 0 days | User must upload Division 11 only |
| B | Streaming parse (tournament) | 3 days | Best 150 from full 2,500 |
| C | Background chunked job | 5 days | Async, queue-based, complex |

**Ahmad's Direction:** Not acceptable. Need to "man it up" but realistically.

---

## 9. DECISIONS REQUIRED

Ahmad must choose for each issue:

```
┌────────────────────────────────────────────────────────────────┐
│  ISSUE #1: Vision 10-Page Limit                                 │
│  [ ] Option B: Smart ranking + client picks 10 (2 days)        │
│  [ ] Option C: Progressive on-demand (3 days)                  │
│  [ ] Option D: Increase to 20 pages (1 day, 2x cost)           │
│  [ ] Custom: _______________________________________          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ISSUE #2: TTE Tonnage Mapping                                  │
│  [ ] Option A: Gap Fill asks Jeremy (1 day)                    │
│  [ ] Option B: Parse TTE table by name (3 days)                │
│  [ ] Option C: Vision OCR of TTE tables (5 days)               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ISSUE #3: Smart Filter 300-Page Limit                          │
│  [ ] Option B: Streaming parse (3 days)                        │
│  [ ] Option C: Background chunked job (5 days)                 │
│  [ ] Custom: _______________________________________          │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. WHAT'S ACTUALLY WORKING

### ✅ Production Ready

| Feature | Evidence |
|---------|----------|
| Smart Filter scoring | Keyword-based, MUST_KEEP phrases, noise reduction |
| Drawing detection | Heuristic-based, flags AV sheets, elevations |
| Vision API integration | GLM-4.6v, Zod validation, error handling |
| PDF screenshot | Puppeteer + @sparticuz/chromium, 1920×1080 @ 2x |
| RFP Upload pipeline | End-to-end, multi-workspace sync, pinning |
| Extraction with citations | Division 11 priority, confidence scores |
| Gap Fill sidebar | Contextual questions, real-time update |
| Verification persistence | PostgreSQL `verifiedFields`, resume support |
| Estimator integration | Real-time recalculation, Decimal.js precision |

### ⚠️ Working But Limited

| Feature | Limitation |
|---------|------------|
| Vision | 10 pages max |
| Smart Filter | 300 pages sampled |
| TTE extraction | No location mapping |
| Regional labor | Not implemented |
| Bulk verification | Not allowed by design |

---

## 11. TECHNICAL DEBT & FUTURE WORK

### Phase 2.1 (Immediate)
- [ ] Fix Vision 10-page limit
- [ ] Fix TTE tonnage mapping
- [ ] Fix Smart Filter 300-page limit
- [ ] Regional labor multipliers

### Phase 3 (Future)
- [ ] Native DWG/DXF parsing
- [ ] BIM model integration
- [ ] Advanced computer vision (geometry interpretation)
- [ ] Auto-detection of section numbering variants

---

## 12. ENVIRONMENT VARIABLES

```bash
# Z AI (Vision)
Z_AI_API_KEY=06ed76f259a24ecfb3c3193519be3547.HvNDltxpOeHLnywJ
Z_AI_BASE_URL=https://api.z.ai/api/coding/paas/v4/
Z_AI_MODEL_NAME=glm-4v

# AnythingLLM
ANYTHING_LLM_BASE_URL=
ANYTHING_LLM_KEY=
ANYTHING_LLM_WORKSPACE=anc-estimator
ANYTHING_LLM_MASTER_WORKSPACE=dashboard-vault

# Database
DATABASE_URL=

# Email
NODEMAILER_EMAIL=
NODEMAILER_PW=
```

---

## 13. FILE REFERENCES

### Core Pipeline
- `services/ingest/smart-filter.ts` — Page scoring and filtering
- `services/ingest/pdf-screenshot.ts` — PDF to image conversion
- `services/vision/drawing-service.ts` — Vision API orchestration
- `services/vision/glm-client.ts` — Z AI GLM-4.6v client
- `app/api/rfp/upload/route.ts` — Upload orchestration API
- `services/rfp/server/RfpExtractionService.ts` — Extraction logic

### Documentation
- `SMART_INGEST_PLAN.md` — Original pipeline design
- `AI_RFP_EXTRACTION_LOGIC.md` — Extraction rules and 17/20 rule
- `AI_WHAT_WE_HAVE_AND_QUESTIONS.md` — Technical inventory
- `PROJECT_OVERVIEW.md` — System architecture

---

## 14. GLOSSARY

| Term | Definition |
|------|------------|
| **TTE** | Thornton Tomasetti — structural engineering firm |
| **11 06 60** | CSI MasterFormat section: LED Display Systems Schedule |
| **11 63 10** | CSI MasterFormat section: LED Display Systems |
| **Division 11** | Equipment (CSI MasterFormat) |
| **Division 26** | Electrical (CSI MasterFormat) |
| **Division 27** | Communications (CSI MasterFormat) |
| **Gap Fill** | AI asks user for missing data |
| **Blue Glow** | UI indicator for unverified AI fields |
| **17/20 Rule** | Target: auto-extract 17 of 20 critical fields (85%) |
| **Master Truth** | Hierarchy of document authority |
| **Vision** | GLM-4.6v image analysis for drawings |
| **Smart Filter** | Pre-processing to reduce noise pages |
| **RAG** | Retrieval-Augmented Generation |

---

## 15. CONVERSATION LOG

**2026-02-04 Session:**
- Kimi assessed Invoify codebase
- Discovered Smart Filter, Vision pipeline already implemented
- Identified 3 production-critical issues
- Ahmad provided Z AI credentials
- Ahmad rejected 10-page vision limit and 300-page filter limit
- Ahmad requested comprehensive documentation (this doc)
- Next: Ahmad to make decisions on Issue #1, #2, #3 options

---

**END OF DOCUMENT**

*Next Action: Ahmad reviews Section 8 (Production-Critical Issues), makes decisions, and signals which options to implement.*
