# Phase 2 — RFP Intelligence Mode: Technical Specification

> Source: Analysis of Westfield World Trade Center RFP (Feb 2026)
> Purpose: Architecture reference for building the Exhibit G Auto-Filler, Schedule Generator, and Pricing-Form Linker.

---

## 1. Exhibit G — Technical Form Structure

### 1.1 Overview
- **7 forms** (1a through 1g), one per screen location
- All forms **identical in structure** (same questions, same order)
- Answers vary only by screen dimensions, power, and weight
- **90% of fields are constants** from the product type; only calculated values change

### 1.2 Form-to-Location Mapping
| Form | Location | Product Type |
|------|----------|-------------|
| 1a | Concourse | 4mm (Base) |
| 1b | 9A Underpass | 4mm (Base) |
| 1c | T4-B1 | 4mm (Base) |
| 1d | T4-B2 | 4mm (Base) |
| 1e | T4 Lobby Elevator | 10mm (Specialty) |
| 1f | PATH Hall | 4mm (Base) |
| 1g | T2-B1 | 4mm (Base) |

### 1.3 Fields Per Form
Every form asks for:
- **Physical Dimensions:** Overall Display Size (feet and pixels)
- **Hardware Specs:** OEM LED Module manufacturer, Processor manufacturer
- **LED Lamp Die:** Diode type (e.g., Nationstar RS2020)
- **Pixel Pitch:** Physical pitch (mm)
- **Power:** Average and Max power consumption (Watts)
- **Weight:** Entire Display Assembly Weight including internal structure (lbs)
- **Performance:** Brightness (nits), Color Temperature, Viewing Angles
- **Lifespan:** Expected operational hours

---

## 2. Product Catalog — Per-Panel Constants

### 2.1 Product Types
ANC uses **3 distinct product types** for this project:

| ID | Name | Pitch | Use Case | Forms |
|----|------|-------|----------|-------|
| A | 4mm Indoor (Nitxeon) | 4mm | Base Bid — Workhorse | 1a, 1b, 1c, 1d, 1f, 1g |
| B | 10mm Indoor (Nitxeon) | 10mm | Specialty — Elevator | 1e only |
| C | 2.5mm Indoor (Nationstar MIP) | 2.5mm | Alternate/Upsell (Alt 1) | Upgrade option |

### 2.2 Type C — 2.5mm Alternate (Confirmed Constants)

| Parameter | Standard Cabinet (2X4IM) | Small Cabinet (2X3IM) |
|-----------|-------------------------|----------------------|
| **Panel Size** | 480mm W × 960mm H | 480mm W × 720mm H |
| **Depth** | 91mm | 91mm |
| **Weight** | 11 kg (24.25 lbs) | 8.5 kg (18.7 lbs) |
| **Max Power** | 180 Watts | 135 Watts |
| **Avg Power** | ~60 Watts (33% of max) | ~45 Watts (33% of max) |
| **Brightness** | 2000 nits | 2000 nits |
| **Pixel Density** | 5806 PPF | 5806 PPF |
| **Diode** | Nationstar MIP | Nationstar MIP |
| **Processing** | Nova Star | Nova Star |
| **Lifespan** | 100,000 hrs | 100,000 hrs |

### 2.3 Type A — 4mm Base Bid (Confirmed from Exhibit G + Drawings)

**Standard Cabinet (Concourse reference):**

| Parameter | Value | Source |
|-----------|-------|--------|
| **Panel Size** | **960mm × 960mm** | Drawing: 240px × 240px × 4mm pitch |
| **Weight per panel** | **42 lbs** (incl. structure) | Concourse: 11,161 lbs / 267 panels |
| **Max Power per panel** | **450 Watts** | Concourse: 120,150W / 267 panels |
| **Avg Power per panel** | **180 Watts** (40% of max) | Concourse: 48,060W / 267 panels |
| **Brightness** | 2000 nits | Exhibit G forms |
| **Pixel Density** | 5,806 PPF | Exhibit G forms |
| **Color Temperature** | 6,500K – 6,700K (adjustable 3,200K – 9,300K) | Exhibit G forms |
| **Diode** | Nationstar RS2020 | Exhibit G forms |
| **Processing** | Nova Star | Exhibit G forms |
| **Hardware** | Nitxeon LED Module | Exhibit G forms |
| **Lifespan** | 100,000 hrs | Exhibit G forms |

**Critical Note — Custom Cabinets:**
Unlike the 2.5mm alternate (fixed 480×960mm cabinets), the 4mm base bid uses **custom-sized cabinets per location**:
- Concourse: 960mm × 960mm (standard)
- T4-B1: 880mm × 800mm (220px × 200px)
- Other locations: vary by wall dimensions

**Power Density Constant:** All 4mm cabinets share **~488 W/m² max power density**, confirming identical technology regardless of cabinet size. This means for custom cabinets:
```
max_power = (cabinet_width_m × cabinet_height_m) × 488
```

### 2.4 Type B — 10mm Specialty (Elevator)

| Parameter | Value | Source |
|-----------|-------|--------|
| **Brightness** | 1500 nits | Form 1e |
| **Other specs** | TBD — only one form uses this type | |

---

## 3. Calculation Engine

### 3.1 Per-Location Calculation
```
Input:
  - product_type: "4mm" | "10mm" | "2.5mm"
  - panels_wide: number
  - panels_high: number
  - cabinet_variant: "standard" | "small" (for 2.5mm only)
  - custom_cabinet_width_mm: number (optional, for 4mm custom sizes)
  - custom_cabinet_height_mm: number (optional, for 4mm custom sizes)

Derived:
  panel_count = panels_wide × panels_high
  cabinet_width_mm = custom_cabinet_width_mm || product.default_width_mm
  cabinet_height_mm = custom_cabinet_height_mm || product.default_height_mm

Output:
  // For 2.5mm/10mm (fixed cabinet sizes):
  total_max_power = panel_count × max_watts_per_panel
  total_avg_power = panel_count × avg_watts_per_panel
  screen_weight_lbs = panel_count × weight_per_panel_lbs

  // For 4mm (custom cabinets — use power density):
  cabinet_area_m2 = (cabinet_width_mm / 1000) × (cabinet_height_mm / 1000)
  total_max_power = panel_count × cabinet_area_m2 × 488  // W/m²
  total_avg_power = total_max_power × 0.40
  weight_per_panel = cabinet_area_m2 × 46.5  // ~46.5 lbs/m² derived from 42 lbs / 0.9216 m²
  screen_weight_lbs = panel_count × weight_per_panel

  // Common:
  assembly_weight_lbs = screen_weight_lbs × 1.10  (10% structural buffer)
  display_width_ft = panels_wide × cabinet_width_mm / 304.8
  display_height_ft = panels_high × cabinet_height_mm / 304.8
  display_width_px = panels_wide × (cabinet_width_mm / pitch_mm)
  display_height_px = panels_high × (cabinet_height_mm / pitch_mm)
```

### 3.2 Important Notes
- **Power:** Form asks for "Entire Display" power = wall draw of the screen only. Do NOT include rack/server/PDU power (those are separate pricing line items: $29k + $271k).
- **Weight:** Form asks for "Include internal structure" = add 10% buffer to raw panel weight.
- **Structure adder is ~6-15%** based on back-calculation from actual forms. **Use 10% as default.**

---

## 4. Pricing Structure

### 4.1 Sections (1:1 with Exhibit G Forms)
| Pricing Section | Location | Exhibit G Form |
|----------------|----------|---------------|
| 1 | Concourse LED | Form 1a |
| 2 | 9A Underpass | Form 1b |
| 3 | T4-B1 Screens | Form 1c |
| 4 | T4-B2 Screens | Form 1d |
| 5 | Elevator Screen | Form 1e |
| 6 | PATH Hall Screens | Form 1f |
| 7 | T2-B1 Screens | Form 1g |
| 8 | T3-B1 Screens | (no form — pricing only) |

### 4.2 Line Items Per Section
Each pricing section contains:
- **Structural Labor** (steel/mounting)
- **Electrical and Data** (power, conduit, fiber)
- **Project Management** (PM allocation)
- Hardware cost (LED panels)

### 4.3 Alternates
| Alt # | Description | Type |
|-------|------------|------|
| Alt 1 | Upgrade to 2.5mm GOB | Upgrade (positive $) |
| Alt 2 | Move to Smaller Display | Deduct (negative $) |
| Alt 4 | Add Hoist Materials | Add-on (positive $) |

### 4.4 Architecture Implication
**Adding a location should generate BOTH:**
1. A pricing section with standard line items
2. An Exhibit G technical form with calculated values

---

## 5. Schedule Architecture

### 5.1 Overview
- **59 total tasks** in the Westfield schedule
- **NTP (Notice to Proceed) date:** Mon 3/2/26
- All dates calculated forward from NTP
- **Location-grouped**, not trade-grouped

### 5.2 Pre-Installation Phases (Sequential)

| Phase | Duration | Dependency |
|-------|----------|-----------|
| Design & Engineering | Variable | Starts at NTP |
| Submittals | Variable | After Design |
| Owner Review & Approval | **5 days (hard gate)** | After Submittals |
| LED Manufacturing | **45 days** | After Owner Approval |
| Ocean Freight Shipping | **23 days** | After Manufacturing |
| Ground Shipping to Site | Variable | After Ocean Freight |

### 5.3 Installation Task Template (Per Location)

Each location gets a block of sub-tasks:

| # | Task | Duration | Parallel? | Notes |
|---|------|----------|-----------|-------|
| 1 | Mobilization | 1-2 days | No | Fixed |
| 2 | Demolition | 1-4 days | No | Size-dependent |
| 3 | Secondary Steel | 3 days | No | **Only for complex/hanging installs** (Elevator, PATH Hall) |
| 4 | LED Panel Install | 2-17 days | No | Size-dependent (see below) |
| 5 | Infrastructure Install | 3-9 days | **Yes — parallel with #4** | Starts 2 days after LED Install begins |
| 6 | Low Voltage Connectivity | 3-9 days | **Yes — parallel with #4** | Starts 2 days after LED Install begins |
| 7 | Finishes & Trim | 1-2 days | No | After all above complete |

### 5.4 LED Install Duration Sizing

| Screen Size | Panel Count | Install Duration |
|-------------|------------|-----------------|
| Small (< 10 panels) | e.g., T4-B1 | 2 days |
| Medium (Elevator) | ~15-20 panels | 5 days |
| Large (Concourse) | 100+ panels | 10-17 days (phased) |

### 5.5 Parallelism Rules
1. **Infrastructure + Low Voltage** start **2 days after** LED Install begins
2. **Infrastructure + Low Voltage** finish on the **same day** as LED Install (or +1 day)
3. **Multiple locations run in parallel** (Concourse Jun 1-23, 9A Underpass Jun 9-24)
4. **LED Install cannot start until Demolition is 100% complete**

### 5.6 Template Variations

| Variant | When | Difference |
|---------|------|-----------|
| **Standard Wall** | Simple mount (T4-B1, T4-B2) | No "Secondary Steel" task |
| **Complex/Hanging** | Elevator, PATH Hall | Adds 3-day "Secondary Steel" before LED Install |
| **Phased** | Large screens (Concourse) | Split: Demo Half 1 → Install Half 1 → Demo Half 2 → Install Half 2 |

### 5.7 Hard Constraints
1. Manufacturing must complete before ANY shipping begins
2. Owner Review is a fixed 5-day window — cannot be shortened
3. Ground Shipping must complete before installation begins at any location
4. Within a location: Demolition → LED Install (strict sequence)

---

## 6. Data Gaps

| Item | Status | Impact |
|------|--------|--------|
| 4mm panel physical size | ✅ **Confirmed:** 960×960mm standard, custom per location | Resolved — use power density (488 W/m²) for custom sizes |
| 4mm weight per panel | ✅ **Confirmed:** 42 lbs (standard 960mm), ~46.5 lbs/m² density | Resolved |
| 4mm max watts per panel | ✅ **Confirmed:** 450W (standard 960mm), 488 W/m² density | Resolved |
| 4mm avg/max power ratio | ✅ **Confirmed:** 40% (vs 33% for 2.5mm MIP) | Resolved |
| 10mm panel specs (all fields) | ⏳ **Pending** — only brightness (1500 nits) known | Low priority — only 1 form (elevator) |
| System overhead multiplier | ✅ **Resolved:** No hidden multiplier — discrepancy was 4mm vs 2.5mm product mix | Resolved |
| Structural weight buffer | ✅ **Confirmed:** ~10% adder | Resolved |

### Key Insight: Power Density as Universal Constant
The 4mm product uses **custom cabinet sizes per location**, but all share the same power density (~488 W/m²) and weight density (~46.5 lbs/m²). This means the calculation engine can handle ANY cabinet size without needing per-size lookup tables — just multiply area × density constant.

---

## 7. Build Order (Recommended)

### Phase 2A — Product Catalog + Exhibit G Filler
1. Create product catalog schema (3 types, per-panel constants)
2. Build calculation engine (panel count → power/weight/dimensions)
3. Build Exhibit G form generator (select product + enter panel grid → auto-fill all fields)
4. Wire into RFP Ingestion flow: extract locations from RFP → pre-populate forms

### Phase 2B — Schedule Generator
1. Build task template engine (7 sub-tasks per location)
2. Implement dependency graph (sequential pre-install → parallel location blocks)
3. Build date calculator (NTP date → forward-calculate all 59 tasks)
4. Handle template variations (standard/complex/phased)

### Phase 2C — Pricing-Form Linker
1. Adding a location generates both pricing section + Exhibit G form
2. Alternates linked to base sections
3. 1:1 mapping enforced in the data model
