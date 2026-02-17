# PDF Extraction & Keyword Detection Guide

This document provides all the patterns, keywords, and services for extracting text from PDFs and detecting relevant content.

---

## 1. PDF Text Extraction Service

### Kreuzberg Client ([`services/kreuzberg/kreuzbergClient.ts`](services/kreuzberg/kreuzbergClient.ts))

Universal backend for all server-side document text extraction. Supports 75+ formats including PDF, DOCX, XLSX, images with OCR.

**Endpoints:**
- Docker internal: `http://kreuz:8000`
- External: `https://basheer-kreuz.prd42b.easypanel.host`

**Usage:**
```typescript
import { extractText } from "@/services/kreuzberg/kreuzbergClient";

const result = await extractText(buffer, "document.pdf");
// result.text - Full text content
// result.totalPages - Number of pages
// result.pages - Array of { pageNumber, text }
```

**API Endpoint:**
```
POST ${KREUZBERG_URL}/extract
Content-Type: multipart/form-data
Body: files=<blob>
```

---

## 2. Keyword Categories for PDF Filtering

### Display Hardware Keywords
```typescript
const DISPLAY_HARDWARE_KEYWORDS = [
  "LED", "L.E.D.", "led display", "LED display", "video board", "video display",
  "video wall", "scoreboard", "ribbon board", "ribbon display", "fascia",
  "fascia board", "center hung", "centerhung", "auxiliary board", "auxiliary display",
  "marquee", "digital signage", "display panel", "display module", "LED module",
  "LED cabinet", "LED tile",
];
```

### Display Specs Keywords
```typescript
const DISPLAY_SPECS_KEYWORDS = [
  "pixel pitch", "SMD", "DIP", "brightness", "nits", "candela",
  "viewing distance", "viewing angle", "refresh rate", "resolution",
  "grayscale", "color temperature", "contrast ratio", "IP rating", "IP65",
  "IP54", "weatherproof", "outdoor rated", "indoor rated",
];
```

### Electrical Keywords
```typescript
const ELECTRICAL_KEYWORDS = [
  "electrical", "power distribution", "power supply", "power requirements",
  "voltage", "amperage", "wattage", "circuit breaker", "transformer", "UPS",
  "uninterruptible", "generator", "conduit", "junction box", "disconnect",
  "NEC", "electrical code", "branch circuit", "dedicated circuit",
  "service entrance", "panel board", "load calculation",
];
```

### Structural Keywords
```typescript
const STRUCTURAL_KEYWORDS = [
  "mounting", "rigging", "structural", "structural steel", "steel", "I-beam",
  "W-beam", "catenary", "guy wire", "dead load", "live load", "wind load",
  "seismic", "anchor", "concrete anchor", "embed plate", "unistrut", "bracket",
  "cleat", "hanger", "truss", "canopy", "overhang", "elevation",
  "structural engineer", "PE stamp",
];
```

### Installation Keywords
```typescript
const INSTALLATION_KEYWORDS = [
  "installation", "install", "labor", "crew", "lift", "crane", "boom lift",
  "scissor lift", "scaffolding", "conduit run", "cable tray", "wire pull",
  "termination", "commissioning", "testing", "alignment", "leveling",
];
```

### Control/Data Keywords
```typescript
const CONTROL_DATA_KEYWORDS = [
  "control system", "controller", "processor", "video processor", "scaler",
  "fiber", "fiber optic", "data cable", "Cat6", "Cat5", "HDMI", "DVI", "SDI",
  "signal", "redundancy", "failover", "network", "switch", "media player",
];
```

### Permits/Compliance Keywords
```typescript
const PERMITS_KEYWORDS = [
  "permit", "permits", "sign code", "building code", "zoning", "variance",
  "ADA", "egress", "fire code", "fire marshal", "inspection",
  "stamped drawings", "PE", "professional engineer", "shop drawings", "submittals",
];
```

### Commercial/Pricing Keywords
```typescript
const COMMERCIAL_KEYWORDS = [
  "pricing", "bid", "proposal", "quote", "RFP", "RFQ", "scope of work", "SOW",
  "specification", "spec", "spec section", "division", "CSI", "alternates",
  "alternate", "base bid", "add alternate", "deduct alternate", "unit price",
  "allowance", "contingency", "warranty", "maintenance", "service agreement",
];
```

---

## 3. Smart Filter Keywords

### Must-Keep Phrases (Always Retain)
```typescript
const MUST_KEEP_PHRASES = [
  "11 06 60", "11.06.60", "110660",           // Display Schedule
  "11 63 10", "11.63.10", "116310",           // LED Display Systems
  "section 11", "division 11",
  "led display schedule", "display schedule",
  "schedule of displays", "av schedule",
  "exhibit b", "cost schedule", "bid form",   // Pricing in Exhibit B
  "exhibit a",                                // Statement of Work
  "thornton tomasetti", "tte",                // Structural steel tonnage
  "division 26", "26 51", "sports lighting",  // Division 26 Sports Lighting
  "division 27", "27 41", "sound system"      // Division 27 Sound/Comms
];
```

### Signal Keywords (High-Value)
```typescript
const SIGNAL_KEYWORDS = [
  "schedule", "pricing", "bid form", "display", "led", "specification",
  "technical", "qty", "quantity", "pixel pitch", "resolution", "nits", "brightness",
  "cabinet", "module", "diode", "refresh rate", "viewing angle", "warranty",
  "spare parts", "maintenance", "structural", "steel", "weight", "lbs", "kg",
  "power", "voltage", "amps", "circuit", "data", "fiber", "cat6",
  "division 27", "division 26", "section 11", "active area", "dimensions"
];
```

### Noise Keywords (Legal/Boilerplate - Penalize)
```typescript
const NOISE_KEYWORDS = [
  "indemnification", "insurance", "liability", "termination", "arbitration",
  "force majeure", "governing law", "jurisdiction", "severability", "waiver",
  "confidentiality", "intellectual property", "compliance", "equal opportunity",
  "harassment", "drug-free", "background check"
];
```

---

## 4. Section Category Keywords (PDF Processor)

### Category Detection Patterns
```typescript
const CATEGORY_KEYWORDS = {
  PRICING: [
    /\bpric(e|ing|ed)\b/i, /\bcost\b/i, /\btotal\b/i, /\bbudget\b/i,
    /\bbid\b/i, /\bquot(e|ation)\b/i, /\bfee\b/i, /\brate\b/i,
    /\bcompensation\b/i, /\ballowance\b/i, /\bestimate\b/i,
    /\bline\s*item/i, /\bunit\s*price/i, /\blump\s*sum/i,
    /\balternate\b/i, /\badd\s*on/i, /\bdeduct/i,
  ],
  DISPLAY_SPECS: [
    /\bpixel\s*pitch\b/i, /\bresolution\b/i, /\bnit[s]?\b/i,
    /\bbrightness\b/i, /\bled\b/i, /\blcd\b/i, /\bdisplay\b/i,
    /\bscreen\b/i, /\bvideo\s*(wall|board)\b/i, /\bscoreboard\b/i,
    /\bribbon\s*board\b/i, /\bfascia\b/i, /\bmarquee\b/i,
    /\bdimension/i, /\bsq(uare)?\s*f(ee)?t\b/i, /\bfoot\b.*\bwide\b/i,
    /\bpower\s*consumption/i, /\bweight\b/i, /\bcabinet\b/i,
    /\bmodule\b/i, /\brefresh\s*rate/i, /\bviewing\s*(angle|distance)/i,
  ],
  SCOPE: [
    /\bscope\s*(of\s*work)?\b/i, /\binstall(ation)?\b/i,
    /\bdemolition\b/i, /\bremov(e|al)\b/i, /\bphase\b/i,
    /\bmobiliz(e|ation)\b/i, /\bcommission/i, /\bintegrat/i,
    /\bsubcontract/i, /\bresponsib(le|ility)\b/i, /\bexclusion/i,
    /\bassumption/i, /\bdeliverable/i, /\bwork\s*plan/i,
    /\bgeneral\s*condition/i, /\bsite\s*prep/i,
  ],
  SCHEDULE: [
    /\bschedule\b/i, /\btimeline\b/i, /\bmilestone\b/i,
    /\bdeadline\b/i, /\bcompletion\s*date/i, /\bnotice\s*to\s*proceed/i,
    /\bntp\b/i, /\bsubstantial\s*completion/i, /\bduration\b/i,
    /\bcalendar\s*day/i, /\bwork(ing)?\s*day/i, /\bgantt\b/i,
    /\bcritical\s*path/i, /\bliquidated\s*damage/i,
  ],
  REQUIREMENTS: [
    /\brequirement/i, /\bqualification/i, /\bcertific(ate|ation)/i,
    /\bcompliance\b/i, /\bstandard\b/i, /\bcode\b/i,
    /\bpermit\b/i, /\binspection\b/i, /\bsubmittal/i,
    /\bform\b/i, /\bexhibit\b/i, /\battachment\b/i,
    /\bappendix\b/i, /\baddendum\b/i, /\bspecification/i,
    /\bminority\b/i, /\bmwbe\b/i, /\bdbe\b/i, /\bunion\b/i,
    /\bprevailing\s*wage/i, /\bdavis.bacon/i,
  ],
  WARRANTY: [
    /\bwarranty\b/i, /\bwarranties\b/i, /\bguarantee\b/i,
    /\bmaintenance\b/i, /\bservice\s*level/i, /\bsla\b/i,
    /\bresponse\s*time/i, /\bspare\s*part/i, /\bpreventative/i,
    /\bpreventive/i, /\bannual\s*check/i, /\bsupport\b/i,
  ],
  SOFTWARE: [
    /\bcms\b/i, /\bcontent\s*management/i, /\blivesync\b/i,
    /\bsoftware\b/i, /\bcontrol\s*system/i, /\bprocessor\b/i,
    /\bmedia\s*player/i, /\bnovastar\b/i, /\bcolorlight\b/i,
    /\bbrightwall\b/i, /\bscaling\b/i, /\bnetwork/i,
  ],
  TEAM: [
    /\bteam\b/i, /\bpersonnel\b/i, /\bstaff(ing)?\b/i,
    /\bproject\s*manager\b/i, /\bresume\b/i, /\bbio(graphy)?\b/i,
    /\bexperience\b/i, /\bkey\s*person/i, /\borganiz(ation)?\s*chart/i,
  ],
  CASE_STUDY: [
    /\bcase\s*stud/i, /\breference\b/i, /\bpast\s*(project|performance)/i,
    /\bportfolio\b/i, /\bsimilar\s*project/i, /\btrack\s*record/i,
  ],
  LEGAL: [
    /\bindemnif/i, /\bliabilit/i, /\binsurance\b/i,
    /\bbond(ing)?\b/i, /\bcontract\b/i, /\bterms?\s*(and|&)\s*condition/i,
    /\bdispute\b/i, /\barbitration\b/i, /\bgoverning\s*law/i,
    /\bjurisdiction\b/i, /\btermination\b/i, /\bforce\s*majeure/i,
    /\bconfidential/i, /\bnon.disclosure/i, /\bnda\b/i,
  ],
  BOILERPLATE: [
    /\bequal\s*opportunity/i, /\baffirmative\s*action/i,
    /\bdata\s*privacy/i, /\bcookie\b/i, /\bgdpr\b/i,
    /\bdisclaimer\b/i, /\bcopyright\b/i, /\btrademark\b/i,
    /\ball\s*rights\s*reserved/i, /\bno\s*part\s*of\s*this/i,
    /\bthis\s*document\s*is\s*confidential/i,
    /\bprohibited\s*without/i,
  ],
};
```

### High-Value Boosters (Increase Score)
```typescript
const HIGH_VALUE_BOOSTERS = [
  /\$[\d,]+/,                    // Dollar amounts
  /\d+['′]\s*[hHxX×]\s*\d+/,   // Dimensions like 12' x 10'
  /\d+\s*mm\b/i,                // Pixel pitch
  /\d+\s*nit/i,                 // Brightness
  /\d+\s*sq/i,                  // Square footage
  /\bled\b.*\bdisplay\b/i,      // LED display
  /\bphase\s*\d/i,              // Phase numbers
  /\byear\s*\d/i,               // Year numbers
];
```

---

## 5. Page Scoring Algorithm

```typescript
function scorePage(text: string, keywords: string[]): number {
  const normalizedText = normalizeText(text);
  const normalizedKeywords = keywords.map(normalizeKeyword);
  
  let keywordHits = 0;
  for (const kw of normalizedKeywords) {
    let startIndex = 0;
    while (true) {
      const idx = normalizedText.indexOf(kw, startIndex);
      if (idx === -1) break;
      keywordHits++;
      startIndex = idx + kw.length;
    }
  }
  
  // Score = keyword density (hits / sqrt(text length))
  const score = keywordHits > 0
    ? keywordHits / Math.sqrt(Math.max(normalizedText.length, 1))
    : 0;
    
  return score;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.\-_/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

---

## 6. Meta Extraction Patterns

### Client Name Patterns
```typescript
const CLIENT_PATTERNS = [
  /(?:prepared\s+for|submitted\s+to|owner|client|attention|attn)[:\s]+([A-Z][A-Za-z\s&.,'-]{2,60})/i,
];
```

### Venue/Facility Patterns
```typescript
const VENUE_PATTERNS = [
  /(?:venue|facility|stadium|arena|fieldhouse|center|centre|convention\s+center|amphitheater|coliseum|ballpark)[:\s]+([A-Z][A-Za-z\s&.,'-]{2,80})/i,
  /(?:at|for)\s+(?:the\s+)?([A-Z][A-Za-z\s&'-]{2,60}(?:Stadium|Arena|Fieldhouse|Center|Centre|Convention\s+Center|Amphitheater|Coliseum|Ballpark|Field|Park|Dome))/i,
];
```

### Project Title Patterns
```typescript
const PROJECT_TITLE_PATTERNS = [
  /(?:project\s*(?:name|title)?|re|subject|rfp\s+(?:for|title))[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{4,120})/i,
];
```

---

## 7. Liability/Risk Detection Keywords

### Financial Risk Keywords
```typescript
const FINANCIAL_RISK_PATTERNS = {
  liquidatedDamages: [/liquidated\s+damages/i, /\bLD\b/, /daily\s+penalty/i],
  performanceBond: [/performance\s+bond/i, /surety\s+bond/i],
  paymentTerms: [/net\s+30/i, /net\s+45/i, /net\s+60/i, /payment\s+terms/i, /progress\s+payment/i],
  retainage: [/retainage/i, /retention/i, /holdback/i],
  changeOrder: [/change\s+order/i, /variation\s+order/i, /scope\s+change/i],
};
```

### Legal Risk Keywords
```typescript
const LEGAL_RISK_PATTERNS = {
  forceMajeure: [/force\s+majeure/i, /act\s+of\s+god/i],
  indemnification: [/indemnif/i, /hold\s+harmless/i],
  insurance: [/insurance/i, /certificate\s+of\s+insurance/i, /additional\s+insured/i],
  termination: [/termination\s+for\s+cause/i, /termination\s+for\s+convenience/i],
  disputeResolution: [/arbitration/i, /mediation/i, /dispute\s+resolution/i],
};
```

---

## 8. Drawing Detection Patterns

```typescript
const DRAWING_PATTERNS = {
  isDrawingCandidate: (text: string) => {
    const lowerText = text.toLowerCase();
    return (
      text.trim().length < 350 &&
      (lowerText.includes("scale") ||
        lowerText.includes("detail") ||
        lowerText.includes("elevation") ||
        lowerText.includes("section") ||
        lowerText.includes("plan") ||
        lowerText.includes("drawing") ||
        lowerText.includes("dwg") ||
        /\bav-\d+/i.test(text) ||
        (lowerText.includes("sheet") && (lowerText.includes("of") || /\d+/.test(text))))
    );
  },
  
  measurementPatterns: [
    /\b\d+(\.\d+)?\s?(ft|feet|in|inch|inches|mm|cm|m|v|vac|amp|amps|hz|w|kw)\b/i,
    /\b\d{2,4}\s?x\s?\d{2,4}\b/i,
    /\b\d+(\.\d+)?\s?'\s?[x×]\s?\d+(\.\d+)?\s?'\b/i,
  ],
};
```

---

## 9. Section Heading Detection Patterns

```typescript
const HEADING_PATTERNS = [
  /^(?:SECTION|ARTICLE|PART|CHAPTER|DIVISION)\s+[\dIVXA-Z]/i,
  /^\d{1,2}(?:\.\d{1,2}){0,3}\s+[A-Z]/,       // 1.0 HEADING, 2.1.3 HEADING
  /^[A-Z][A-Z\s&\-/]{8,}$/,                     // ALL CAPS HEADING (min 8 chars)
  /^(?:EXHIBIT|APPENDIX|ATTACHMENT|ADDENDUM)\s/i,
  /^(?:SCOPE OF WORK|GENERAL CONDITIONS|SPECIAL CONDITIONS|TECHNICAL SPECIFICATIONS)/i,
  /^(?:BID FORM|PROPOSAL FORM|PRICING SCHEDULE|FEE SCHEDULE)/i,
  /^(?:TABLE OF CONTENTS|INTRODUCTION|OVERVIEW|BACKGROUND|PURPOSE)/i,
  /^(?:EVALUATION CRITERIA|SELECTION CRITERIA|SCORING)/i,
  /^(?:INSURANCE|BONDING|WARRANTY|SCHEDULE|TIMELINE)/i,
];
```

---

## 10. Source Files Reference

| File | Purpose |
|------|---------|
| [`services/kreuzberg/kreuzbergClient.ts`](services/kreuzberg/kreuzbergClient.ts) | PDF text extraction service |
| [`app/tools/pdf-filter/lib/keyword-presets.ts`](app/tools/pdf-filter/lib/keyword-presets.ts) | Keyword category definitions |
| [`app/tools/pdf-filter/lib/scoring.ts`](app/tools/pdf-filter/lib/scoring.ts) | Page scoring algorithm |
| [`app/tools/pdf-filter/lib/meta-extraction.ts`](app/tools/pdf-filter/lib/meta-extraction.ts) | Project metadata extraction |
| [`services/rfp/pdfProcessor.ts`](services/rfp/pdfProcessor.ts) | Full PDF processing pipeline |
| [`services/ingest/smart-filter.ts`](services/ingest/smart-filter.ts) | Smart PDF filtering |
| [`services/sow/liabilityScanner.ts`](services/sow/liabilityScanner.ts) | Risk/liability keyword detection |

---

## 11. Quick Usage Examples

### Extract Text from PDF
```typescript
import { extractText } from "@/services/kreuzberg/kreuzbergClient";

const result = await extractText(pdfBuffer, "document.pdf");
console.log(`Extracted ${result.totalPages} pages, ${result.text.length} chars`);
```

### Score Pages by Keywords
```typescript
import { scorePages } from "@/app/tools/pdf-filter/lib/scoring";
import { KEYWORD_PRESETS } from "@/app/tools/pdf-filter/lib/keyword-presets";

const keywords = KEYWORD_PRESETS.flatMap(cat => cat.keywords);
const scores = scorePages(pageTexts, keywords);

// Get high-scoring pages
const highValue = scores.pages.filter(p => p.score > 0.5);
```

### Smart Filter PDF
```typescript
import { smartFilterPdf } from "@/services/ingest/smart-filter";

const result = await smartFilterPdf(pdfBuffer);
console.log(`Retained ${result.retainedPages}/${result.totalPages} pages`);
console.log(`Drawing candidates: ${result.drawingCandidates.join(", ")}`);
```

### Process PDF into Scored Sections
```typescript
import { processPdf } from "@/services/rfp/pdfProcessor";

const processed = await processPdf(pdfBuffer, "rfp.pdf");
console.log(`High-value sections: ${processed.stats.highValueCount}`);
console.log(`Tokens saved: ${processed.stats.estimatedTokensSaved}`);
```
