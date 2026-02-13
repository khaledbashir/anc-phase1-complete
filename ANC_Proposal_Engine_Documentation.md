# ANC Proposal Engine — Workflow Intelligence
*Complete business process mapping and automation roadmap*
*Prepared February 2026*

---

## 📋 Overview
This document outlines the end-to-end process of how a project moves through ANC — from the moment an opportunity arrives to the moment a signed contract triggers deployment. It details the current workflow, the capabilities of the Proposal Engine (both current and planned), and the market intelligence driving these strategies.

---

## 📋 How It Works Today (Workflow)
The following steps detail the current manual process and identify key bottlenecks in the proposal lifecycle.

### 1. OPPORTUNITY: Project Comes In
*   **Who:** Sales / Proposals Team
*   **Timeline:** Day 0
*   **Pain Level:** 1/5
*   **Workflow Paths:**
    *   **RFP Response:** A massive RFP document arrives (e.g., via Building Connected). Division 11 — LED Display Systems is often buried in hundreds of pages.
    *   **Direct Request:** Client brief received via call/email (venue name, requirements, budget, timeline).
    *   **Repeat Project:** Adjusting old Excel sheets for returning clients.

### 2. EXTRACTION: Find What Matters
*   **Who:** Estimating Team
*   **Timeline:** Day 1–3
*   **Pain Level:** 5/5 (BIGGEST BOTTLENECK)
*   **Workflow Paths:**
    *   **Locate Relevant Sections:** Manually scrolling RFPs for Section 11-63-10, architectural/AV drawings, and display schedules.
    *   **Extract Screen List:** Reading drawings and typing name, dimensions, location, and quantity into a blank Excel.
    *   **Flag Business Terms:** Identifying liquidated damages, union/bond requirements, deadlines, and warranty terms.

### 3. ESTIMATION: Build the Numbers
*   **Who:** Senior Estimators
*   **Timeline:** Day 3–8
*   **Pain Level:** 3/5
*   **Workflow Paths:**
    *   **Product Selection:** Matching displays to LG or Yaham products. Finding modules slightly smaller than requested and getting current pricing.
    *   **Price Every Service:** Calculating structural materials, labor, LED install, electrical, PM, travel, permits, and warranty.
    *   **Apply Margins:** Applying margins (LED: 15-38%, Services: 20%) using the formula: `Selling Price = Cost ÷ (1 − Margin%)`.

### 4. PROPOSAL: Create Client Document
*   **Who:** Proposals Director
*   **Timeline:** Day 8–10
*   **Pain Level:** 2/5
*   **Workflow Paths:**
    *   **Upload to Proposal Engine:** Uploading Excel → system parses Margin Analysis sheet automatically.
    *   **Configure Output:** Selecting document type (Budget / Proposal / LOI) and toggling sections (specs, pricing, etc.).
    *   **Export & Deliver:** Previewing branded PDF, verifying numbers, and sending to the client.

### 5. DEPLOYMENT: Build It
*   **Who:** Engineering & Installation Team
*   **Timeline:** Post-Signature
*   **Pain Level:** 0/5
*   **Workflow Paths:**
    *   **Order & Manufacture:** 45-day manufacturing lead time for LED; structural steel fabrication runs in parallel.
    *   **Ship & Install:** ~6 weeks ocean freight followed by ground shipping and sequenced installation.
    *   **Commission & Train:** Testing, control room setup, staff training, and final punch list.

---

## ⚡ Engine Capabilities

### 🟢 Mirror Mode (LIVE — IN PRODUCTION)
*   **Usage:** 75% of all engine usage
*   **Primary User:** Proposals Director
*   **Description:** Upload a completed Excel workbook. The engine reads the Margin Analysis sheet exactly as-is to produce a branded PDF. This is a formatting engine that treats estimator numbers as sacred.

**Key Capabilities:**
*   **Excel-to-PDF Conversion:** Automatic parsing of sections, line items, subtotals, tax, and bond.
*   **Three Document Types:** Budget Estimate, Proposal, and Letter of Intent (LOI).
*   **Exhibit A (Technical Specs):** Automatically parsed display specs (dimensions, pitch, resolution).
*   **Exhibit B (Statement of Work):** Responsibility matrix for ANC vs. Purchaser.
*   **Smart Configuration:** Toggle sections, edit headers, add custom intro text, and fix typos.
*   **Alternates Pricing:** Handles upgrade/downgrade line items in separate sections.
*   **AI Address Lookup:** Automatically finds venue addresses via AI search.
*   **ANC Branding:** Enforces corporate standards (Work Sans font, French Blue, standardized footers).
*   **Signature System:** Dual signature blocks with editable legal text for LOIs.
*   **Multi-Currency:** Auto-detects and formats for CAD/USD.

### 🔵 Intelligence Mode (SCOPED — BUILDING)
*   **Usage:** 25% of projected usage
*   **Primary User:** Senior Estimators
*   **Description:** AI-powered proposal generation. Users answer structured questions to generate a preliminary budget using confirmed formulas.

**Key Capabilities:**
*   **Guided Question Flow:** Step-by-step interface for non-experts.
*   **Product Catalog Matching:** Recommends best-fit modules (LG/Yaham) based on requirements.
*   **Formula-Based Estimation:** Automated calculation of structural, electrical, and labor costs.
*   **Margin Application:** Automatic application of 15-38% margins.
*   **Excel Output:** Generates the standard ANC Cost Analysis Excel format.
*   **Alternate Generation:** Auto-calculates pricing for different pixel pitches (e.g., 2.5mm vs 1.88mm).

### 📊 Executive & Operations Features
*   **Executive Dashboard:** Pipeline visibility and project status tracking.
*   **Project History:** Logs of all uploads, exports, and config changes with timestamps.

---

## 🚀 Phase II — What's Next
*Strategic initiatives to further automate the workflow.*

*   **RFP Smart Filter (High Priority):** Uploading full RFPs and having AI classify sections and surface only actionable pages. Saves 8–16 hours per project.
*   **Screen List Extraction (High Priority):** AI reads specs/schedules to build the screen list automatically. Saves 2–4 hours per project.
*   **Product Auto-Matching (High Priority):** Direct integration with LG/Yaham catalogs for instant matching. Saves 1–2 hours per project.
*   **AI Budget Generator (High Priority):** Enabling any team member to generate a ROM budget without senior estimator involvement.
*   **Key Terms Extraction (Medium Priority):** Automatically flagging risk items like liquidated damages or union requirements.
*   **Audit Excel Format (Medium Priority):** Generating internal audit sheets for Finance to verify cost derivations.
*   **Intelligence Panel — "Brief Me" (Medium Priority):** Slide-out panel providing AI-generated context on clients and venues.

---

## 🔬 Market Intelligence

### 💰 Pricing Matrix (Estimated per Area)
| Category | Cost / m² | Cost / sqft | Context |
| :--- | :--- | :--- | :--- |
| **Micro LED (P0.9–P1.25)** | $1,929 – $3,800+ | $179 – $353+ | Broadcast, premium suites. COB packaging. |
| **Fine Pitch (P1.5)** | $1,400 – $1,929 | $130 – $179 | Conference rooms, luxury suites. |
| **Fine Pitch (P2.5)** | $1,250 – $1,929 | $116 – $179 | Corporate concourse, premium retail. |
| **Indoor Standard (P2.5–P4)** | $450 – $900 | $42 – $84 | Wayfinding, general concourse. |
| **Outdoor (P6–P8)** | $480 – $1,800 | $45 – $167 | Stadium video boards, fascia. |
| **Outdoor (P10–P16)** | $380 – $950 | $35 – $88 | Highway DOOH, building facades. |
| **Curved / Flexible LED** | $3,800 avg | $353 avg | Stadium pillars, curved walls. |

### ⚠️ Hidden Costs & Upgrades
*   **IP68 Waterproofing:** +$28/sqft
*   **Thermal Management (5000+ nits):** +$41/sqft
*   **Hurricane-Rated Anchors:** +$19/sqft
*   **EMI Shielding (FCC Part 15):** +$12/sqft
*   **Mil-Spec Connectors:** +$4.70/sqft
*   **Installation Labor:** 15–30% of hardware cost

### 📺 LCD Pricing
| Size | Wholesale | Street Price | Note |
| :--- | :--- | :--- | :--- |
| **55"** | $338–$388 | $914–$1,260 | Workhorse concourse display. |
| **65"** | N/S | $1,100–$1,800 | Suite and office standard. |
| **75"** | N/S | $1,800–$2,800 | Premium suite display. |
| **86"** | N/S | $2,500–$4,000 | Large format/meeting rooms. |
| **98"** | $3,707–$5,329 | $5,450–$6,350 | Ultra-large; bulk discounts available. |

---

## 🏟️ Venue Product Mapping
*Recommended products by installation zone.*

*   **Control Room / Broadcast:** LG MAGNIT LSAB or Lighthouse Supreme. (Extreme resolution needed).
*   **VIP Suites:** LG 55"-75" LCD or LG LAEC 136" AIO. (Cost-effective 4K).
*   **Arena Concourse:** LG LAS P2.52 / Yaham P2.6 / LG 86"-98" LCD. (High traffic balance).
*   **Ribbon Boards:** Lighthouse Velocity (Outdoor) or Infinity (Indoor).
*   **Center-Hung Scoreboard:** Lighthouse Velocity VII or LG MAGNIT. (Lightweight for rigging).
*   **Exterior / Spectacular:** Yaham S-Series P16 or Lighthouse Impact. (Max brightness).
*   **Building Facade:** Yaham CP YCRYSTAL. (40% transparency).
*   **Portable / Event:** ANC VERSA. (Free-standing, foldable).

---

## ⏱ Project Timeline
*   **Phase I: Mirror Mode (Jan 8 – Feb 13):** **COMPLETE**. Excel-to-PDF, Branding, Dashboard, AI Lookup.
*   **Phase II: RFP Intelligence (Feb 2026 – TBD):** **SCOPING**. Smart filters, Auto-matching, Budget generator.
*   **Phase III: Full Automation (TBD):** **FUTURE**. Salesforce integration, Subcontractor portal, Multi-user.

---

## 📊 Business Impact
| Metric | Before | After | Savings |
| :--- | :--- | :--- | :--- |
| **Proposal Creation** | 4–8 hours | 15 minutes | **90%+** |
| **RFP Reading** | 8–16 hours | 30 minutes | **95%+** (Phase II) |
| **Budget Generation** | 2–4 hours | 15 minutes | **85%+** (Phase II) |
| **Revision Cycles** | Days | Minutes | **95%+** |
| **Knowledge Risk** | 2 people | System-wide | **De-risked** |

---

## 🏢 Competitive Landscape
*   **Daktronics:** Market leader ($818M revenue). Onshore manufacturing moat.
*   **ANC Sports:** Integration + Software + Content. Moat: LiveSync, Texas repair facility, ANC Studios.
*   **Samsung:** Consumer brand leverage. Dominant in suites (Micro LED/LCD).

> **Key Insight:** Hardware is commoditizing. ANC's sustainable advantage is LiveSync (software lock-in), ANC Studios (recurring content revenue), and their service moat. The Proposal Engine automates the sales process to capture these high-value venues.
