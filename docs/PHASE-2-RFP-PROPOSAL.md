# Phase II Proposal — RFP Intelligence & Estimation Automation

**Prepared for:** Natalia Kovaleva, ANC Sports Enterprises  
**Prepared by:** Ahmad Basheer  
**Date:** February 16, 2026

---

## What This Phase Delivers

One workflow: **Upload an RFP → the system reads it, extracts every LED display → outputs a structured Excel with all screens, specs, and key project data.**

No manual reading. No re-typing. The estimator gets a clean spreadsheet they can immediately price against.

---

## How It Works

### Step 1 — Upload

The user uploads an RFP document (PDF, any size — the system handles 100 to 2,500+ pages). Scanned PDFs are supported via built-in OCR.

### Step 2 — AI Reads the Document

The system:

1. **Scores every page** for relevance to LED/AV scope (filters out legal boilerplate, team bios, insurance forms)
2. **Finds Division 11** sections automatically (Section 11 06 60, 11 63 10, Display Schedule, Exhibit G)
3. **Scans architectural drawings** using AI vision to identify display locations drawn on floor plans and elevations
4. **Extracts key points** — client name, venue, project type, deadlines, scope of work, pricing structure, compliance requirements, red flags

### Step 3 — Screen Extraction

For every LED display mentioned in the RFP, the system extracts:

| Field | Source |
|-------|--------|
| Screen Name / ID | Form 1a/1b labels, section headings |
| Location | Zone, area, concourse, lobby, etc. |
| Dimensions (W × H) | Feet, inches, or metric — auto-converted |
| Pixel Pitch | mm (e.g., 2.5mm, 3.9mm, 10mm) |
| Resolution (px) | If specified |
| Indoor / Outdoor | Detected from context |
| Brightness (nits) | If specified |
| Max Power (watts) | If specified |
| Weight (lbs) | If specified |
| Hardware / Module | Manufacturer and model if named |
| Processing | Video processor if specified |
| Quantity | Per location |
| Confidence Score | How certain the extraction is (0–100%) |
| Source Citation | Which section/page the data came from |

Each field includes a confidence indicator so the estimator knows what's solid vs. what needs verification.

### Step 4 — Excel Output

The system generates a downloadable Excel workbook with:

**Sheet 1 — Display Schedule**
One row per screen. All fields from the table above. Sortable, filterable, ready to hand to the estimator.

**Sheet 2 — Key Points Summary**

- Client & venue
- Project type (new install / replacement / upgrade)
- Critical deadlines (response due, pre-bid, NTP, install start, completion)
- Scope of work summary
- Pricing submission format
- Required forms and exhibits

**Sheet 3 — Red Flags & Watch Items**

- Unusual requirements
- Tight timelines
- Special insurance/bonding requirements
- Ambiguous specs needing RFI
- Liquidated damages, prevailing wage, union requirements

**Sheet 4 — Product Matching**
For each extracted screen, the system queries ANC's product catalog and suggests:

- Best-fit product from each manufacturer (LG, Yaham, etc.)
- Closest available pixel pitch
- Cabinet dimensions and count needed
- Estimated cost per square foot

### Step 5 — Internal Audit Excel *(format to be discussed)*

A separate workbook designed for finance and estimating review. Proposed structure:

- Full cost breakdown per display
- Margin analysis (cost → selling price with margin formula visible)
- Rate card values applied (which rates were used and where they came from)
- Formula transparency — every number traceable to its source
- Variance flags where AI-extracted specs differ from catalog specs

> We'd like to schedule a call to finalize the exact columns and layout for this workbook so it matches exactly what the team needs.

---

## Capabilities Included

### Core (Requested)

| # | Capability | Description |
|---|-----------|-------------|
| 1 | **RFP Upload & OCR** | Upload any PDF (including scanned). System extracts all text, handles 100–2,500+ pages. |
| 2 | **Intelligent Page Filtering** | Scores every page for LED/AV relevance. Discards boilerplate. Keeps only what matters. |
| 3 | **Division 11 Auto-Detection** | Automatically locates LED Display Systems sections (11 06 60, 11 63 10, Display Schedule, Exhibit G). |
| 4 | **Screen Extraction** | Pulls every display with dimensions, pitch, location, environment, quantity, and confidence score. |
| 5 | **Key Point Extraction** | Deadlines, scope, pricing format, compliance requirements, red flags — structured, not buried in prose. |
| 6 | **Excel Export — Display Schedule** | One-click download. One row per screen. All extracted specs. Ready for estimating. |
| 7 | **Excel Export — Key Points & Red Flags** | Separate sheets for project summary and risk items. |
| 8 | **Internal Audit Excel** | Finance-facing workbook with full cost/margin transparency. |

---

## Suggested Capabilities — Based on ANC Workflow Analysis

We spent time studying how ANC's estimating, proposals, and deal pipeline actually work — the handoffs between team members, where time gets lost, and where money gets left on the table. These aren't generic features. Each one targets a specific problem we observed in the workflow.

### A. Drawing Analysis (AI Vision)

**The problem:** RFPs often specify displays only on architectural drawings — not in the text. A 2,000-page RFP might have 15 pages of floor plans where displays are drawn but never listed in a schedule. If someone doesn't manually find and read every drawing, screens get missed.

**What it does:** AI vision scans every drawing page, identifies display locations, reads dimensions and labels directly from the floor plan, and feeds them into the extraction pipeline alongside the text-based results.

**Why it matters:** Missed screens = missed revenue. One overlooked ribbon board on a concourse drawing is $50K–$200K that never makes it into the bid.

---

### B. Automatic Product Matching

**The problem:** After extracting screen specs from an RFP, the estimator manually searches the product catalog to find which LED module fits each display — matching pixel pitch, environment, brightness requirements, and cabinet dimensions. For a project with 7–12 displays, this takes hours.

**What it does:** For each extracted screen, the system automatically queries ANC's product catalog and ranks the best-fit products by manufacturer. Shows cabinet count, total weight, total power, and estimated hardware cost — before the estimator touches anything.

**Why it matters:** Turns a 2-hour product selection process into a 5-minute review. The estimator confirms or overrides, instead of starting from scratch.

---

### C. RFP-to-Estimator Pipeline

**The problem:** Today, the person reading the RFP extracts specs into notes or a spreadsheet. Then the estimator re-enters those same specs into the pricing tool. Every handoff is a chance for errors — wrong pixel pitch, wrong dimensions, missed alternates.

**What it does:** One button pushes all extracted screens directly into the estimator with specs pre-filled — dimensions, pitch, environment, product match, zone classification. The estimator opens a project that's already 80% populated.

**Why it matters:** Eliminates the re-entry step entirely. The person who reads the RFP and the person who prices it no longer need to manually transfer data between systems.

---

### D. Contract Risk Scanner (20-Point Checklist)

**The problem:** RFPs contain financial and legal landmines buried in hundreds of pages of boilerplate: uncapped liquidated damages, unusually high bond rates, retainage over 10%, no change order process, prevailing wage requirements, missing force majeure clauses. These get missed until legal review — which often happens after the bid is submitted.

**What it does:** Scans the full RFP text against a 20-point checklist built specifically for ANC's business:

| Category | Checks |
|----------|--------|
| **Financial** | Liquidated damages (+ cap detection), bond rate (flags >5%), payment terms, retainage (flags >10%), change order process |
| **Legal** | Force majeure, limitation of liability, indemnification scope, termination clauses, IP/ownership |
| **Scope** | Exclusions, prevailing wage/union, working hours restrictions, permit responsibility |
| **Timeline** | Substantial completion date, weather day allowances, concurrent contractor coordination |
| **Warranty** | Duration (flags >5 years), extended maintenance requirements, spare parts (flags >10%) |

Each item is flagged as **pass**, **warning**, or **critical** with a specific recommendation. The output is a risk score (0–100) that tells the team at a glance whether this RFP has hidden exposure.

**Why it matters:** A single uncapped LD clause on a $2M project can cost more than the entire margin. This catches it before the bid goes out, not after.

---

### E. Addendum & Revision Tracking

**The problem:** Large RFPs go through 3–5 addendums. Each one might change display specs, add screens, shift deadlines, or modify compliance requirements. Today, someone has to manually diff the documents to find what changed. On a 2,000-page RFP, this is brutal.

**What it does:** Upload the original and each addendum. The system compares them and produces a structured delta report: added screens, changed specs (highlighted in red/green), new deadlines, modified compliance items. Maintains a running changelog across all versions.

**Why it matters:** Addendum #3 changes a pixel pitch from 2.5mm to 4mm on one display. That's a $40K cost difference. If the estimator prices against the original spec, the bid is wrong. This makes sure nothing slips through.

---

### F. Bid/No-Bid Scorecard

**The problem:** The team spends 20–40 hours responding to an RFP before anyone formally decides whether it's worth pursuing. Some RFPs have impossible timelines, unfavorable terms, or margins that don't justify the effort. But by the time someone realizes that, the work is already done.

**What it does:** Within minutes of upload, the system scores the opportunity across five dimensions:

| Dimension | What It Measures |
|-----------|-----------------|
| **Margin Potential** | Estimated project value vs. typical ANC margins for this project type |
| **Timeline Feasibility** | Does the schedule allow for ANC's standard design→manufacture→ship→install sequence (typically 9+ weeks)? |
| **Compliance Burden** | How many forms, certifications, bonds, and special requirements? |
| **Risk Exposure** | Output from the 20-point contract scanner |
| **Competitive Position** | Public bid vs. invited, incumbent advantage, relationship signals |

Produces a simple **Go / Caution / No-Go** recommendation with the reasoning behind it.

**Why it matters:** Saves 20–40 hours of estimating time on deals that were never going to work. Lets the team focus effort on winnable projects.

---

### G. Scope of Work Generator

**The problem:** Every proposal needs a scope of work, and every SOW is 80% the same — design & engineering, manufacturing, shipping, installation, testing, training, warranty, project management. But someone still writes it from scratch or copy-pastes from the last project and edits.

**What it does:** Based on the RFP requirements and configured displays, auto-generates a complete SOW using ANC's standard language across 8 sections:

1. Design & Engineering (PE-stamped drawings, electrical load calcs, pixel mapping)
2. Manufacturing & Procurement (LED modules, steel, power distribution, control systems)
3. Shipping & Logistics (freight, customs, staging, delivery schedule)
4. Installation & Construction (structural steel, LED mounting, electrical, data, commissioning)
5. Testing & Commissioning (72-hour burn-in, pixel calibration, content verification)
6. Training & Documentation (operator training, as-builts, O&M manuals)
7. Warranty & Support (10-year LED, 2-year electronics, 24/7 monitoring, 4-hour response)
8. Project Management (single POC, weekly reports, GC coordination, change orders)

Each section is toggleable and editable. The AI tailors the language to the specific project — outdoor vs. indoor, new install vs. replacement, single venue vs. multi-phase.

**Why it matters:** A professional, project-specific SOW in minutes instead of hours. Consistent language across all proposals. Nothing gets forgotten.

---

### H. Automatic Schedule Generation

**The problem:** Every proposal needs a project timeline, and ANC's standard sequence is well-defined: NTP → design (38 days) → manufacturing (45 days, parallel) → ocean freight (23 days) → ground shipping (4 days) → install (varies by size/complexity). But building this schedule manually for each project takes time, and the durations need to account for business days, parallel tasks, and location-specific complexity.

**What it does:** Enter a Notice to Proceed date and the system generates a complete project schedule:

- **Pre-install phases:** Design, secondary structural, electrical, control room (parallel tracks), submittals, owner review, manufacturing, shipping, integration, programming
- **Per-location install:** Mobilization, demolition, secondary steel (if complex), LED panel install, infrastructure (parallel), low voltage (parallel), finishes
- All durations in **business days** (Mon–Fri), properly sequenced with dependencies
- Parallel tasks start on correct offsets
- Scales automatically based on display count (small/medium/large)

**Why it matters:** A Gantt-ready schedule that accounts for ANC's actual manufacturing and install timelines. No more manually counting business days or forgetting that ocean freight takes 23 days, not 14.

---

### I. Warranty Cost Escalation Model

**The problem:** Extended warranty and maintenance agreements (years 4–10) are a significant revenue stream, but the pricing is non-trivial. ANC's model uses a 10% annual escalation — year 4 costs 10% more than year 3, year 5 costs 10% more than year 4, compounding. Getting this wrong on a 10-year deal means leaving money on the table or pricing yourself out.

**What it does:** Automatically calculates warranty pricing for any duration:
- Base warranty cost from display specs and rate card
- 10% annual compound escalation for extended years
- Per-display and per-project warranty totals
- Comparison view: 3-year vs. 5-year vs. 10-year options

**Why it matters:** Warranty revenue on a large venue can be $200K–$500K over 10 years. Accurate escalation pricing protects margin on every year of the agreement.

---

### J. Prevailing Wage & Labor Rate Adjuster

**The problem:** Public projects (stadiums, transit, government venues) frequently require prevailing wage rates — Davis-Bacon, union labor, or state-specific rates. These can increase install labor costs by 40–80% compared to standard rates. If the estimator prices at standard rates and the RFP requires prevailing wage, the margin evaporates.

**What it does:** The contract scanner detects prevailing wage, union, and Davis-Bacon requirements automatically. When detected, the system:
- Flags the requirement prominently in the red flags sheet
- Adjusts the install labor estimate using prevailing wage multipliers
- Shows the cost delta between standard and prevailing wage pricing
- Includes the adjustment in the audit Excel so finance can verify

**Why it matters:** A $300K install priced at standard rates becomes $480K at prevailing wage. Missing this on one project wipes out the margin on three others.

---

### K. Multi-Venue / Multi-Phase Project Support

**The problem:** Large clients (NFL, NBA, MLS) often have multi-venue or multi-phase projects — 3 stadiums, 5 phases, different display packages per venue. Today, each venue is a separate project. There's no way to see the total deal value, compare specs across venues, or ensure consistent pricing.

**What it does:**
- Group multiple venues/phases under one master project
- Roll-up pricing across all venues (total deal value at a glance)
- Ensure consistent product selection and margin structure across venues
- Per-venue and consolidated Excel exports
- Track which venues are in which phase (design, manufacturing, install, complete)

**Why it matters:** A 3-venue NFL deal is $6M–$15M. Managing it as three separate projects means no one sees the full picture. Consolidated tracking means better negotiation leverage, consistent pricing, and nothing falling through the cracks.

---

## Summary of All Capabilities

### Core (8 items)

| # | Capability |
|---|-----------|
| 1 | RFP Upload & OCR |
| 2 | Intelligent Page Filtering |
| 3 | Division 11 Auto-Detection |
| 4 | Screen Extraction |
| 5 | Key Point Extraction |
| 6 | Excel Export — Display Schedule |
| 7 | Excel Export — Key Points & Red Flags |
| 8 | Internal Audit Excel |

### Suggested Additions (11 items)

| # | Capability |
|---|-----------|
| A | Drawing Analysis (AI Vision) |
| B | Automatic Product Matching |
| C | RFP-to-Estimator Pipeline |
| D | Contract Risk Scanner (20-Point) |
| E | Addendum & Revision Tracking |
| F | Bid/No-Bid Scorecard |
| G | Scope of Work Generator |
| H | Automatic Schedule Generation |
| I | Warranty Cost Escalation Model |
| J | Prevailing Wage & Labor Rate Adjuster |
| K | Multi-Venue / Multi-Phase Project Support |

---

## What We Need From ANC

| # | Item | Why |
|---|------|-----|
| 1 | **Call to discuss audit Excel format** | Align on columns, layout, and what finance needs to see |
| 2 | **2–3 sample RFPs** | Real documents to test and refine extraction accuracy (the bigger and messier, the better) |
| 3 | **Green light on scope** | Confirm which capabilities from the list above are in vs. out |
| 4 | **Product catalog data** | LED product specs and pricing for the matching engine |
| 5 | **Estimating team input** | Feedback on what the "ideal" extraction output looks like for their workflow |

---

## Timeline

Delivery is phased so ANC gets usable output early, not everything at the end:

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| **M1** | Upload RFP → structured brief + screen list (on-screen) | Week 2 |
| **M2** | Excel export — Display Schedule + Key Points + Red Flags | Week 3 |
| **M3** | Product matching + contract risk scanner integrated | Week 4 |
| **M4** | Audit Excel (format confirmed after call) | Week 5 |
| **M5** | Drawing analysis + schedule generation | Week 6 |
| **M6** | RFP → Estimator pipeline + SOW generator | Week 7 |
| **M7** | Addendum tracking + Bid/No-Bid scorecard | Week 8 |
| **M8** | Warranty model + prevailing wage adjuster + multi-venue | Week 9–10 |

> Weeks are from project kickoff after approval.

---

## Pricing

| Tier | Includes | Price |
|------|----------|-------|
| **Core** (items 1–8) | RFP upload, extraction, Excel output, audit Excel | $ |
| **Core + Suggested** (items 1–8 + A–K) | Everything above + drawing analysis, product matching, pipeline, risk scanner, addendum tracking, bid scorecard, SOW generator, schedule, warranty model, prevailing wage, multi-venue | $ |

---

## Next Step

1. Schedule a call to align on the audit Excel format and confirm scope
2. We can do a live demo of the extraction engine on that call — upload a real RFP and show what the system pulls out
3. Confirm timeline and kick off

---

*Prepared by Ahmad Basheer — February 2026*
