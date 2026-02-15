# ANC Proposal Engine — Deliverables & Scope Overview

**Prepared for:** Natalia Kovaleva, Jared, ANC Leadership
**Prepared by:** Ahmad, Assisted.VIP
**Date:** February 2026

---

## Purpose of This Document

This document outlines three things clearly:

1. **What was originally agreed upon** — the Phase 1 scope of work that was quoted and paid for
2. **What was actually delivered** — everything built to date, including significant work beyond the original scope
3. **What Phase 2 could look like** — based on Natalia's request and suggested capabilities the platform can support

---

# Part 1: Original Agreement (Phase 1 Scope)

Based on our kickoff meeting discussions, the agreed scope of work covered two core deliverables:

### A. Mirror Mode — "Excel In, Branded PDF Out"

**The problem:** Natalia spends hours manually retyping numbers from estimators' Excel spreadsheets into InDesign or Word to produce client-facing proposals. In multimillion-dollar deals, a single typo is unacceptable.

**What was agreed:**
- Upload an ANC pricing Excel file
- The system reads the exact cell values — line items, section headers, subtotals, grand total
- It generates a branded PDF that matches the Excel precisely
- Zero math — the system trusts the Excel 100%, no rounding, no recalculation
- Professional ANC branding on every page (fonts, margins, blue slash graphics)
- Ability to make minor modifications before final export

**Status: Delivered.**

---

### B. LED Budget Estimator — "The Question Tree"

**The problem:** When someone with limited experience (like a sales rep) needs a quick budget number, they currently have to bother Matt or Jeremy. The team wanted a self-serve tool where anyone can get a rough budget by answering simple questions.

**What was agreed (Natalia's exact description from our meeting):**

> *"Scope of work is somebody with no experience like myself comes in and says I want to price a marquee. The engine asks me is it outdoor indoor, I say outdoor. It asks me the size, I give it the size. It tells me the closest size from LG, the closest from Yaham. What pixel pitch? I say this pitch. It says okay, I have size and pitch, I can calculate pixel count. Tell me about the structure — five options, I click one. Tell me about electrical, I click one. Tell me about permits, I click one. Tell me about shipping, I click one. It says okay, your budget is ready, and spills that Excel for me — like a rough budget."*

**Key requirements from the team:**
- **Not conversational** — no chat-style AI interaction. Step-by-step, one question at a time
- **Pre-built answer options** — not free-form text. "Indoor or Outdoor?" with two buttons, not a text box
- **Formulas built in** — structure, electrical, shipping, permits all calculated automatically based on the answers. The user never enters dollar amounts
- **Usable by the least technical person on the team** — designed so someone like Alex (sales, minimal technical knowledge) can produce a rough budget without bothering Matt
- **Output is an Excel** — the budget spills out as a spreadsheet, not just a PDF

**What Natalia explicitly said was NOT in Phase 1 scope:**

> *"For RFP, do not spend too much time on that because this was not quoted and I don't want you to work on something that is outside of what we talked about."*

> *"Don't spend time building it because that's not in the scope of work."*

**Status: Delivered — and significantly exceeded.**

---

# Part 2: What Was Actually Delivered

Everything in Phase 1 scope was delivered. On top of that, the platform now includes a substantial amount of additional functionality that was built proactively to address pain points the team described during our meetings. This work goes well beyond the original quote.

## Phase 1 Scope — Delivered

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | **Mirror Mode** — Upload Excel → branded PDF, zero math, exact match | Delivered |
| 2 | **LED Budget Estimator** — Step-by-step question flow, pre-built options, auto-calculated budget Excel | Delivered |

## Beyond Phase 1 — Delivered at No Additional Cost

The following features were built based on pain points discussed in our meetings. They were not part of the original quote but are live and working on the platform today.

### For Natalia (Proposals & Formatting)

| # | Feature | What It Does |
|---|---------|-------------|
| 3 | **Three-Mode Document Toggle** | One switch changes the entire document between Budget (soft language, no signatures), Proposal (Sales Quotation), and LOI (full legal wrapper with payment terms, liability clauses, signature blocks). No more manually editing headers and footers for each deal stage. |
| 4 | **Frankenstein Excel Normalizer** | When a non-standard Excel comes in (weird columns, merged cells — like Moody Center), the system asks you to map the columns once. It saves that fingerprint and auto-recognizes the format forever after. Map once, remember forever. |
| 5 | **Share Links** | Generate a unique link for any proposal. The client views it in their browser — no login, no PDF attachment. The link is version-locked (old link always shows old version), expires after 30 days, and optionally password-protected. Internal costs and margins are stripped — clients only see selling prices. |
| 6 | **E-Signature Integration** | DocuSign integration for LOI documents. Client can sign electronically. Full audit trail — who signed, when, from where. |
| 7 | **AI Verification Guardrail** | If any data in a proposal was filled by AI and hasn't been verified by a human, the system blocks sharing. No unverified numbers go to clients. |

### For Matt (Estimating & Pricing)

| # | Feature | What It Does |
|---|---------|-------------|
| 8 | **Smart Assembly Bundler** | 22-rule logic engine. Select "Scoreboard" and it auto-adds video processor ($12K), receiving cards, spare modules, fiber converter, mounting brackets. Select "Wall Mount" and it adds vertical steel and plywood. No more forgetting $5K-$30K in hidden line items. Toggle any item on or off. |
| 9 | **AI Quick Estimate** | Describe a project in one paragraph ("Indiana Fever needs a 20x12 scoreboard at 4mm, two ribbon boards at 6mm, indoor, union"). The AI extracts every detail and fills the entire question flow automatically. |
| 10 | **Vendor RFQ Generator** | One-click button that takes project specs and generates a formatted Request for Quotation with an RFQ number. Select LG, Yaham, or multiple manufacturers — each gets their own document. No more retyping specs into emails. |
| 11 | **Budget Reverse Engineer** | Client says "I have $500K." Enter the budget, and the system searches the product catalog to show which LED products and configurations fit within that number, ranked by best fit with headroom shown. |
| 12 | **Metric Mirror** | Matt types "20 ft wide." The system finds the closest cabinet count in millimeters, snaps to it, and shows: "You asked for 20ft, actual build is 19.69ft (12 cabinets)." Color-coded: green (close), amber (noticeable gap), red (significant mismatch). |
| 13 | **Cost Category Breakdown (3A-3G)** | In Detailed mode, shows a full per-display breakdown across all 7 ANC cost categories: Structural Materials, Labor & LED Install, Electrical & Data, Lighting Cove, PM/GC/Travel, Engineering & Permits, Equipment & Logistics. |
| 14 | **AI Copilot (Lux)** | Chat assistant inside the Estimator. "Set margin to 38%", "Add a 20x10 ribbon board", "What's the total?" — it updates the estimate in real time. Also works on the Dashboard: "What's the pipeline value?", "Which projects need attention?" |

### For Jeremy (RFPs & Risk)

| # | Feature | What It Does |
|---|---------|-------------|
| 15 | **PDF Page Triage** | Upload a 3,000-page construction PDF. The system scores every page for relevance (LED specs, AV drawings, display schedules) and separates signal from noise. Drag pages between Keep and Discard. Export a filtered PDF with only what matters. |
| 16 | **Contract Risk Scanner (Liability Hunter)** | Paste contract text or upload a PDF. The system runs a 20-point checklist hunting for financial landmines: liquidated damages, performance bonds, union requirements, prevailing wage, insurance, warranty terms. Each item flagged as pass, warning, or critical. |
| 17 | **Revision Radar** | Upload two Excel files — original and revised. The system diffs them section by section: changed rows in amber, price increases in red, decreases in green. Grand total delta at the top. No more re-reading 50-page addendums to find what changed. |
| 18 | **Visual Cut-Sheet Automator** | Auto-generates per-display spec sheets with dimensions, resolution, power, weight, and installation notes based on environment and mount type. |

### For Everyone (Platform & Admin)

| # | Feature | What It Does |
|---|---------|-------------|
| 19 | **Projects Dashboard** | Pipeline view with total value, project counts by mode, status tracking (Draft → Approved → Signed), search, and KPI strip. |
| 20 | **Brief Me** | Click the sparkle icon on any project. AI reads the data, researches the client, and gives a one-page intelligence brief. |
| 21 | **Product Catalog** | Full database of LED products — manufacturer, model, pixel pitch, cabinet dimensions, weight, power, brightness, cost per sqft. Feeds into the Estimator, Reverse Engineer, and RFQ Bot. |
| 22 | **Rate Card** | All pricing constants in one place — LED cost by pitch, labor rates, PM fees, margins, bond rates. Change a rate and every new estimate uses it. |
| 23 | **Gap Fill Assistant** | After AI extracts data from an uploaded document, the system walks through missing fields one question at a time: "I found 'Main Scoreboard' but cannot find the pixel pitch. What is it?" |
| 24 | **Document OCR** | Built-in text extraction for scanned PDFs, DOCX, DOC, and 75+ formats. Even image-only PDFs are readable. |
| 25 | **Modern UI Dialogs** | Every confirmation and error message uses a professional, branded dialog instead of browser-default popups. |

---

### Summary: Phase 1 Value

| | Count |
|--|-------|
| **Agreed deliverables** | 2 |
| **Actually delivered** | 25 |
| **Additional features at no extra cost** | 23 |

---

# Part 3: Phase 2 — What Natalia Requested

On Slack, Natalia communicated the following:

> *"Send a new proposal for Phase II — RFP identification — upload RFP — it reads it, extracts key points — spits out Excel with the list of all screens. Add list of potential capabilities as well as alternatives."*

> *"My boss is putting pressure on estimation to help with building the tree."*

> *"My boss also wants a call with you to discuss how that 'audit' Excel should look like."*

### What's Being Asked For

| # | Capability | Description |
|---|-----------|-------------|
| A | **RFP Intelligence Engine** | Upload a full RFP (hundreds or thousands of pages). The system reads it, identifies every LED display mentioned, and produces an Excel listing each screen with its name, specified size, pixel pitch, location, and any other extracted specs. |
| B | **Key Point Extraction** | Beyond just screens — extract schedule milestones, liquidated damages, bond requirements, union/prevailing wage, insurance minimums, warranty terms, and any other commercially significant items. Presented as a structured summary. |
| C | **Product Matching** | For each extracted screen, suggest matching products from ANC's catalog — closest sizes from each manufacturer, with pixel pitch options and pricing. |
| D | **Audit Excel** | A detailed internal Excel that shows the full math behind every number — costs, margins, formulas, rate card values. For the CFO to verify that the margin is correct. (Jared wants to discuss format.) |
| E | **Drawing Analysis** | AI vision that scans architectural and AV drawing pages, identifies display locations, reads schedule-of-displays tables directly from drawings, and feeds them into the extraction. |

### Suggested Additional Capabilities for Phase 2

Based on what the platform can already do and the workflows we've observed, these would add significant value:

| # | Capability | Why It Matters |
|---|-----------|---------------|
| F | **RFP-to-Estimate Pipeline** | After extracting screens from an RFP, one click to push them into the Estimator with all specs pre-filled. Jeremy extracts, Matt prices — seamless handoff. |
| G | **Scope of Work Generator** | Based on extracted RFP requirements + configured displays, auto-generate a scope of work document with ANC's standard language, tailored to the specific project. |
| H | **Compliance Checklist** | Cross-reference RFP requirements against the proposed solution. Flag anything the RFP asks for that isn't covered — before the client finds it. |
| I | **Multi-Version Tracking** | As addendums come in, upload each version. The system tracks what changed across all versions and maintains a running delta log. |
| J | **Event-Day Labor Calculator** | For venues that require on-site technicians during events (e.g., "4 hours before gates open, 4 events per week"), calculate: (Events x Hours x Rate) + (Techs x Per Diem). Catches variable labor costs that flat-rate estimates miss. |
| K | **Bid/No-Bid Scorecard** | Before spending 40 hours on an RFP response, score the opportunity: margin potential, competition level, relationship strength, compliance difficulty. Quick go/no-go decision support. |

---

# Part 4: What We Need to Move Forward

### From ANC (for Phase 2 quote)

1. **Confirmation from Jared** — green light to proceed with Phase 2 scope
2. **Call with Jared** — to discuss the audit Excel format and what finance needs to see
3. **Matt and Jeremy's question tree** — the logic for how screens are priced (Matt committed to providing this). Even rough notes, voice memos, or a brain-dump work. Ahmad can structure it.
4. **Eric's product data** — LED product specs and pricing to populate the catalog for accurate matching
5. **Sample RFPs** — 2-3 real RFPs to test the extraction engine against (the bigger and messier, the better)

### From Ahmad / Assisted.VIP (next steps)

1. **Phase 2 proposal with pricing** — based on confirmed scope from this document
2. **Timeline estimate** — delivery milestones for each capability
3. **Demo of existing RFP capabilities** — the platform already has partial RFP functionality (PDF Triage, Liability Scanner, Drawing Analysis). We can demo what's working before quoting the full build.

---

# Appendix: Feature Location Reference

For anyone on the ANC team who wants to try what's already live:

| Feature | Where to Find It |
|---------|-----------------|
| Dashboard & Pipeline | Home page after login |
| Mirror Mode | New Project → Upload Excel |
| LED Estimator | New Estimate → Answer questions |
| AI Quick Estimate | Estimator → first question → "Describe your project" |
| Smart Bundler | Estimator toolbar → orange button |
| Budget Reverse | Estimator toolbar → teal button |
| Vendor RFQ | Estimator toolbar → cyan button |
| Risk Scanner | Estimator toolbar → rose button |
| Revision Radar | Estimator toolbar → amber button |
| Cut Sheets | Estimator toolbar → indigo button |
| Metric Mirror | Estimator → display dimensions (shows snap card) |
| PDF Page Triage | Sidebar → Tools → PDF Filter |
| Product Catalog | Sidebar → Admin → Product Catalog |
| Rate Card | Sidebar → Admin → Rate Card |
| AI Copilot (Lux) | Dashboard chat icon / Estimator toolbar |
| Share a Proposal | Open project → Step 4 → Share |
| Brief Me | Dashboard → sparkle icon on any project card |
| Document Mode Toggle | Project settings → Budget / Proposal / LOI |

---

*Prepared by Ahmad, Assisted.VIP — February 2026*
