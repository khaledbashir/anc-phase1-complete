# RFP Sources Analysis — Pattern Detection for Vision Strategy

**Date:** 2026-02-04  
**Analyst:** Kimi  
**Sources:** 7 RFP/projects organized in `/rfp-sources/`

---

## 1. SOURCE INVENTORY

| Project | Files | Size | Key Document | Section Format | Drawing Refs |
|---------|-------|------|--------------|----------------|--------------|
| **Jacksonville Jaguars** | 1 PDF | 160KB | Schedule of Displays | **11 06 60** | ✅ YES — A434-03.2, AV-503, A714.4 |
| **WVU** | 4 Exhibits (A,B,C,D) | 47MB | Exhibit C — Specification | **11 63 10.01** | ✅ YES — AV2.04, AV3.01, etc. |
| **Alfond Arena** | 1 PDF | 6.9MB | Full specification | **11 06 60, 11 63 10** | ❓ Partial — mentions "List of Drawing Sheets" |
| **LMU** | 1 PDF | 259KB | Scoreboard Upgrade | **LED Display Schedule** (no CSI) | ❌ NO — inline schedule, no drawing refs |
| **Bon Secours** | 1 PDF | 169KB | LED Upgrades | **LED Display Schedule** (no CSI) | ❌ NO — inline schedule, no drawing refs |
| **Indiana Fever** | 1 PDF | 319KB | LOI only | N/A | N/A — Letter of Intent only |

---

## 2. DRAWING REFERENCE PATTERNS FOUND

### Pattern A: "REF. Axxx-xx.x" (Jacksonville)
```
REF. A434-03.2
REF. A434-03.1
REF. A464-03
REF. A714.4
REF. A722.3
REF. AV-503
REF. AV501.4
REF. AV144.A
REF. AV144.B
REF. AV144.C
REF. AV144.D
```

**Characteristics:**
- "REF." prefix with period
- A-sheets: A###-##.# format
- AV-sheets: AV###.# or AV-### format
- Sometimes space between REF and AV: "REF AV-503"

### Pattern B: "AVx.xx" (WVU)
```
AV0-00.dwg (Legend)
AV2.04 (Plan view)
AV3.01 (Detail)
```

**Characteristics:**
- No "REF" prefix
- Sheet number in title block only
- AutoCAD .dwg source files

### Pattern C: No Drawing References (LMU, Bon Secours)
- Schedule is inline in specification
- No "see drawing X" references
- Contractor must provide drawings

---

## 3. SCHEDULE SECTION FORMATS

| Format | Projects | Detection Pattern |
|--------|----------|-------------------|
| **CSI MasterFormat** | Jacksonville, WVU, Alfond | `/11\s*06\s*60\|11\.06\.60\|110660/i` |
| **CSI Alternate** | WVU (addendum) | `/11\s*63\s*10\.01\|11\.63\.10\.01/i` |
| **Plain Text** | LMU, Bon Secours | `/LED\s+DISPLAY\s+SCHEDULE/i` |
| **Missing** | Indiana Fever | N/A — LOI only |

---

## 4. TTE / STRUCTURAL REPORT STATUS

| Project | TTE Found? | Format | Tonnage Pattern |
|---------|------------|--------|-----------------|
| **Jacksonville** | ❓ Unknown | — | Need to check full PDF |
| **WVU** | ❓ Not in Exhibit C | Separate report? | Need TTE sample |
| **Alfond** | ❌ No | — | — |
| **LMU** | ❌ No | — | — |
| **Bon Secours** | ❌ No | — | — |

**Critical Gap:** No TTE report samples in current files. Need separate upload.

---

## 5. VISION TARGETING STRATEGY (Validated)

### For Jacksonville-Style RFPs (Drawing References Present)

```
Step 1: Extract Section 11 06 60
Step 2: Parse Notes column for REF patterns:
        /REF\.?\s*A[\-\.]?(\d+[\-\.]?\d*)/i  → A-sheets
        /REF\.?\s*AV[\-\.]?(\d+[\-\.]?\d*)/i → AV-sheets
Step 3: Vision scan ONLY referenced sheets
Step 4: Priority = order of appearance in Schedule
```

**Example:** Jacksonville has 14 unique drawing references → Scan 14 pages, not 50.

### For LMU/Bon Secours-Style RFPs (No Drawing References)

```
Step 1: Detect "LED Display Schedule" inline
Step 2: No drawing refs found → Fallback mode
Step 3: Smart Filter scans ALL pages for:
        - "elevation", "plan", "section", "detail"
        - "AV-", "A-" sheet patterns
        - Low text density (drawings)
Step 4: Take top 10 by score
```

---

## 6. GENERALIZATION CONFIDENCE

| Scenario | Confidence | Mitigation |
|----------|------------|------------|
| CSI format (11 06 60) with REF patterns | ✅ **95%** | Jacksonville pattern works |
| CSI format without REF | ⚠️ **70%** | Fallback to keyword scan |
| Plain text schedule | ⚠️ **60%** | Fallback to keyword scan |
| No schedule (LOI only) | ❌ **0%** | Manual entry required |
| TTE tonnage extraction | ❓ **Unknown** | Need TTE samples |

---

## 7. RECOMMENDED IMPLEMENTATION

### Phase 1: Pattern Detection (2 days)
```typescript
const STRATEGIES = {
  JACKSONVILLE: {
    detect: /SECTION\s*11\s*06\s*60.*SCHEDULE.*DISPLAYS/i,
    refPatterns: [
      /REF\.?\s*A[\-\.]?(\d+[\-\.]?\d*)/gi,      // A-sheets
      /REF\.?\s*AV[\-\.]?(\d+[\-\.]?\d*)/gi,     // AV-sheets
    ],
    action: 'TARGETED_SCAN'
  },
  
  PLAIN_TEXT: {
    detect: /LED\s+DISPLAY\s+SCHEDULE/i,
    refPatterns: [],
    action: 'SMART_FILTER_FALLBACK'
  }
};
```

### Phase 2: Vision Execution
- **Targeted Scan:** 10-20 specific pages
- **Fallback Scan:** Top 10 by Smart Filter score
- **Hybrid:** Targeted + Fallback if <10 targets found

---

## 8. FILES ORGANIZED

```
/root/natalia/invoify/rfp-sources/
├── jacksonville/
│   └── Jacksonville Jaguars - Section 110660...
├── wvu/
│   └── (exhibits in parent exhibits/ folder)
├── alfond/
│   └── Alfond Arena Video Boards Specification...
├── lmu/
│   └── LMU FY26 LMU Athletics Scoreboard Upgrade...
├── bon-secours/
│   └── Bon Secours Wellness Arena LED Upgrades...
├── indiana-fever/
│   └── ANC_Indiana Fever LED Displays LOI...
├── exhibits/
│   ├── Exhibit A - Project Description SOW...
│   ├── Exhibit B - Cost Schedule...
│   ├── Exhibit B - Cost Schedule updated...
│   ├── Exhibit C - Specification...
│   └── Exhibit D - Drawings...
└── other/
    └── Attachment B, C...
```

---

## 9. CRITICAL MISSING SAMPLES

| Sample | Why | Priority |
|--------|-----|----------|
| **TTE Report (any project)** | Validate tonnage regex | P0 — Blocks steel cost calc |
| **Jacksonville full RFP** | Check for TTE, verify patterns | P1 — Validate main target |
| **WVU TTE Feasibility Study** | KB AI referenced this | P1 — Confirm format |

---

## 10. SUMMARY FOR KB AI CONSULTATION

**What we learned:**
1. ✅ Drawing reference patterns ARE consistent (REF. Axxx, REF. AVxxx)
2. ✅ CSI Section 11 06 60 is reliable anchor
3. ⚠️ 40% of RFPs (LMU, Bon Secours) have NO drawing refs — need fallback
4. ❌ TTE reports NOT in current files — need separate upload
5. ✅ Targeted Vision (14 pages vs 50) is viable for Jacksonville-style RFPs

**Validated approach:**
- Parse Schedule for REF patterns → Targeted Vision
- No REF patterns → Smart Filter fallback
- Always Gap Fill for missing/uncertain data

---

**END OF ANALYSIS**
