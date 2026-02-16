# Phase 3 Feature Plan — Strategic Expansion

**Prepared for:** Ahmad Basheer, Assisted.VIP  
**Date:** February 16, 2026  
**Context:** ANC uses Salesforce as their CRM. We do NOT compete with Salesforce. We build the specialized LED/AV estimation and proposal intelligence that Salesforce cannot do, and we feed data back into Salesforce where it matters.

---

## The Strategic Position

```
┌─────────────────────────────────────────────────────────────┐
│                      SALESFORCE (CRM)                       │
│  Accounts · Contacts · Pipeline · Forecasting · Dashboards  │
│  Opportunities · Tasks · Email Tracking · Territory Mgmt    │
└──────────────────────┬──────────────────────────────────────┘
                       │ API Sync (Phase 3.3)
                       │ • Deal value → Opportunity.Amount
                       │ • Status changes → Opportunity.Stage
                       │ • Win/Loss → Opportunity.CloseWon
                       │ • Proposal PDF → Opportunity.Attachment
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ANC PROPOSAL ENGINE (Our Platform)             │
│                                                             │
│  What Salesforce CANNOT do:                                 │
│  ✦ Parse a 2,000-page RFP and extract every LED screen     │
│  ✦ Calculate LED cost from cabinet dimensions + rate card   │
│  ✦ Generate a branded ANC proposal PDF from an Excel        │
│  ✦ Auto-suggest accessories for a 10×20ft scoreboard        │
│  ✦ Compare Yaham vs LG vs Absen pricing side-by-side        │
│  ✦ Price a 10-year warranty with compound escalation         │
│  ✦ Scan a contract for 20 risk categories                   │
│  ✦ Generate a scope of work from project configuration      │
│  ✦ Produce an audit Excel with live formulas for Finance     │
│  ✦ Let a client annotate a proposal with voice + pins        │
│                                                             │
│  We are the ESTIMATION & PROPOSAL BRAIN.                    │
│  Salesforce is the RELATIONSHIP & PIPELINE TRACKER.         │
│  They complement. They don't compete.                       │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** If Salesforce already does it well (contact management, email tracking, forecasting, territory management), we don't build it. If it requires LED/AV domain expertise, we own it.

---

## Feature Plan — Three Phases

### Phase 3.1 — "Natalia's Daily Driver" (Weeks 1-2)

These features directly accelerate the proposal team's daily workflow. Natalia and Matt touch these every single day.

---

#### 3.1.1 Multi-Vendor Option Compare

**Business case:** ANC is tech-agnostic — they install LG, Yaham, Absen, whoever fits the budget. Natalia currently creates 2-3 separate proposals manually when a client wants to see options. This is hours of redundant work.

**What it does:** Inside the estimator, one button duplicates the current display configuration with a different product. The Excel preview shows both options side-by-side:

```
┌──────────────────────────────────────────────────────────────┐
│  OPTION A: Yaham HVO C4 (4mm Indoor)                        │
│  LED Hardware: $11,225   Services: $30,037   Total: $68,904  │
├──────────────────────────────────────────────────────────────┤
│  OPTION B: LG GSQA 3.9mm Indoor                             │
│  LED Hardware: $14,180   Services: $30,037   Total: $72,860  │
├──────────────────────────────────────────────────────────────┤
│  DELTA: Option B is $3,956 more (+5.7%)                     │
│  Brightness: +1,500 nits │ Weight: +12% │ Power: +8%        │
└──────────────────────────────────────────────────────────────┘
```

**What already exists:**
- `calculateDisplay()` takes a `productSpec` parameter
- `useProductSpecs` fetches product data from DB
- `ReverseEngineerPanel` already shows product alternatives ranked by fit
- `handleDuplicate` duplicates an entire estimate
- Product catalog has 13 Yaham products + can hold more manufacturers

**What to build:**
1. "Compare Products" button in EstimatorStudio toolbar
2. Product swap logic: clone display, replace productId, recalculate
3. Comparison sheet in ExcelPreview (new tab or split view)
4. Delta summary: cost difference, spec differences (brightness, weight, power)
5. Export: both options appear in the exported Excel as separate sheets

**Technical approach:**
- Add `comparisonDisplays: DisplayAnswers[][]` to EstimatorAnswers (array of option sets)
- New `buildComparisonSheet()` in EstimatorBridge.ts
- Product selector dropdown per option (already have product-select question type)

**Effort:** 5-7 days  
**Owner:** Estimation team  
**Validates:** "We find the best screen for you" selling point

---

#### 3.1.2 Export All 3 Tiers (Budget → Proposal → LOI)

**Business case:** ANC deal progression: Budget (early ROM) → Proposal (formal quote) → LOI (legal binding). Same project data, three different document tiers with different margins, language, and legal wrapper. Currently Natalia manually recreates each document.

**What it does:** One button generates 3 Excel files (or one Excel with 3 sets of sheets) from a single estimate:

| Tier | LED Margin | Services Margin | Legal Wrapper | Signatures |
|------|-----------|----------------|---------------|------------|
| Budget | 15% | 10% | None — "ROM, not a commitment" | None |
| Proposal | 30% | 20% | Standard terms & conditions | Optional |
| LOI | 30% | 20% | Full legal (payment terms, liability, IP) | Required |

**What already exists:**
- `DocumentMode` enum (BUDGET/PROPOSAL/LOI) in Prisma schema
- `MARGIN_PRESETS` in rate card (Budget tier: 15%/10%, Proposal tier: 30%/20%)
- `documentConfig` JSON field on Proposal
- ProposalTemplate5 already renders differently per mode
- `exportEstimatorExcel()` generates single Excel

**What to build:**
1. "Export All Tiers" button in EstimatorStudio
2. Loop: for each tier, swap margin constants, rebuild sheets, add to workbook
3. Each tier = separate set of sheet tabs (e.g., "Budget Summary", "Proposal Summary", "LOI Summary")
4. Or: 3 separate .xlsx files in a zip

**Effort:** 2-3 days  
**Owner:** Proposal team

---

### Phase 3.2 — "Revenue & Retention" (Weeks 3-5)

Features that move ANC from "we sell hardware" to "we sell outcomes." This is where we earn the forever-partner contracts and the ad revenue business.

---

#### 3.2.1 Warranty & Service Contract Calculator

**Business case:** Extended warranty and maintenance (years 4-10) is a significant ANC revenue stream. The pricing uses 10% annual compound escalation. Getting this wrong on a 10-year deal means leaving $200K-$500K on the table.

**What it does:** New tab in the estimator Excel preview: "Service Contract"

```
┌─────────────────────────────────────────────────────────────┐
│  10-YEAR WARRANTY & MAINTENANCE SCHEDULE                     │
├──────┬────────────┬────────────┬─────────────────────────────┤
│ Year │ Base Cost  │ Escalation │ Annual Cost                  │
├──────┼────────────┼────────────┼─────────────────────────────┤
│  1   │  Included  │    —       │     $0 (standard warranty)   │
│  2   │  Included  │    —       │     $0 (standard warranty)   │
│  3   │  Included  │    —       │     $0 (standard warranty)   │
│  4   │  $18,500   │   10%      │    $18,500                   │
│  5   │  $18,500   │   10%      │    $20,350                   │
│  6   │  $18,500   │   10%      │    $22,385                   │
│  7   │  $18,500   │   10%      │    $24,624                   │
│  8   │  $18,500   │   10%      │    $27,086                   │
│  9   │  $18,500   │   10%      │    $29,794                   │
│  10  │  $18,500   │   10%      │    $32,774                   │
├──────┴────────────┴────────────┼─────────────────────────────┤
│  TOTAL 10-YEAR CONTRACT        │   $175,513                   │
│  3-Year (standard only)        │        $0                    │
│  5-Year (2 paid years)         │    $38,850                   │
│  10-Year (7 paid years)        │   $175,513                   │
└────────────────────────────────┴─────────────────────────────┘
```

**What already exists:**
- `WARRANTY_ANNUAL_ESCALATION` in rate card
- Per-display cost breakdowns in `calculateDisplay()`
- Sheet tab builder in `buildPreviewSheets()`

**What to build:**
1. Warranty base cost formula: % of hardware cost (from rate card, e.g., 8-12%)
2. Escalation engine: `baseCost * (1 + escalationRate) ^ (year - warrantyYears)`
3. New sheet tab in EstimatorBridge: `buildWarrantySheet()`
4. Comparison table: 3-year vs 5-year vs 10-year NPV
5. Export in Excel with live formulas (like audit Excel)

**Effort:** 4-5 days  
**Owner:** Estimation/Finance

---

#### 3.2.2 Client Portal Enhancements (The Lock-In)

**Business case:** ANC's "forever partner" strategy requires ongoing client interaction. Today, the share link is view-only with annotation. We need it to be a living portal where the stadium manager comes back repeatedly.

**What already exists (this is substantial):**
- `/share/[hash]` renders branded proposal view
- `ShareAnnotator` with View Mode + Annotate Mode
- `AnnotationPin`, `AnnotationPopover`, `AnnotationSidebar`
- `VoiceRecorder` for audio annotations
- `useScreenCapture` for automatic screenshot capture
- `ShareChangeRequestForm` for text-based change requests
- `ChangeRequest` model with status tracking (OPEN/RESOLVED)
- `Comment` model with threading support (parentCommentId)
- `ProposalStatus` state machine: DRAFT → APPROVED → SIGNED → CLOSED
- `SignatureAuditTrail` model for e-signature tracking

**What to build (3 additions):**

**A. Client Approval Button**
- On the share page, a prominent "Approve Proposal" button
- Requires client name + email (verified via magic link or simple confirmation)
- Sets proposal status to APPROVED, timestamps it, logs in ActivityLog
- Sends notification to ANC team (email or webhook to Salesforce)

**B. Status Tracker (visible to client)**
```
  Drafting ──→ Under Review ──→ Approved ──→ Signed
     ●              ●              ◉            ○
                              (you are here)
```
- Renders at top of share page based on `ProposalStatus`
- Client sees where their proposal stands without calling ANC

**C. Comment Thread (client ↔ ANC)**
- Below the proposal PDF, a simple comment section
- Client posts, ANC team responds
- Uses existing `Comment` model with threading
- No login needed — uses name + email from the share session

**Effort:** 4-5 days  
**Owner:** Proposal team  
**Strategic value:** Every time the client opens the portal, they're in ANC's system. Not Daktronics'. Not Samsung's.

---

#### 3.2.3 Bid/No-Bid Scorecard

**Business case:** ANC spends 20-40 hours on an RFP response before formally deciding if it's worth pursuing. Some RFPs have impossible timelines, unfavorable terms, or margins that don't justify the effort. This catches it early.

**What already exists:**
- RFP extraction pipeline (pdfProcessor → rfpAnalyzer)
- Contract risk scanner (20-point checklist, risk-detector.ts)
- `LiabilityPanel` with category-based risk scoring
- Page relevance scoring in PDF Filter
- Rate card with margin constants for projected revenue calc

**What to build:**

Score across 5 dimensions (already defined in Phase 2 doc):

| Dimension | Data Source | Scoring |
|-----------|-----------|---------|
| Margin Potential | Estimated project value × typical margin | 0-20 pts |
| Timeline Feasibility | Extracted deadlines vs ANC standard lead time (9+ weeks) | 0-20 pts |
| Compliance Burden | Count of required forms, certs, bonds, special requirements | 0-20 pts |
| Risk Exposure | Output from 20-point contract scanner | 0-20 pts |
| Competitive Position | Public bid vs invited, relationship signals, incumbent | 0-20 pts |

**Output:** 0-100 score → **Go** (70+) / **Caution** (40-69) / **No-Go** (<40)

**UI:** Card shown immediately after RFP upload in the RFP analysis view. Before anyone spends 20 hours on it.

**Effort:** 5-7 days  
**Owner:** RFP/Estimation team

---

### Phase 3.3 — "Salesforce Bridge" (Week 6)

**The principle:** We don't rebuild the pipeline. We push our specialized data INTO Salesforce so Jireh's sales team sees it where they already live.

---

#### 3.3.1 Salesforce Integration Layer

**Business case:** ANC's sales team lives in Salesforce. If deal data from our platform doesn't appear in Salesforce, it doesn't exist to them. Instead of building win/loss tracking and pipeline dashboards (which Salesforce already does), we push our data into Salesforce.

**Integration model:**

```
ANC Proposal Engine                    Salesforce
─────────────────                      ──────────
New estimate created          →        Create/Update Opportunity
  clientName                  →          Account Name
  totalAmount                 →          Opportunity Amount
  documentMode                →          Opportunity Type (Budget/Proposal/LOI)
  status changes              →          Opportunity Stage
    DRAFT                     →            "Qualification"
    APPROVED                  →            "Proposal/Price Quote"
    SIGNED                    →            "Closed Won"
    CANCELLED                 →            "Closed Lost"
  Proposal PDF                →          Attachment / ContentDocument
  Audit Excel                 →          Attachment / ContentDocument
  Bid/No-Bid score            →          Custom Field: BidScore__c
  Risk score                  →          Custom Field: RiskScore__c
```

**What to build:**
1. `SalesforceSync` service in `/services/salesforce/`
2. Environment variables: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_INSTANCE_URL`
3. OAuth 2.0 JWT Bearer flow (server-to-server, no user login needed)
4. Event-driven sync: on proposal status change, push to Salesforce
5. Optional: pull Salesforce Account data (client address, contacts) to pre-fill proposals
6. Admin page: Salesforce connection status, field mapping config

**Important:** This is a one-way push initially. We push deal data TO Salesforce. We don't try to own the pipeline view. Jireh's team sees our data in the tool they already use.

**Effort:** 5-7 days for basic push integration  
**Owner:** Platform/Admin  
**Dependency:** Need Salesforce admin access from ANC (API credentials, custom field setup)

---

### Phase 3.4 — "Revenue Proof" (Weeks 7-8)

This is the moonshot. The feature that turns ANC from "a company that sells screens" into "a company that proves screens make money."

---

#### 3.4.1 Proof of Performance Reporting

**Business case:** ANC's Multimedia Rights division sells ad space on screens they install. They pay stadiums for the rights, then sell ads to sponsors (Coca-Cola, Budweiser, etc.). Sponsors need PROOF their ads actually ran — timestamps, photos, uptime data. Today this is done manually. It's a massive pain point industry-wide. No one does it well.

**Why this is the killer feature:**
1. ANC already has the software (vSOFT/LiveSync) running the content on screens
2. The data exists — play logs, uptime data, content schedules
3. No one in the industry automates the "proof" report for sponsors
4. A branded PDF that says "Your Coca-Cola ad ran 847 times across 12 screens during 41 home games with 99.2% uptime" is worth $50K-$100K in renewed sponsorship deals
5. This locks sponsors into ANC's ecosystem — they can't get this report from anyone else

**What to build:**

**Data Model:**
```prisma
model Screen {
  id          String   @id @default(cuid())
  name        String   // "Main Scoreboard", "Concourse Ribbon East"
  venueId     String
  venue       Venue    @relation(...)
  installDate DateTime
  manufacturer String
  modelNumber  String
  pixelPitch   Float
  widthFt      Float
  heightFt     Float
  playLogs     PlayLog[]
}

model Venue {
  id       String   @id @default(cuid())
  name     String   // "Gainbridge Fieldhouse"
  client   String   // "Indiana Pacers"
  city     String
  state    String
  screens  Screen[]
}

model PlayLog {
  id          String   @id @default(cuid())
  screenId    String
  screen      Screen   @relation(...)
  sponsorName String   // "Coca-Cola"
  contentName String   // "Coke_15sec_Holiday_2026"
  playedAt    DateTime
  durationSec Int
  verified    Boolean  @default(false)
  source      String   // "vsoft_api" | "livesync_import" | "manual"
}

model PerformanceReport {
  id          String   @id @default(cuid())
  venueId     String
  sponsorName String
  dateFrom    DateTime
  dateTo      DateTime
  totalPlays  Int
  uptimePct   Float
  reportPdf   String?  // URL to generated PDF
  generatedAt DateTime @default(now())
}
```

**Report Template (branded ANC PDF):**
```
┌─────────────────────────────────────────────────────────┐
│  [ANC Logo]           PROOF OF PERFORMANCE              │
│                       Gainbridge Fieldhouse              │
│                       Season: 2025-26                    │
├─────────────────────────────────────────────────────────┤
│  SPONSOR: Coca-Cola                                     │
│  PERIOD: October 1, 2025 — March 31, 2026               │
│  SCREENS: 12 active displays                             │
├─────────────────────────────────────────────────────────┤
│  SUMMARY                                                 │
│  Total Plays: 847                                        │
│  Total Airtime: 3 hrs 31 min 45 sec                     │
│  Screen Uptime: 99.2%                                    │
│  Contract Compliance: 100%                               │
│  Estimated Impressions: 2.4M (based on venue traffic)    │
├─────────────────────────────────────────────────────────┤
│  SCREEN-BY-SCREEN BREAKDOWN                              │
│  ┌──────────────────┬───────┬──────────┬───────────────┐ │
│  │ Screen           │ Plays │ Uptime % │ Compliance    │ │
│  ├──────────────────┼───────┼──────────┼───────────────┤ │
│  │ Main Scoreboard  │  82   │  99.8%   │ ✓ On Track    │ │
│  │ Ribbon East      │  76   │  99.1%   │ ✓ On Track    │ │
│  │ Ribbon West      │  74   │  98.7%   │ ✓ On Track    │ │
│  │ ...              │  ...  │  ...     │ ...           │ │
│  └──────────────────┴───────┴──────────┴───────────────┘ │
├─────────────────────────────────────────────────────────┤
│  PLAY LOG (SAMPLE — FULL LOG ATTACHED)                   │
│  2026-03-15 19:32:14  Main Scoreboard  Coke_15sec  ✓    │
│  2026-03-15 19:47:02  Ribbon East      Coke_15sec  ✓    │
│  2026-03-15 20:01:18  Ribbon West      Coke_30sec  ✓    │
├─────────────────────────────────────────────────────────┤
│  CERTIFIED BY: ANC Sports Enterprises, LLC               │
│  Generated: March 31, 2026                               │
│  Report ID: POP-2026-GBF-COKE-001                        │
└─────────────────────────────────────────────────────────┘
```

**Phase A (2 weeks):** Manual data entry + report generation
- Admin UI to add venues, screens, sponsors
- CSV upload for play logs (export from vSOFT)
- PDF report generator using existing template pipeline
- Branded, timestamped, unique report ID

**Phase B (future):** vSOFT/LiveSync API integration
- Automatic play log ingestion
- Real-time uptime monitoring
- Automated monthly report generation + email to sponsors

**Why start with manual:** ANC already has the play data in vSOFT. They just need the report. Give them the report engine first. Automate the data pipe later.

**Effort:** Phase A: 10-12 days. Phase B: depends on vSOFT API access.  
**Owner:** Operations (Eric Gruner) + Revenue (Jireh)  
**Strategic value:** This is the feature that makes ANC irreplaceable. Sponsors can't get this from anyone else.

---

## Build Order — Final Priority

| Week | Feature | Who Benefits | Strategic Value |
|------|---------|-------------|-----------------|
| **1** | Multi-Vendor Option Compare | Natalia (daily) | Tech-agnostic selling point |
| **1-2** | Export All 3 Tiers | Natalia (daily) | Budget→Proposal→LOI progression |
| **2-3** | Warranty/Service Contract Calculator | Matt/Jireh | 10-year TCO, revenue on every deal |
| **3-4** | Client Portal (approval + comments + tracker) | Natalia/Clients | Lock-in strategy |
| **4-5** | Bid/No-Bid Scorecard | Jeremy | Saves 20-40 hrs per bad RFP |
| **5-6** | Salesforce Integration (push sync) | Jireh/Sales | Data flows where team lives |
| **6-8** | Proof of Performance Reporting | Eric/Jireh/Sponsors | Industry game-changer |

---

## What We Are NOT Building

| Feature | Why Not | Who Does It |
|---------|---------|-------------|
| Contact management | Salesforce does this | Salesforce |
| Email tracking | Salesforce + Outlook | Salesforce |
| Pipeline forecasting | Salesforce reports | Salesforce |
| Territory management | Salesforce | Salesforce |
| Meeting scheduling | Calendly/Outlook | Existing tools |
| Win/Loss dashboards | Salesforce Opportunity reports | Salesforce (we push the data) |
| Activity logging | Salesforce Activity | Salesforce |
| Task management | Salesforce Tasks | Salesforce |

**Our dashboard shows project-level metrics** (completion rate, proposal count, total estimates) — but we push deal-level data (pipeline value, win/loss) to Salesforce instead of trying to replace their sales dashboards.

---

## Integration Architecture

```
                    ┌─────────────┐
                    │  Salesforce  │
                    │  (CRM Hub)   │
                    └──────┬──────┘
                           │
              Opportunity sync (REST API)
              Push: deal value, status, PDFs
              Pull: client info (optional)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                ANC PROPOSAL ENGINE                        │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Estimator  │  │ Proposals  │  │ RFP Intelligence   │ │
│  │            │  │            │  │                    │ │
│  │ • Wizard   │  │ • Mirror   │  │ • PDF Filter       │ │
│  │ • Compare  │  │ • Intel    │  │ • Risk Scanner     │ │
│  │ • Warranty │  │ • LOI      │  │ • Bid/No-Bid       │ │
│  │ • Bundler  │  │ • Share    │  │ • Screen Extract   │ │
│  │ • RFQ Gen  │  │ • Export   │  │ • Schedule Extract  │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Admin      │  │ Client     │  │ Proof of           │ │
│  │            │  │ Portal     │  │ Performance        │ │
│  │ • Products │  │            │  │                    │ │
│  │ • Rate Card│  │ • View     │  │ • Venues           │ │
│  │ • Users    │  │ • Annotate │  │ • Screens          │ │
│  │ • Pricing  │  │ • Approve  │  │ • Play Logs        │ │
│  │   Logic    │  │ • Comment  │  │ • Sponsor Reports  │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Feature | How We Know It Worked |
|---------|----------------------|
| Multi-Vendor Compare | Natalia creates option proposals in <10 min instead of >1 hour |
| 3-Tier Export | One estimate produces Budget + Proposal + LOI without re-entry |
| Warranty Calculator | Every deal over $100K includes a warranty line item |
| Client Portal | >50% of shared proposals get client interaction (approve/comment) |
| Bid/No-Bid | Team rejects 2-3 bad RFPs per quarter before wasting 20+ hours |
| Salesforce Sync | Deal data appears in Salesforce within 5 min of status change |
| Proof of Performance | First sponsor report generated and delivered within 30 days |

---

*Prepared by Ahmad Basheer — February 2026*
