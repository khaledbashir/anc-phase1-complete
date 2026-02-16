# ANC Proposal Engine — Project Status & Capabilities

**Prepared for:** Natalia Kovaleva, Jared, ANC Leadership
**Prepared by:** Ahmad, Assisted.VIP
**Date:** February 2026

---

## Overview

This document provides a clear picture of where the project stands today:

1. **Phase 1 deliverables** — current status of what was agreed upon
2. **Additional capabilities** — working demos built to showcase what the platform can do, ready to be finalized upon approval
3. **Phase 2 scope** — the RFP module and other capabilities requested for the next phase

---

# Phase 1: Agreed Deliverables

The original scope covered two core tools for the ANC team.

---

### A. Mirror Mode

**What it solves:** Eliminates the manual process of retyping Excel numbers into design software for client-facing proposals. The system reads the estimator's Excel file — every line item, section header, subtotal, and grand total — and generates a branded ANC proposal PDF. It performs zero math and zero rounding. The numbers in the PDF are identical to the numbers in the Excel. Professional ANC branding (Work Sans typeface, blue slash graphics, strict margins) is applied automatically on every page.

**Current status:** Built and delivered. Pending Natalia's review and final approval on template styling.

---

### B. LED Budget Estimator

**What it solves:** Allows anyone on the team — regardless of experience level — to produce a rough budget estimate without tying up senior estimators. The tool walks the user through a straightforward, step-by-step question flow: indoor or outdoor, display size, pixel pitch, structure type, electrical, permits, shipping. Each question presents pre-built options (buttons and dropdowns, not free-form text). All pricing formulas are built into the engine — the user never enters dollar amounts. At the end, the system produces a calculated budget Excel.

The tool is designed to be used by the least technical person on the team. It is not a chat or a conversation — it is a guided, linear questionnaire with one question at a time.

**Current status:** Built and ready for the team to review. This was just completed and has not yet been presented.

---

# Additional Capabilities — Working Demos

During the course of building Phase 1, the team shared a number of pain points and workflow challenges across estimating, proposals, RFP processing, and deal management. Based on those conversations, we built working demos of additional capabilities to show what the platform can support.

**These are functional prototypes.** They are live on the platform and can be tested today. Upon approval, each capability gets wired into the production workflow and polished for day-to-day use by the team.

---

### For Proposals (Natalia's Workflow)

| # | Capability | What It Does |
|---|-----------|-------------|
| 1 | **Three-Mode Document Toggle** | One switch reformats the entire proposal between Budget (soft language, no signatures), Proposal (formal sales quotation), and LOI (full legal wrapper with payment terms, liability clauses, and signature blocks). Eliminates the need to manually edit headers, footers, and legal text when a deal moves between stages. |
| 2 | **Non-Standard Excel Importer** | Handles the ~10% of pricing Excels that come in with unusual layouts, merged cells, or non-standard columns. The system asks the user to map the columns once, saves that layout profile, and auto-recognizes it on every future upload. One-time setup per format. |
| 3 | **Client Share Links** | Generates a unique, secure link for any proposal. Clients view it in a clean browser experience — no login, no PDF attachment. Internal costs and margins are stripped automatically. Links are version-locked, expire after 30 days, and can be password-protected. |
| 4 | **E-Signature (DocuSign)** | Enables electronic signing on LOI documents with a full audit trail — who signed, when, from which device. |
| 5 | **AI Verification Guardrail** | If any field in a proposal was filled by AI and has not been verified by a human, the system prevents sharing. No unverified data reaches the client. |

### For Estimating (Matt's Workflow)

| # | Capability | What It Does |
|---|-----------|-------------|
| 6 | **Smart Assembly Bundler** | Automatically suggests the accessories and hidden line items that go with each display type. Select "Scoreboard" and it recommends: video processor, receiving cards, spare modules, fiber converter, mounting brackets, cable kits. Select "Wall Mount" and it adds vertical steel and plywood backing. Each item can be toggled on or off. Prevents the $5K–$30K in forgotten line items that slip through mental math. |
| 7 | **AI Quick Estimate** | Describe a project in plain English — the AI extracts client name, venue, display types, dimensions, pixel pitches, environment, labor requirements — and fills the entire questionnaire automatically. Useful when someone sends a quick text like "I need three screens for the Dodgers" and you need a number fast. |
| 8 | **Vendor RFQ Generator** | Takes the configured project specs and produces a formatted Request for Quotation with a unique RFQ number, ready to send to LG, Yaham, or any manufacturer. No more retyping specs into emails. |
| 9 | **Budget Reverse Engineer** | Enter a client's budget (e.g., $500K) and the system searches the product catalog to show which LED products and configurations fit within that number, ranked by best fit. |
| 10 | **Metric Mirror** | Converts between imperial and metric in real time, accounting for the fact that LED cabinets cannot be cut. Shows the actual build dimension after snapping to the nearest whole cabinet count, with a color-coded indicator showing how far off the target the real size is. |
| 11 | **Cost Category Breakdown (3A–3G)** | In detailed mode, produces a per-display breakdown across all seven ANC cost categories: Structural Materials, Labor & LED Install, Electrical & Data, Lighting Cove, PM/GC/Travel, Engineering & Permits, Equipment & Logistics. |
| 12 | **AI Copilot (Lux)** | A command-driven assistant inside the Estimator. Accepts instructions like "Set margin to 38%", "Add a 20x10 ribbon board", "What's the total?" and updates the estimate in real time. Also available on the Dashboard for pipeline questions and project lookups. |

### For RFPs (Jeremy's Workflow)

| # | Capability | What It Does |
|---|-----------|-------------|
| 13 | **PDF Page Triage** | Upload a large construction PDF. The system scores every page for relevance to LED and AV scope, separates signal from noise, and lets you drag pages between Keep and Discard. Export a filtered PDF containing only the pages that matter. |
| 14 | **Contract Risk Scanner** | Scans contract or SOW text against a 20-point checklist of financial and legal risk items: liquidated damages, performance bonds, union requirements, prevailing wage, insurance, warranty terms, payment timelines. Each item is flagged as pass, warning, or critical. |
| 15 | **Revision Radar** | Upload an original and a revised Excel. The system compares them section by section: changed rows highlighted, price increases in red, decreases in green, grand total delta at the top. No more re-reading entire addendums to find what changed. |
| 16 | **Cut-Sheet Generator** | Produces per-display spec sheets with dimensions, resolution, power, weight, and auto-generated installation notes based on environment and mount type. |

### Platform & Administration

| # | Capability | What It Does |
|---|-----------|-------------|
| 17 | **Projects Dashboard** | Central pipeline view with total deal value, project counts by mode, status tracking (Draft → Approved → Signed), search, and KPI metrics. |
| 18 | **Project Intelligence (Brief Me)** | One-click AI briefing on any project — reads the project data, researches the client, and delivers a summary with key insights and a bottom-line recommendation. |
| 19 | **Product Catalog** | Centralized LED product database — manufacturer, model, pixel pitch, cabinet dimensions, weight, power, brightness, cost per sqft. Feeds into the Estimator, Reverse Engineer, and RFQ Generator. |
| 20 | **Rate Card** | All pricing constants managed in one place — LED cost by pitch, labor rates, PM fees, default margins, bond and insurance rates. Update a rate once, and every new estimate uses it. |
| 21 | **Gap Fill Assistant** | After AI extracts data from an uploaded document, walks through missing or uncertain fields one at a time, asking targeted questions until the proposal is complete. |
| 22 | **Document OCR** | Built-in text extraction for scanned PDFs, DOCX, and 75+ document formats. Even image-only PDFs are processed. |

### Underlying Infrastructure

The capabilities above run on top of a production-grade foundation that isn't visible to end users but is required for any application handling real client data and financial information:

- **Authentication & session management** — secure login, session tokens, and automatic expiry
- **Role-based access control** — permissions that determine who can view, edit, approve, or share proposals and pricing data
- **API security layer** — every endpoint is authenticated; internal pricing, margins, and cost data are never exposed to unauthenticated requests
- **Database architecture** — structured storage for projects, versions, pricing documents, product catalog, rate cards, and audit history
- **Environment isolation** — separate development and production environments so changes are tested before they reach the team
- **Modern dialog system** — all user-facing confirmations and alerts use a consistent, branded UI rather than raw browser popups

This is the kind of work that doesn't appear in a feature list but represents a significant portion of the engineering effort. Without it, the features above would be demos on a laptop — not a platform a team can log into and trust with real deal data.

---

### Summary

| | Count |
|--|-------|
| **Phase 1 agreed deliverables** | 2 |
| **Additional working demos** | 22 |
| **Total capabilities on the platform today** | 24 |

---

# Phase 2: Requested Scope

Based on our recent conversations, Phase 2 focuses on the **RFP processing module** and the **internal audit Excel**.

### Requested Capabilities

| # | Capability | Description |
|---|-----------|-------------|
| A | **RFP Intelligence Engine** | Upload a full RFP — hundreds or thousands of pages. The system reads it, identifies every LED display mentioned, and produces an Excel listing each screen with its name, specified size, pixel pitch, location, and any other extracted specs. |
| B | **Key Point Extraction** | Beyond screens — extract schedule milestones, liquidated damages, bond requirements, union/prevailing wage, insurance minimums, warranty terms, and any other commercially significant items. Delivered as a structured summary. |
| C | **Product Matching** | For each extracted screen, suggest matching products from ANC's catalog — closest sizes from each manufacturer, with pixel pitch options and pricing. |
| D | **Internal Audit Excel** | A detailed internal Excel that shows the full math behind every number — costs, margins, formulas, rate card values applied. Designed for finance to verify margin accuracy. Format to be discussed with Jared. |
| E | **Drawing Analysis** | AI vision that scans architectural and AV drawing pages, identifies display locations, reads schedule-of-displays tables directly from drawings, and feeds them into the extraction pipeline. |

### Suggested Additional Capabilities

Based on the workflows we've observed and what the platform's architecture already supports, these would be natural additions to Phase 2:

| # | Capability | Why It Matters |
|---|-----------|---------------|
| F | **RFP-to-Estimate Pipeline** | After extracting screens from an RFP, push them directly into the Estimator with all specs pre-filled. Jeremy extracts, Matt prices — seamless handoff, no re-entry. |
| G | **Scope of Work Generator** | Based on RFP requirements and configured displays, auto-generate a scope of work document using ANC's standard language, tailored to the specific project. |
| H | **Compliance Checklist** | Cross-reference RFP requirements against the proposed solution. Flag anything the RFP asks for that isn't addressed — before the client finds it. |
| I | **Multi-Version Tracking** | As addendums arrive, upload each version. The system tracks what changed across all versions and maintains a running delta log. |
| J | **Event-Day Labor Calculator** | For venues requiring on-site technicians during events, calculates: (Events × Hours × Rate) + (Technicians × Per Diem). Catches variable labor costs that flat-rate estimates miss. |
| K | **Bid/No-Bid Scorecard** | Before investing time in an RFP response, score the opportunity on margin potential, competition level, relationship strength, and compliance difficulty. Quick go/no-go decision support. |

---

# Next Steps

### From ANC

1. **Jared's green light** on Phase 2 scope
2. **Call with Jared** to align on the audit Excel format
3. **Estimating team input** — the question tree and pricing logic from Matt and Jeremy. Raw notes or a brain dump is fine — we will structure it.
4. **Product data from Eric** — LED product specs and pricing for the catalog
5. **2–3 sample RFPs** to test extraction accuracy (the bigger and messier, the better)

### From Assisted.VIP

1. **Phase 2 proposal with pricing** based on the confirmed scope above
2. **Delivery timeline** with milestones for each capability
3. **Live demo** of existing RFP-adjacent capabilities (PDF Triage, Risk Scanner, Drawing Analysis) — available anytime

---

# Appendix: Where to Find Everything

For anyone on the team who wants to explore what's on the platform today:

| Capability | Where to Find It |
|-----------|-----------------|
| Dashboard & Pipeline | Home page after login |
| Mirror Mode | New Project → Upload Excel |
| LED Estimator | New Estimate → Answer questions |
| AI Quick Estimate | Estimator → first question → "Describe your project" |
| Smart Bundler | Estimator toolbar → Bundle button |
| Budget Reverse | Estimator toolbar → Budget button |
| Vendor RFQ | Estimator toolbar → RFQ button |
| Risk Scanner | Estimator toolbar → Risk button |
| Revision Radar | Estimator toolbar → Delta button |
| Cut Sheets | Estimator toolbar → Cuts button |
| Metric Mirror | Estimator → display dimensions (snap card appears) |
| PDF Page Triage | Sidebar → Tools → PDF Filter |
| Product Catalog | Sidebar → Admin → Product Catalog |
| Rate Card | Sidebar → Admin → Rate Card |
| AI Copilot (Lux) | Dashboard chat icon / Estimator toolbar |
| Share a Proposal | Open project → Step 4 → Share |
| Brief Me | Dashboard → sparkle icon on any project card |
| Document Mode | Project settings → Budget / Proposal / LOI toggle |

---

*Prepared by Ahmad, Assisted.VIP — February 2026*
