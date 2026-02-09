# Intelligence Mode Skill

## Overview
Intelligence Mode is the ANC Proposal Engine's built-in pricing engine for creating proposals without an Excel upload. Users configure screens, set margins, and the system calculates full financial breakdowns using the Natalia Divisor Model.

## Core Formula
```
Sell Price = Total Cost / (1 - Margin%)
Bond = Sell Price × 1.5%
B&O Tax = (Sell Price + Bond) × 2% [WV only]
Sales Tax = (Sell Price + Bond + B&O) × 9.5%
Final Client Total = Sell Price + Bond + B&O + Sales Tax
```

## Key Files

### Math Engine
- **`lib/estimator.ts`** — Core calculation engine with `calculatePerScreenAudit()` and `calculateProposalAudit()`
- **`services/pricing/intelligenceMathEngine.ts`** — Clean wrapper with presets, validation, and `calculateIntelligencePricing()`
- **`lib/math.ts`** — Utility functions including `calculateSellPrice()`

### UI Components
- **`Step3Math.tsx`** — Global Strategic Controls (margin slider, presets, bond/tax/B&O inputs, audit table)
- **`Step2Intelligence.tsx`** — Screen configuration, document mode, column headers, master table selector
- **`SingleScreen.tsx`** — Per-screen configuration (dimensions, pitch, margin, cost, alternate toggle)
- **`AuditTable.tsx`** — Real-time P&L verification table

### SOW System
- **`services/sow/sowGenerator.ts`** — AI-powered SOW generation with fixed legal templates + conditional clauses
- **`services/sow/sowTemplates.ts`** — 8 toggleable SOW sections for Exhibit B

## Margin Presets
| Preset | Margin | Use Case |
|--------|--------|----------|
| Aggressive | 15% | Competitive bid, volume play |
| Standard | 25% | Default ANC margin |
| Premium | 35% | High-value, sole-source |
| Strategic | 40% | Premium with full services |

## Cost Line Items (per screen)
Hardware, Structure (10-20%), Install ($5K flat), Labor (15%), Power (15%), Shipping ($0.14/sqft), PM ($0.50/sqft), General Conditions (2%), Travel (3%), Submittals (1%), Engineering (2%), Permits ($500), CMS (2%), Demolition ($5K if replacement).

## Workflow
1. **Step 1** — Import Excel (Mirror Mode) OR start manually (Intelligence Mode)
2. **Step 2** — Configure screens, set document mode (Budget/Proposal/LOI)
3. **Step 3** — Set global margin, bond rate, tax rate, review audit table, build quote items
4. **Step 4** — Export PDF, share link, download bundle

## Sales Quotation Items
- Built in Step3Math with drag-to-reorder (dnd-kit)
- Auto-fill from screen audit data
- "From Catalog" pulls products from `/api/products`
- Items drive the pricing table in ProposalTemplate5

## Key Patterns
- All financial math uses Decimal.js for precision
- Margin is stored as decimal (0.25 = 25%)
- Bond rate default: 1.5%
- Sales tax default: 9.5%
- B&O tax: 2% auto-detected for Morgantown/WVU addresses
- `internalAudit` is recalculated on every screen/margin change
- Mirror Mode skips Step3Math entirely (Excel pass-through)
