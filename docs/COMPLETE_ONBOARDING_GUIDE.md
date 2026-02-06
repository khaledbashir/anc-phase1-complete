# ANC Studio - Complete Developer Onboarding Guide

**Version:** 3.0 (Ultimate Edition)  
**Last Updated:** 2026-01-31  
**Project Status:** Production-Ready  
**Target Audience:** New Developers Joining the Team

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Business Context & Domain](#business-context--domain)
3. [Technology Stack](#technology-stack)
4. [Critical Business Rules](#critical-business-rules)
5. [Project Architecture](#project-architecture)
6. [Getting Started](#getting-started)
7. [Key Files & Components](#key-files--components)
8. [Database Schema](#database-schema)
9. [API Routes](#api-routes)
10. [Testing Guide](#testing-guide)
11. [Common Issues & Solutions](#common-issues--solutions)
12. [Deployment](#deployment)
13. [Security Best Practices](#security-best-practices)
14. [Performance Optimization](#performance-optimization)
15. [Development Workflow](#development-workflow)
16. [Quick Start for New Developers](#quick-start-for-new-developers)
17. [Emergency Procedures](#emergency-procedures)
18. [Resources & Contacts](#resources--contacts)

---

## EXECUTIVE SUMMARY

### What is ANC Studio?

**ANC Studio** is a next-generation proposal generation system for ANC Sports Enterprises, LLC. It automates the creation of LED display proposals for sports venues (stadiums, arenas, entertainment venues) with AI-powered RFP extraction, intelligent pricing calculations, and high-fidelity PDF generation.

### The Problem It Solves

1. **Manual Data Entry Errors** - Eliminates errors from 2,500-page RFP documents
2. **Financial Misalignment** - Ensures math accuracy between Excel calculations and client PDFs
3. **Unprofessional Proposals** - Generates Ferrari-grade client proposals matching 2025 ANC Identity Guidelines
4. **Lost Bid History** - Provides centralized vault for all past proposals
5. **Slow Turnaround** - Reduces proposal generation from weeks to sub-1-hour

### Core Value Proposition

- **75% Mirror Mode:** Bypass AI calculations by importing pre-calculated Excel spreadsheets
- **25% Intelligence Mode:** AI-driven extraction from 2,500-page RFP documents
- **100% Data Security:** Client-facing exports never reveal internal costs or margins
- **Ferrari-Level Output:** High-fidelity PDF proposals that match manual quotes

---

## BUSINESS CONTEXT & DOMAIN

### Client Information

- **Company:** ANC Sports Enterprises, LLC
- **Location:** Purchase, NY (2 Manhattanville Road, Suite 402)
- **Industry:** LED Display Systems for Sports Venues
- **Website:** www.anc.com

### Primary Users

| Role | Description | Primary Workflows |
|------|-------------|-------------------|
| **Admin** | System owner/director (e.g., Natalia) | Branding enforcement, math logic approval, global settings |
| **Estimator** | Technical lead (e.g., Jeremy) | Upload RFPs/Excels, run RAG extraction, Mirror Mode |
| **Product Expert** | Catalog manager (e.g., Eric) | Update manufacturer catalogs (LG, Yaham), product suggestibility |
| **Proposal Lead** | Day-to-day drafter | Gap filling, drafting table edits, client-facing document generation |
| **Finance** | Audit reviewer | Review Internal Audit Excel, verify margin logic |
| **Outsider** | Subcontractor/Installer | Restricted technical field access, no totals/margins |
| **Viewer** | (Client) | Anonymous public access to Share Link, download PDF, digital signature |

### Key Clients

- **Jacksonville Jaguars** - NFL stadium LED displays
- **West Virginia University (WVU)** - University sports venue displays
- **Various sports venues** - Stadiums, arenas, entertainment venues

### Domain Knowledge Required

1. **LED Display Technology**
   - Pixel pitch (mm) - distance between pixels
   - Brightness (formerly "nits") - display luminance
   - Resolution (H × W) - pixel dimensions
   - Screen dimensions (ft) - physical size

2. **Construction & Installation**
   - Structural steel tonnage - weight of steel framework
   - Installation costs - labor for mounting
   - Electrical requirements - power consumption

3. **Financial Modeling**
   - Divisor margin model (NOT markup)
   - Performance bonds (1.5% default)
   - Sales tax (9.5% default)
   - B&O tax (2% for Morgantown, WV projects)

---

## TECHNOLOGY STACK

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework with App Router | 15.3.3 |
| **TypeScript** | Type-safe JavaScript | 5.2.2 |
| **React** | UI library | 18.2.0 |
| **Tailwind CSS** | Utility-first CSS framework | 3.3.5 |
| **Shadcn UI** | Pre-built UI components (Radix primitives) | Latest |
| **React Hook Form** | Form management | 7.46.1 |
| **Zod** | Schema validation | 3.22.2 |
| **Framer Motion** | Animations | 12.29.0 |
| **Lucide React** | Icon library | 0.279.0 |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js API Routes** | Serverless API endpoints | Built-in |
| **Prisma** | Database ORM | 5.22.0 |
| **PostgreSQL** | Primary database | 14+ |
| **AnythingLLM** | AI/RAG engine | Latest |
| **Puppeteer** | PDF generation | 24.9.0 |
| **Nodemailer** | Email sending | 6.9.7 |

### File Processing

| Technology | Purpose | Version |
|------------|---------|---------|
| **XLSX** | Excel parsing | 0.18.5 |
| **PDF.js** | PDF parsing | 2.4.5 |
| **XML2JS** | XML conversion | 0.6.2 |
| **JSON2CSV** | CSV export | 7.0.3 |
| **ExcelJS** | Excel generation | 4.4.0 |

### Infrastructure

| Technology | Purpose | Notes |
|------------|---------|-------|
| **Docker** | Containerization | Multi-stage builds |
| **Easypanel** | Container orchestration | VPS management |
| **Traefik** | Reverse proxy/load balancer | SSL termination |
| **PM2** | Process manager | Production deployments |

---

## CRITICAL BUSINESS RULES

### ⚠️ RULE #1: Natalia Math (Divisor Margin Model)

**THIS IS THE MOST IMPORTANT RULE IN THE ENTIRE SYSTEM.**

The system uses **Divisor Margin**, NOT markup. This is non-negotiable.

#### The Formula

```
WRONG (Markup):  Price = Cost × (1 + Margin)
CORRECT (Divisor): Price = Cost / (1 - Margin)
```

#### Example

```
Cost: $10,000
Margin: 25%

Markup (WRONG):   $10,000 × 1.25 = $12,500
Divisor (CORRECT): $10,000 / 0.75 = $13,333.33
```

**Why This Matters:**
- Markup calculates margin on cost (incorrect)
- Divisor calculates margin on final selling price (correct)
- This ensures the margin percentage is accurate to the final price

#### Complete Calculation Sequence

1. **Total Cost** = Sum of all line items (hardware, structure, install, labor, power, etc.)
2. **Sell Price** = Total Cost / (1 - Margin)
3. **Bond** = Sell Price × 1.5%
4. **B&O Tax** = (Sell Price + Bond) × 2% (only for Morgantown, WV)
5. **Sales Tax** = (Sell Price + Bond + B&O) × 9.5%
6. **Final Total** = Sell Price + Bond + B&O + Sales Tax

#### Implementation

**File:** [`lib/estimator.ts:428`](invoify/lib/estimator.ts:428)

```typescript
// REQ-110: Margin Validation - Prevent division by zero
if (desiredMargin >= 1.0) {
    throw new Error(`Invalid margin: ${desiredMargin * 100}%. Margin must be less than 100% for Divisor Margin model.`);
}

// Natalia Math Divisor Model: P = C / (1 - M)
const sellPrice = roundToCents(totalCost / (1 - desiredMargin));

// Bond Fee: 1.5% applied ON TOP of the Sell Price
const bondCost = roundToCents(sellPrice * BOND_PCT);

// REQ-48: Morgantown B&O Tax (2% of Sell Price + Bond)
const boTaxCost = roundToCents((sellPrice + bondCost) * MORGANTOWN_BO_TAX);

const finalClientTotal = roundToCents(sellPrice + bondCost + boTaxCost);
```

#### Validation

- [ ] Margin validation throws error if `>= 1.0`
- [ ] Divisor formula used (not multiplication)
- [ ] Bond is 1.5% of Sell Price
- [ ] B&O Tax is 2% of (Sell Price + Bond)
- [ ] Sales Tax is 9.5% of (Sell Price + Bond + B&O)

---

### ⚠️ RULE #2: Mirror Mode (Excel Bypass)

**Purpose:** 75% of proposals use pre-calculated Excel spreadsheets from senior estimators.

#### Fixed Column Mapping (NO FUZZY MATCHING)

```
Column A (0)  = Display Name
Column E (4)  = Pixel Pitch
Column F (5)  = Height
Column G (6)  = Width
Column H (7)  = Pixel H (Resolution Height)
Column J (9)  = Pixel W (Resolution Width)
Column M (12) = Brightness
```

#### Alternate Row Handling

**CRITICAL:** Rows starting with "ALT" or "Alternate" are **SKIPPED** (not ghosted).

**Edge Cases:**
- ✅ "Altitude Display" → NOT skipped (correct)
- ✅ "ALT-1 Main Display" → Skipped (correct)
- ✅ "Alternate Option" → Skipped (correct)

**Why This Matters:**
- Using `includes('alt')` would incorrectly skip "Altitude Display"
- Using `startsWith('alt')` (case-insensitive) is the correct approach

#### Implementation

**File:** [`services/proposal/server/excelImportService.ts:41`](invoify/services/proposal/server/excelImportService.ts:41)

```typescript
// REQ-111: Fixed Column Index Mapping for "Master Truth" precision
const colIdx = {
    name: 0,           // Column A - Display Name
    pitch: 4,          // Column E - Pixel Pitch
    height: 5,         // Column F - Height
    width: 6,          // Column G - Width
    pixelsH: 7,        // Column H - Pixel H
    pixelsW: 9,        // Column J - Pixel W
    brightnessNits: 12, // Column M - Brightness
    // ... additional columns
};

// REQ-111: Alternate Row Filter - Use startsWith to avoid false positives
const normalizedName = projectName.trim().toLowerCase();
if (normalizedName.startsWith('alt') || normalizedName.startsWith('alternate')) {
    continue;
}
```

#### Validation

- [ ] Fixed indices used (no fuzzy matching)
- [ ] `startsWith('alt')` used (not `includes('alt')`)
- [ ] "Altitude Display" is NOT skipped
- [ ] "ALT-1" IS skipped

---

### ⚠️ RULE #3: 17/20 Logic (Blue Glow)

**Target:** AI should fill 17 out of 20 critical fields (85% completion rate).

#### The 20 Critical Fields

1. Division 11 extraction accuracy
2. Client name
3. Client address
4. Sender name
5. Screen count (at least 1)
6-20. Per-screen specs (name, width, height, pitch, brightness, cost basis)

#### Gap Analysis

The system tracks missing fields and displays a completion score.

**File:** [`lib/gap-analysis.ts:105`](invoify/lib/gap-analysis.ts:105)

```typescript
export function analyzeGaps(formValues: any): GapItem[] {
    const gaps: GapItem[] = [];
    
    // Check 20 critical fields...
    // Returns array of missing fields
    
    return gaps;
}

export function calculateCompletionRate(gapCount: number): number {
    const CRITICAL_FIELDS_COUNT = 20;
    const score = ((CRITICAL_FIELDS_COUNT - gapCount) / CRITICAL_FIELDS_COUNT) * 100;
    return Math.round(score);
}
```

#### Blue Glow Visual Signal

- **Trigger:** Field auto-filled by AI (not manually entered)
- **Persistence:** Until user verifies (clicks/edits/confirms)
- **Storage:** In-memory metadata (not persisted in DB schema)
- **Export Behavior:** Blue Glow stripped from PDF and Share Link

---

### ⚠️ RULE #4: RAG Extraction (Division 11 Priority)

**Master Truth:** Section 11 06 60 (Display Schedule) is the absolute source for quantities and dimensions.

#### Keyword Priority (Highest to Lowest)

1. "Section 11 06 60" (Display Schedule) - **MASTER TRUTH**
2. "Display Schedule"
3. "Section 11 63 10" (LED Display Systems)
4. "Division 11"
5. "LED Display"
6. "Pixel Pitch"
7. "Brightness"

#### Configuration

- `scoreThreshold: 0.2` (20% similarity minimum)
- `topN: 6` (Return top 6 results)

#### Implementation

**File:** [`lib/rag-sync.ts:38`](invoify/lib/rag-sync.ts:38)

```typescript
// REQ-25: Division 11 Target RAG Extraction - Enhanced Keyword Weighting
const highPriorityKeywords = [
    "Section 11 06 60",      // Master Truth - Display Schedule (highest priority)
    "Display Schedule",      // Master Truth keyword
    "Section 11 63 10",      // LED Display Systems
    "Division 11",           // CSI Division
    "LED Display",           // Product type
    "Pixel Pitch",           // Technical spec
    "Brightness",            // Technical spec (formerly "Nits")
];

// Repeat high-priority keywords to boost their weight in vector search
const boostedQuery = `${query} ${highPriorityKeywords.join(' ')} ${highPriorityKeywords.slice(0, 3).join(' ')}`;

const res = await fetch(endpoint, {
    method: "POST",
    headers: {
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
        query: boostedQuery, 
        topN: 6,              // Capture top 6 relevant results
        scoreThreshold: 0.2   // 20% similarity threshold for filtering
    }),
});
```

#### Validation

- [ ] "Section 11 06 60" is first in keyword list
- [ ] Top 3 keywords are repeated for boosting
- [ ] `scoreThreshold: 0.2`
- [ ] `topN: 6`

---

### ⚠️ RULE #5: Security & Snapshot Integrity

**Rule:** Client-facing share links must NEVER reveal internal costs or margins.

#### Sanitization Process

1. Deep clone proposal object
2. Set `cost: 0` for all line items
3. Set `margin: 0` for all line items
4. Set `bondRateOverride: undefined`
5. Set `taxRateOverride: undefined`
6. Set `internalAudit: undefined`
7. Save static JSON snapshot to database
8. Share link retrieves from snapshot (not live data)

#### Implementation

**File:** [`app/api/projects/[id]/share/route.ts:27`](invoify/app/api/projects/[id]/share/route.ts:27)

```typescript
// REQ-113: Deep clone project object before sanitization to prevent data leakage
const sanitizedProject = JSON.parse(JSON.stringify(project));

// SANITIZATION: Strictly zero out all internal cost/margin data
lineItems: s.lineItems.map(li => ({
    category: li.category,
    price: li.price,
    cost: 0,        // ← FORCED TO ZERO
    margin: 0       // ← FORCED TO ZERO
}))

// SECURITY: Strictly nullify internal financial logic
bondRateOverride: undefined,
taxRateOverride: undefined,
internalAudit: undefined

// Save Snapshot to DB (Upsert)
await prisma.proposalSnapshot.upsert({
    where: { shareHash },
    create: {
        proposalId: id,
        shareHash,
        snapshotData: JSON.stringify(snapshot)
    },
    update: {
        snapshotData: JSON.stringify(snapshot),
        createdAt: new Date()
    }
});
```

#### Share Route Retrieval

**File:** [`app/share/[hash]/page.tsx:12`](invoify/app/share/[hash]/page.tsx:12)

```typescript
// REQ-34: Read-Only Share Link Snapshotting
const snapshot = await prisma.proposalSnapshot.findUnique({
    where: { shareHash: hash }
});
```

#### Validation

- [ ] Deep cloning happens before sanitization
- [ ] `cost: 0` in all line items
- [ ] `margin: 0` in all line items
- [ ] `bondRateOverride: undefined`
- [ ] `taxRateOverride: undefined`
- [ ] `internalAudit: undefined`
- [ ] Share route reads from snapshot (not live data)

---

### ⚠️ RULE #6: Nomenclature Standards

**"Nits" → "Brightness"**

All client-facing text must use "Brightness" instead of "Nits".

**Rules:**
- Variable names can remain as `brightnessNits` (internal implementation detail)
- Display text: "Brightness: 5000" (NOT "Brightness: 5000 nits")
- Applies to: UI tables, PDF headers, RAG extraction field names, Internal Audit Excel

**Files Updated:**
1. [`services/proposal/server/excelImportService.ts:123`](invoify/services/proposal/server/excelImportService.ts:123) - Display text
2. [`lib/gap-analysis.ts:77`](invoify/lib/gap-analysis.ts:77) - Error messages
3. [`lib/rfp-parser.ts:8`](invoify/lib/rfp-parser.ts:8) - Comments
4. [`lib/rfp-parser.ts:380`](invoify/lib/rfp-parser.ts:380) - Display text
5. [`lib/rfp-parser.ts:418`](invoify/lib/rfp-parser.ts:418) - Validation messages

---

### ⚠️ RULE #7: UI Architecture (100vh Split)

**Rule:** The application must be locked to `100vh` with `overflow-hidden` to prevent scrolling. Panels must use CSS visibility toggling (`opacity` + `pointer-events-none`) to keep all panels mounted while switching between Drafting, Intelligence, and Audit modes.

#### Implementation

**File:** [`app/components/layout/StudioLayout.tsx:48`](invoify/app/components/layout/StudioLayout.tsx:48)

```typescript
// Line 48: Main container locked to 100vh
<div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-200">

// Line 102: 50/50 split between Hub and Anchor
<main className="flex-1 overflow-hidden grid grid-cols-2">

// Visibility Toggle Pattern
className={cn(
    "absolute inset-0 overflow-y-auto custom-scrollbar transition-opacity duration-300",
    viewMode === "form" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
)}
```

#### Validation

- [ ] App is locked to `h-screen` (no scrolling)
- [ ] Panels use `opacity` transitions (300ms)
- [ ] Inactive panels have `pointer-events-none`
- [ ] 50/50 split between Hub and Anchor

---

### ⚠️ RULE #8: PDF Generation (Signature Block)

**Rule:** The signature block MUST be the absolute final element in PDF. No content (including footers) may render below signature lines to meet legal standards.

#### Implementation

**File:** [`app/components/templates/proposal-pdf/ProposalTemplate2.tsx:363`](invoify/app/components/templates/proposal-pdf/ProposalTemplate2.tsx:363)

```typescript
{/* 7. SIGNATURES - FORCED TO END */}
<div className="break-before-page px-4">
    {/* REQ-112: Footer moved BEFORE signatures to ensure signatures are absolute final element */}
    <div className="mb-12 pb-6 border-b border-gray-100 text-center">
        <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase mb-1">ANC SPORTS ENTERPRISES, LLC</p>
        <p className="text-[8px] text-gray-400 font-medium">2 Manhattanville Road, Suite 402, Purchase, NY 10577  |  www.anc.com</p>
    </div>

    {/* REQ-112: Signature Block as Absolute Final Element - No content renders below this point */}
    <div className="mt-12 break-inside-avoid">
        <h4 className="font-bold text-[11px] uppercase mb-8 border-b-2 border-black pb-1">Agreed To And Accepted:</h4>
        <div className="space-y-10">
            {/* ANC Signature Block */}
            {/* Purchaser Signature Block */}
        </div>
    </div>
</div>
```

#### Validation

- [ ] Footer renders BEFORE signatures
- [ ] No content renders after signature blocks
- [ ] Signature is absolute final element in DOM

---

## PROJECT ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ANC Studio                          │
│                  (Next.js 15 App Router)               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Backend    │    │  Database    │
│              │    │   (API)      │    │ (PostgreSQL) │
│ - React      │    │ - Next.js    │    │              │
│ - Tailwind   │    │   Routes     │    │ - Prisma     │
│ - Context    │    │ - Services   │    │   ORM        │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PDF Gen    │    │   AI/RAG     │    │   Email      │
│              │    │              │    │              │
│ - Puppeteer  │    │ - AnythingLLM│    │ - Nodemailer │
│ - Chromium   │    │ - Vector DB  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Directory Structure

```
invoify/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── agent/                # AnythingLLM integration
│   │   │   ├── analytics/        # AI analytics
│   │   │   └── enrich/          # AI enrichment
│   │   ├── command/             # LLM command processing
│   │   ├── comments/            # Comment system
│   │   ├── dashboard/          # Dashboard APIs
│   │   ├── ingest/             # File ingestion
│   │   ├── projects/           # Project CRUD
│   │   │   ├── [id]/          # Project-specific routes
│   │   │   │   ├── clone/      # Clone project
│   │   │   │   ├── share/      # Share link generation
│   │   │   │   └── sign/      # E-signature
│   │   ├── proposals/          # Proposal CRUD
│   │   │   ├── [id]/          # Proposal-specific routes
│   │   │   │   ├── verify/     # Verification
│   │   │   ├── auto-fix/       # Auto-fix issues
│   │   │   ├── create/         # Create proposal
│   │   │   ├── export/         # Export proposals
│   │   │   │   └── audit/     # Internal audit export
│   │   │   ├── import-excel/   # Excel import
│   │   │   └── reconcile/      # Reconciliation
│   │   ├── rag/                # RAG synchronization
│   │   ├── rfp/               # RFP upload & parsing
│   │   ├── vision/             # Vision/OCR analysis
│   │   └── workspaces/         # Workspace management
│   ├── components/             # React components
│   │   ├── layout/             # Layout components
│   │   │   ├── BaseFooter.tsx
│   │   │   ├── BaseNavbar.tsx
│   │   │   ├── DashboardSidebar.tsx
│   │   │   ├── StudioHeader.tsx
│   │   │   └── StudioLayout.tsx  # ⭐ Main layout
│   │   ├── modals/             # Modal components
│   │   │   ├── alerts/
│   │   │   ├── email/
│   │   │   ├── proposal/
│   │   │   └── signature/
│   │   ├── proposal/           # Proposal components
│   │   │   ├── form/           # Proposal form
│   │   │   │   ├── sections/    # Form sections
│   │   │   │   └── wizard/      # Wizard steps
│   │   │   ├── actions/        # Action components
│   │   │   └── templates/      # PDF templates
│   │   └── templates/          # Email templates
│   ├── share/[hash]/          # Public share link page
│   └── projects/             # Project management UI
├── lib/                      # Core business logic
│   ├── estimator.ts           # ⭐ Natalia Math calculations
│   ├── rag-sync.ts            # ⭐ RAG keyword weighting
│   ├── gap-analysis.ts        # ⭐ 17/20 logic
│   ├── rfp-parser.ts         # RFP document parsing
│   ├── catalog.ts            # LED product catalog
│   ├── schemas.ts            # Zod validation schemas
│   ├── prisma.ts             # Prisma client
│   └── variables.ts          # Environment variables
├── services/                 # External service integrations
│   └── proposal/server/
│       ├── excelImportService.ts  # ⭐ Mirror Mode Excel ingestion
│       ├── pdfService.ts         # PDF generation
│       ├── emailService.ts       # Email sending
│       └── exportService.ts      # Data export
├── prisma/                   # Database schema
│   └── schema.prisma         # ⭐ Database models
├── public/                   # Static assets
├── types.ts                  # TypeScript type definitions
└── package.json             # Dependencies
```

### Data Flow

#### Proposal Creation Flow

```
User Input
    │
    ▼
React Hook Form (Validation)
    │
    ▼
ProposalContext (State Management)
    │
    ├─→ Mirror Mode (Excel Import)
    │       │
    │       ▼
    │   excelImportService.ts
    │       │
    │       ▼
    │   Fixed Column Mapping
    │       │
    │       ▼
    │   Form State Update
    │
    ├─→ Intelligence Mode (RAG)
    │       │
    │       ▼
    │   rag-sync.ts
    │       │
    │       ▼
    │   AnythingLLM API
    │       │
    │       ▼
    │   Form State Update
    │
    ▼
Gap Analysis (17/20 Logic)
    │
    ▼
Natalia Math (Divisor Margin)
    │
    ▼
PDF Generation (Puppeteer)
    │
    ▼
Client-Facing Export
```

#### Share Link Flow

```
User Clicks "Share"
    │
    ▼
POST /api/projects/[id]/share
    │
    ▼
Deep Clone Proposal
    │
    ▼
Sanitize (cost: 0, margin: 0)
    │
    ▼
Save Snapshot to DB
    │
    ▼
Return Share Hash
    │
    ▼
Client Accesses /share/[hash]
    │
    ▼
Read Snapshot from DB
    │
    ▼
Render Sanitized View
```

---

## GETTING STARTED

### Prerequisites

- **Node.js:** 18+ (recommended: 20+)
- **PostgreSQL:** 14+
- **Docker:** (optional, for deployment)
- **Git:** Latest version
- **VS Code:** (recommended) with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense

### Installation

#### Step 1: Clone Repository

```bash
git clone <repository-url>
cd invoify
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/anc_studio"

# AnythingLLM (AI Engine)
ANYTHING_LLM_BASE_URL="http://localhost:3001"
ANYTHING_LLM_KEY="your-api-key-here"
ANYTHING_LLM_WORKSPACE="default"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"

# Email (Optional - for sending PDFs)
NODEMAILER_EMAIL="your_email@example.com"
NODEMAILER_PW="your_email_password"

# Google Site Verification (Optional)
GOOGLE_SC_VERIFICATION="your-verification-code"
```

#### Step 4: Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

#### Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification Checklist

After installation, verify:

- [ ] Development server starts without errors
- [ ] Database connection successful
- [ ] Prisma client generated
- [ ] All environment variables loaded
- [ ] Can access application at localhost:3000

---

## KEY FILES & COMPONENTS

### 1. `lib/estimator.ts` - The Calculation Engine

**Why Important:** Contains all pricing logic and Natalia Math.

**Key Functions:**
- `calculatePerScreenAudit()` - Main calculation function
- `calculateTotalWithBond()` - Bond calculation
- `calculateANCProject()` - Project-level aggregation
- `roundToCents()` - Currency rounding

**Critical Line:** Line 428 - Divisor Margin formula

**When to Edit:**
- Adding new cost categories
- Modifying margin calculations (⚠️ requires approval)
- Adding new tax rules
- Changing rounding logic

---

### 2. `services/proposal/server/excelImportService.ts` - Mirror Mode

**Why Important:** Handles Excel ingestion for 75% of proposals.

**Key Functions:**
- `parseANCExcel()` - Main Excel parser
- `findMirrorItems()` - Matches project names to margin analysis
- `extractScreenData()` - Extracts screen specifications

**Critical Lines:**
- Lines 41-59 - Fixed column mapping
- Lines 71-73 - Alternate row filtering

**When to Edit:**
- Adding new Excel columns
- Modifying column mapping (⚠️ requires approval)
- Changing ALT row filtering logic

---

### 3. `lib/rag-sync.ts` - AI Extraction

**Why Important:** Powers Intelligence Mode for RFP parsing.

**Key Functions:**
- `vectorSearch()` - RAG query with boosted keywords
- `uploadLinkToWorkspace()` - Document ingestion
- `syncRAGDocuments()` - Batch document sync

**Critical Lines:** Lines 38-48 - Keyword priority weighting

**When to Edit:**
- Adding new priority keywords
- Modifying RAG thresholds
- Changing vector search parameters

---

### 4. `app/components/layout/StudioLayout.tsx` - UI Architecture

**Why Important:** The main application layout with 50/50 split.

**Key Features:**
- Fixed 100vh viewport lock
- CSS visibility toggling for mode switching
- Vertical navigation rail (Drafting, Intelligence, Audit)

**Critical Lines:** Lines 48-211 - Layout structure

**When to Edit:**
- Changing layout structure
- Adding new view modes
- Modifying navigation

---

### 5. `app/components/templates/proposal-pdf/ProposalTemplate2.tsx` - PDF Output

**Why Important:** Generates high-fidelity PDF proposals.

**Key Features:**
- Specifications table with brightness display
- Pricing table with tax calculations
- Signature block as absolute final element

**Critical Lines:** Lines 363-424 - Signature section

**When to Edit:**
- Modifying PDF layout
- Adding new sections
- Changing branding

---

### 6. `lib/gap-analysis.ts` - 17/20 Logic

**Why Important:** Tracks missing fields and completion score.

**Key Functions:**
- `analyzeGaps()` - Identifies missing fields
- `calculateCompletionRate()` - Calculates percentage

**Critical Lines:** Lines 105-121 - Gap analysis logic

**When to Edit:**
- Adding new critical fields
- Modifying gap detection logic
- Changing completion calculation

---

### 7. `app/api/projects/[id]/share/route.ts` - Security

**Why Important:** Handles share link generation and sanitization.

**Key Functions:**
- `POST` - Generate share link
- `GET` - Retrieve share link

**Critical Lines:** Lines 27-120 - Sanitization logic

**When to Edit:**
- Modifying sanitization rules (⚠️ requires approval)
- Adding new share link features
- Changing security logic

---

## DATABASE SCHEMA

### Core Models

#### Workspace

```prisma
model Workspace {
  id              String     @id @default(cuid())
  name            String
  clientLogo      String?
  aiWorkspaceSlug String?
  proposals       Proposal[]
  users           User[]
}
```

**Purpose:** Top-level workspace/vault for client engagements.

---

#### User

```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String?
  role        UserRole  @default(VIEWER)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}
```

**Purpose:** User accounts with role-based permissions.

**Roles:**
- `ADMIN` - Full access
- `ESTIMATOR` - Core proposal creation/editing
- `PRODUCT_EXPERT` - Technical spec validation
- `PROPOSAL_LEAD` - Review and approval authority
- `FINANCE` - Cost/margin auditing
- `OUTSIDER` - Subcontractor (RESTRICTED financial access)
- `VIEWER` - Read-only

---

#### Proposal

```prisma
model Proposal {
  id                    String              @id @default(cuid())
  workspaceId          String
  clientName           String
  clientLogo           String?
  status               ProposalStatus      @default(DRAFT)
  calculationMode      CalculationMode     @default(INTELLIGENCE)
  internalAudit        String?
  clientSummary        String?
  aiThreadId           String?
  aiWorkspaceSlug      String?
  taxRateOverride      Decimal?
  bondRateOverride     Decimal?
  shareHash            String?             @unique
  shareExpiresAt       DateTime?
  sharePasswordHash    String?
  structuralTonnage    Decimal?
  reinforcingTonnage   Decimal?
  isLocked             Boolean             @default(false)
  lockedAt             DateTime?
  documentHash         String?
  parentProposalId     String?
  versionNumber        Int                 @default(1)
  verificationManifest   Json?
  reconciliationReport   Json?
  verificationStatus     VerificationStatus @default(PENDING)
  aiFilledFields         String[]
  verifiedFields         Json?
  lastVerifiedBy         String?
  lastVerifiedAt         DateTime?
  insuranceRateOverride  Decimal?
  overheadRate           Decimal?            @default(0.10)
  profitRate             Decimal?            @default(0.05)
  signerName             String?
  signerTitle            String?
  manualOverrides       ManualOverride[]
  proposalVersions      ProposalVersion[]
  signatureAuditTrail   SignatureAuditTrail[]
  comments              Comment[]
  activityLogs          ActivityLog[]
  versions             BidVersion[]
  workspace            Workspace           @relation(fields: [workspaceId], references: [id])
  screens              ScreenConfig[]
  snapshots            ProposalSnapshot[]
  rfpDocuments         RfpDocument[]
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @default(now()) @updatedAt
}
```

**Purpose:** The primary proposal object.

**Statuses:**
- `DRAFT` - Editable, not yet submitted
- `PENDING_VERIFICATION` - Submitted for internal extraction check
- `AUDIT` - Mathematical & financial review
- `APPROVED` - Ready for client signature / Exported
- `SHARED` - Share link generated/active
- `SIGNED` - Client signed - IMMUTABLE
- `CLOSED` - Fully executed - IMMUTABLE
- `ARCHIVED` - Historical record
- `CANCELLED` - Voided

---

#### ScreenConfig

```prisma
model ScreenConfig {
  id         String         @id @default(cuid())
  proposalId String
  name       String
  pixelPitch Float
  width      Float
  height     Float
  lineItems  CostLineItem[]
  proposal   Proposal       @relation(fields: [proposalId], references: [id])
}
```

**Purpose:** Individual screen/display configuration.

---

#### CostLineItem

```prisma
model CostLineItem {
  id             String       @id @default(cuid())
  screenConfigId String
  category       String
  cost           Decimal
  margin         Decimal
  price          Decimal
  screenConfig   ScreenConfig @relation(fields: [screenConfigId], references: [id])
}
```

**Purpose:** Individual cost line items (hardware, structure, install, etc.).

---

### Supporting Models

#### ProposalSnapshot

```prisma
model ProposalSnapshot {
  id           String   @id @default(cuid())
  proposalId   String
  shareHash    String   @unique
  snapshotData String   // JSON string of proposal state at time of share
  expiresAt    DateTime?
  passwordHash String?
  createdAt    DateTime @default(now())
  proposal     Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
}
```

**Purpose:** Immutable snapshots for share links.

---

#### SignatureAuditTrail

```prisma
model SignatureAuditTrail {
  id              String   @id @default(cuid())
  proposalId      String
  proposal        Proposal @relation(fields: [proposalId], references: [id])
  signerEmail     String
  signerName      String
  signerTitle     String?
  signerRole      String
  ipAddress       String
  userAgent       String?
  authMethod      String
  documentHash    String
  pdfHash         String?
  auditExcelHash  String?
  signedAt        DateTime @default(now())
}
```

**Purpose:** E-signature audit trail for legal compliance.

---

### Database Relationships

```
Workspace (1) ──< (N) User
Workspace (1) ──< (N) Proposal
Proposal (1) ──< (N) ScreenConfig
ScreenConfig (1) ──< (N) CostLineItem
Proposal (1) ──< (N) ProposalSnapshot
Proposal (1) ──< (N) SignatureAuditTrail
Proposal (1) ──< (N) Comment
Proposal (1) ──< (N) ActivityLog
```

---

## API ROUTES

### Project Management

#### `POST /api/workspaces/create`

**Purpose:** Create a new workspace.

**Request:**
```json
{
  "name": "Jacksonville Jaguars",
  "userEmail": "estimator@anc.com"
}
```

**Response:**
```json
{
  "id": "clxxx...",
  "name": "Jacksonville Jaguars",
  "users": [...]
}
```

---

#### `GET /api/projects`

**Purpose:** List all projects in a workspace.

**Query Parameters:**
- `workspaceId` - Filter by workspace
- `status` - Filter by status

**Response:**
```json
{
  "projects": [...]
}
```

---

#### `GET /api/projects/[id]`

**Purpose:** Get a specific project.

**Response:**
```json
{
  "id": "clxxx...",
  "clientName": "Jacksonville Jaguars",
  "status": "DRAFT",
  "screens": [...]
}
```

---

#### `POST /api/projects/[id]/clone`

**Purpose:** Clone a project.

**Response:**
```json
{
  "id": "clxxx...",
  "parentProposalId": "clxxx...",
  "versionNumber": 2
}
```

---

### Proposal Management

#### `POST /api/proposals/create`

**Purpose:** Create a new proposal.

**Request:**
```json
{
  "workspaceId": "clxxx...",
  "clientName": "Jacksonville Jaguars",
  "calculationMode": "MIRROR"
}
```

**Response:**
```json
{
  "id": "clxxx...",
  "status": "DRAFT",
  "calculationMode": "MIRROR"
}
```

---

#### `POST /api/proposals/import-excel`

**Purpose:** Import data from Excel file (Mirror Mode).

**Request:** `multipart/form-data` with Excel file.

**Response:**
```json
{
  "screens": [...],
  "importedCount": 5,
  "skippedCount": 2
}
```

---

#### `POST /api/proposals/[id]/verify`

**Purpose:** Verify proposal calculations.

**Response:**
```json
{
  "status": "VERIFIED",
  "verificationManifest": {...},
  "reconciliationReport": {...}
}
```

---

#### `POST /api/proposals/auto-fix`

**Purpose:** Auto-fix common issues.

**Response:**
```json
{
  "fixedIssues": [...],
  "remainingIssues": [...]
}
```

---

### Export & PDF

#### `POST /api/proposals/export`

**Purpose:** Export proposal data.

**Request:**
```json
{
  "format": "pdf" | "xlsx" | "csv" | "xml" | "json"
}
```

**Response:** File download.

---

#### `POST /api/proposals/export/audit`

**Purpose:** Export Internal Audit Excel.

**Response:** Excel file download.

---

### Share Links

#### `POST /api/projects/[id]/share`

**Purpose:** Generate share link.

**Response:**
```json
{
  "shareHash": "abc123...",
  "shareUrl": "https://anc.com/share/abc123...",
  "expiresAt": "2026-02-28T00:00:00Z"
}
```

---

#### `GET /share/[hash]`

**Purpose:** Access shared proposal (public).

**Response:** Sanitized proposal data.

---

### AI & RAG

#### `POST /api/command`

**Purpose:** Process LLM commands.

**Request:**
```json
{
  "message": "Add a screen with 10mm pitch",
  "workspaceId": "clxxx..."
}
```

**Response:**
```json
{
  "type": "ADD_SCREEN",
  "payload": {...}
}
```

---

#### `POST /api/rag/sync`

**Purpose:** Sync documents to RAG.

**Request:**
```json
{
  "documents": [...]
}
```

**Response:**
```json
{
  "syncedCount": 10,
  "failedCount": 0
}
```

---

## TESTING GUIDE

### Unit Tests

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test estimator.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

#### Test Structure

```typescript
// lib/estimator.test.ts
import { calculatePerScreenAudit } from './estimator';

describe('Natalia Math', () => {
  describe('Divisor Margin Formula', () => {
    it('should calculate correct selling price with 25% margin', () => {
      const result = calculatePerScreenAudit({
        totalCost: 10000,
        margin: 0.25
      });
      
      expect(result.sellPrice).toBe(13333.33);
    });

    it('should throw error if margin >= 100%', () => {
      expect(() => {
        calculatePerScreenAudit({
          totalCost: 10000,
          margin: 1.0
        });
      }).toThrow('Margin must be less than 100%');
    });
  });
});
```

---

### Integration Tests

#### Testing Excel Import

```typescript
// services/proposal/server/excelImportService.test.ts
import { parseANCExcel } from './excelImportService';

describe('Mirror Mode', () => {
  it('should import screens from Excel with fixed column mapping', async () => {
    const excelFile = await loadTestExcel('test-data.xlsx');
    const result = await parseANCExcel(excelFile);
    
    expect(result.screens).toHaveLength(5);
    expect(result.screens[0].name).toBe('Center Hung Display');
    expect(result.screens[0].pixelPitch).toBe(10);
  });

  it('should skip rows starting with ALT', async () => {
    const excelFile = await loadTestExcel('with-alt-rows.xlsx');
    const result = await parseANCExcel(excelFile);
    
    expect(result.screens.every(s => !s.name.toLowerCase().startsWith('alt'))).toBe(true);
  });

  it('should NOT skip "Altitude Display"', async () => {
    const excelFile = await loadTestExcel('altitude-display.xlsx');
    const result = await parseANCExcel(excelFile);
    
    expect(result.screens.some(s => s.name === 'Altitude Display')).toBe(true);
  });
});
```

---

### Manual Testing Checklist

#### Mirror Mode

- [ ] Upload Excel with Columns A, E, F, G, H, J, M
- [ ] Verify "Alternate" rows are skipped
- [ ] Verify "Altitude Display" is NOT skipped
- [ ] Verify all screens imported correctly
- [ ] Check calculations match Excel

#### Intelligence Mode

- [ ] Upload 2,500-page RFP PDF
- [ ] Verify Division 11 extraction
- [ ] Check 17/20 completion score
- [ ] Verify Blue Glow on AI-filled fields
- [ ] Test gap filling

#### Security

- [ ] Create share link
- [ ] Inspect browser network tab
- [ ] Verify `cost: 0` and `margin: 0` in response
- [ ] Verify `bondRateOverride: undefined`
- [ ] Verify `taxRateOverride: undefined`
- [ ] Verify `internalAudit: undefined`

#### PDF Generation

- [ ] Generate proposal PDF
- [ ] Verify signature is last element
- [ ] Check "Brightness" (not "nits") in specs table
- [ ] Verify all calculations correct
- [ ] Check branding matches ANC guidelines

#### Natalia Math

- [ ] Test with 25% margin
- [ ] Test with 50% margin
- [ ] Test with 0% margin
- [ ] Test with 99% margin
- [ ] Verify error on 100%+ margin
- [ ] Check bond calculation (1.5%)
- [ ] Check B&O tax (2% for Morgantown)
- [ ] Check sales tax (9.5%)

---

## COMMON ISSUES & SOLUTIONS

### Issue 1: Division by Zero Error

**Symptom:** `Infinity` selling price

**Cause:** Margin set to 100% or higher

**Solution:** Added validation in `lib/estimator.ts:427`

```typescript
if (desiredMargin >= 1.0) {
    throw new Error(`Invalid margin: ${desiredMargin * 100}%. Margin must be less than 100% for Divisor Margin model.`);
}
```

**Prevention:** Always validate margin input before calculation.

---

### Issue 2: Excel Column Mis-Mapping

**Symptom:** Wrong data extracted from Excel

**Cause:** Fuzzy matching incorrect columns

**Solution:** Use fixed column indices (A=0, E=4, F=5, etc.)

```typescript
const colIdx = {
    name: 0,           // Column A
    pitch: 4,          // Column E
    height: 5,         // Column F
    // ...
};
```

**Prevention:** Never use fuzzy matching for Excel columns.

---

### Issue 3: "Altitude Display" Skipped

**Symptom:** Valid display excluded from proposal

**Cause:** `includes('alt')` matches "altitude"

**Solution:** Use `startsWith('alt')` instead

```typescript
// WRONG
if (name.toLowerCase().includes('alt')) { ... }

// CORRECT
if (name.toLowerCase().startsWith('alt')) { ... }
```

**Prevention:** Always use `startsWith` for prefix matching.

---

### Issue 4: Internal Costs Leaked in Share Link

**Symptom:** Client can see internal costs via browser inspector

**Cause:** Missing sanitization

**Solution:** Deep clone before sanitization

```typescript
const sanitizedProject = JSON.parse(JSON.stringify(project));

lineItems: s.lineItems.map(li => ({
    category: li.category,
    price: li.price,
    cost: 0,        // ← FORCED TO ZERO
    margin: 0       // ← FORCED TO ZERO
}))
```

**Prevention:** Always sanitize before sharing.

---

### Issue 5: AnythingLLM Bad Gateway (502)

**Symptom:** AI commands fail with 502 error

**Cause:** Missing port mapping in Easypanel

**Solution:** Configure port mapping for AnythingLLM container

1. Open Easypanel
2. Select AnythingLLM container
3. Add port mapping: `3001:3001`
4. Save and restart container

**Reference:** [`BAD_GATEWAY_FIX.md`](invoify/BAD_GATEWAY_FIX.md)

---

### Issue 6: PDF Generation Timeout

**Symptom:** PDF generation hangs or times out

**Cause:** Large proposal or slow rendering

**Solution:** Optimize PDF generation

1. Use Puppeteer in headless mode
2. Cache generated PDFs for 5 minutes
3. Optimize images before embedding
4. Increase timeout in API route

```typescript
// Increase timeout
export const maxDuration = 60; // 60 seconds
```

---

### Issue 7: Database Connection Failed

**Symptom:** Application fails to start with database error

**Cause:** Incorrect `DATABASE_URL` or database not running

**Solution:** Verify database connection

```bash
# Test database connection
psql $DATABASE_URL

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL if needed
sudo systemctl restart postgresql
```

---

### Issue 8: Prisma Client Not Generated

**Symptom:** `PrismaClient is not generated` error

**Cause:** Missing `npx prisma generate`

**Solution:** Generate Prisma client

```bash
npx prisma generate
```

**Prevention:** Add to `package.json` scripts:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

## DEPLOYMENT

### Docker Deployment

#### Building the Image

```bash
# Build Docker image
docker build -t anc-studio:latest .

# Build with specific tag
docker build -t anc-studio:v1.0.0 .
```

#### Running the Container

```bash
docker run -d \
  --name anc-studio \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@db:5432/anc_studio" \
  -e ANYTHING_LLM_BASE_URL="http://anythingllm:3001" \
  -e ANYTHING_LLM_KEY="your-api-key" \
  -e NODE_ENV="production" \
  anc-studio:latest
```

#### Docker Compose

```yaml
version: '3.8'

services:
  anc-studio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/anc_studio
      - ANYTHING_LLM_BASE_URL=http://anythingllm:3001
      - ANYTHING_LLM_KEY=your-api-key
      - NODE_ENV=production
    depends_on:
      - postgres
      - anythingllm

  postgres:
    image: postgres:17
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=anc_studio
    volumes:
      - postgres_data:/var/lib/postgresql/data

  anythingllm:
    image: mintplexlabs/anythingllm:latest
    ports:
      - "3001:3001"
    volumes:
      - anythingllm_data:/app/server/storage

volumes:
  postgres_data:
  anythingllm_data:
```

---

### VPS Deployment (Easypanel)

#### Step 1: SSH into Server

```bash
ssh user@your-server.com
```

#### Step 2: Clone Repository

```bash
git clone <repository-url>
cd invoify
```

#### Step 3: Install Dependencies

```bash
npm install --production
```

#### Step 4: Build Application

```bash
npm run build
```

#### Step 5: Start with PM2

```bash
# Install PM2 if not already installed
npm install -g pm2

# Start application
pm2 start npm --name "anc-studio" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Step 6: Configure Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name anc.com www.anc.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 7: Set Up SSL Certificate

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d anc.com -d www.anc.com

# Auto-renewal is configured automatically
```

---

### Environment-Specific Configuration

#### Development

```env
DATABASE_URL="postgresql://user:password@localhost:5432/anc_studio_dev"
ANYTHING_LLM_BASE_URL="http://localhost:3001"
ANYTHING_LLM_KEY="dev-api-key"
NODE_ENV="development"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

#### Staging

```env
DATABASE_URL="postgresql://user:password@staging-db:5432/anc_studio_staging"
ANYTHING_LLM_BASE_URL="https://staging-llm.anc.com"
ANYTHING_LLM_KEY="staging-api-key"
NODE_ENV="staging"
NEXT_PUBLIC_BASE_URL="https://staging.anc.com"
```

#### Production

```env
DATABASE_URL="postgresql://user:password@prod-db:5432/anc_studio"
ANYTHING_LLM_BASE_URL="https://llm.anc.com"
ANYTHING_LLM_KEY="prod-api-key"
NODE_ENV="production"
NEXT_PUBLIC_BASE_URL="https://anc.com"
```

---

## SECURITY BEST PRACTICES

### Data Sanitization

**ALWAYS:**
- Deep clone before sanitizing
- Set `cost: 0` and `margin: 0` for client views
- Verify sanitization after changes
- Test share links manually

**NEVER:**
- Log unsanitized proposal data
- Expose internal costs in API responses
- Share live data (always use snapshots)

---

### API Routes

**Validation:**
- Validate all input data
- Use Zod schemas for validation
- Sanitize error messages
- Rate limit expensive operations

**Authentication:**
- Implement proper authentication
- Use JWT tokens
- Validate tokens on every request
- Implement role-based access control

---

### Database

**Connection Security:**
- Use environment variables for credentials
- Enable SSL for database connections
- Use connection pooling
- Implement proper indexing

**Backups:**
- Regular automated backups
- Test restore procedures
- Store backups securely
- Keep multiple backup versions

---

### Secrets Management

**Best Practices:**
- Never commit `.env` files
- Use secret management services (AWS Secrets Manager, etc.)
- Rotate secrets regularly
- Use different secrets for different environments
- Audit secret access

---

### Code Security

**Input Validation:**
- Validate all user input
- Sanitize data before storage
- Use parameterized queries
- Prevent SQL injection

**Output Encoding:**
- Encode output for HTML
- Use React's built-in XSS protection
- Sanitize user-generated content
- Implement Content Security Policy

---

## PERFORMANCE OPTIMIZATION

### Database Queries

**Optimization Techniques:**
- Use `select` to limit returned fields
- Implement pagination for large datasets
- Add indexes on frequently queried columns
- Use query batching
- Implement caching

**Example:**

```typescript
// BEFORE: Fetches all fields
const proposals = await prisma.proposal.findMany();

// AFTER: Fetches only needed fields
const proposals = await prisma.proposal.findMany({
  select: {
    id: true,
    clientName: true,
    status: true,
    createdAt: true
  }
});
```

---

### PDF Generation

**Optimization Techniques:**
- Cache generated PDFs for 5 minutes
- Use Puppeteer in headless mode
- Optimize images before embedding
- Implement lazy loading
- Use CDN for static assets

**Example:**

```typescript
// Cache PDF generation
const cacheKey = `pdf:${proposalId}:${version}`;
const cachedPdf = await redis.get(cacheKey);

if (cachedPdf) {
  return cachedPdf;
}

const pdf = await generatePDF(proposal);
await redis.setex(cacheKey, 300, pdf); // 5 minutes
return pdf;
```

---

### AI Processing

**Optimization Techniques:**
- Batch RAG queries
- Cache vector search results
- Limit `topN` to 6 results
- Implement request queuing
- Use streaming responses

**Example:**

```typescript
// Batch RAG queries
const queries = [
  "What is the pixel pitch?",
  "What is the brightness?",
  "What are the dimensions?"
];

const results = await Promise.all(
  queries.map(q => vectorSearch(q))
);
```

---

### Frontend Performance

**Optimization Techniques:**
- Implement code splitting
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize images (WebP, lazy loading)
- Use service workers for caching

**Example:**

```typescript
// Code splitting
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

// React.memo
const ScreenCard = React.memo(({ screen }) => {
  return <div>{screen.name}</div>;
});
```

---

## DEVELOPMENT WORKFLOW

### Git Workflow

#### Branch Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/feature-name
  ↑
bugfix/bug-name
```

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Example:**

```
feat(estimator): add B&O tax calculation for Morgantown projects

- Implement 2% B&O tax on (Sell Price + Bond)
- Add location detection for Morgantown, WV
- Update PDF template to show B&O tax line

Closes #123
```

---

### Code Review Process

#### Before Submitting PR

1. **Run Tests**
   ```bash
   npm test
   npm run lint
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Manual Testing**
   - Test all modified features
   - Test edge cases
   - Verify no regressions

4. **Update Documentation**
   - Update README if needed
   - Update API documentation
   - Add comments to complex code

#### PR Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] No breaking changes (or documented)
- [ ] Security review completed

---

### Release Process

#### Versioning

Use Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes (backwards compatible)

#### Release Steps

1. **Update Version**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Create Release Branch**
   ```bash
   git checkout -b release/v1.0.0
   ```

3. **Update CHANGELOG**
   ```markdown
   ## [1.0.0] - 2026-01-31
   ### Added
   - Feature 1
   - Feature 2
   ### Fixed
   - Bug 1
   - Bug 2
   ```

4. **Merge to Main**
   ```bash
   git checkout main
   git merge release/v1.0.0
   ```

5. **Tag Release**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

6. **Deploy**
   ```bash
   # Deploy to production
   npm run deploy:prod
   ```

---

## QUICK START FOR NEW DEVELOPERS

### Day 1: Read & Understand

**Morning (2 hours):**
1. Read this onboarding guide
2. Review [`PROJECT_OVERVIEW.md`](invoify/PROJECT_OVERVIEW.md)
3. Review [`PROJECT_MASTER_TRUTH.md`](invoify/PROJECT_MASTER_TRUTH.md)
4. Understand the business domain (LED displays, sports venues)

**Afternoon (4 hours):**
1. Review [`lib/estimator.ts`](invoify/lib/estimator.ts) - Understand Natalia Math
2. Review [`services/proposal/server/excelImportService.ts`](invoify/services/proposal/server/excelImportService.ts) - Understand Mirror Mode
3. Review [`lib/rag-sync.ts`](invoify/lib/rag-sync.ts) - Understand RAG extraction
4. Set up development environment

**Evening (2 hours):**
1. Run the application locally
2. Explore the UI
3. Create a test proposal
4. Generate a PDF

---

### Day 2: Code Exploration

**Morning (3 hours):**
1. Review [`app/components/layout/StudioLayout.tsx`](invoify/app/components/layout/StudioLayout.tsx) - Understand UI architecture
2. Review [`app/components/templates/proposal-pdf/ProposalTemplate2.tsx`](invoify/app/components/templates/proposal-pdf/ProposalTemplate2.tsx) - Understand PDF generation
3. Review [`prisma/schema.prisma`](invoify/prisma/schema.prisma) - Understand database schema

**Afternoon (4 hours):**
1. Create a test proposal using Mirror Mode
2. Create a test proposal using Intelligence Mode
3. Generate a PDF and verify output
4. Test share link generation and sanitization

**Evening (1 hour):**
1. Review existing issues in GitHub
2. Identify a simple bug to fix
3. Prepare for Day 3

---

### Day 3: Make Changes

**Morning (4 hours):**
1. Fix a simple bug
2. Write tests for the fix
3. Run tests and verify
4. Commit changes

**Afternoon (3 hours):**
1. Add a new field to the proposal form
2. Update database schema if needed
3. Update validation schemas
4. Test the new field

**Evening (1 hour):**
1. Submit a pull request
2. Request code review
3. Address feedback

---

### Week 1: Deep Dive

**Goals:**
- Understand all critical business rules
- Become familiar with the codebase
- Contribute to the project
- Build relationships with the team

**Tasks:**
- [ ] Complete Day 1-3 tasks
- [ ] Review all API routes
- [ ] Understand the proposal lifecycle
- [ ] Learn the testing framework
- [ ] Fix at least 2 bugs
- [ ] Add at least 1 small feature
- [ ] Participate in code reviews
- [ ] Attend team meetings

---

### Week 2-4: Ramp Up

**Goals:**
- Become productive independently
- Take ownership of a feature area
- Contribute to architectural decisions
- Mentor other new developers

**Tasks:**
- [ ] Complete all Week 1 tasks
- [ ] Take ownership of a feature
- [ ] Write comprehensive tests
- [ ] Improve documentation
- [ ] Participate in planning meetings
- [ ] Review pull requests
- [ ] Help onboard other new developers

---

## EMERGENCY PROCEDURES

### Production Outage

#### Step 1: Assess the Situation

```bash
# Check application status
pm2 status

# Check logs
pm2 logs anc-studio --lines 100

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Step 2: Identify the Issue

- Check error logs
- Monitor system resources (CPU, memory, disk)
- Check external services (AnythingLLM, database)
- Review recent deployments

#### Step 3: Implement Fix

- Rollback to previous version if needed
- Fix the issue
- Test the fix
- Deploy to production

#### Step 4: Post-Mortem

- Document the incident
- Identify root cause
- Implement preventive measures
- Update runbooks

---

### Data Breach

#### Step 1: Contain the Breach

- Immediately revoke all access tokens
- Change all passwords
- Shut down affected systems
- Notify security team

#### Step 2: Assess the Damage

- Identify what data was exposed
- Determine who was affected
- Assess the scope of the breach

#### Step 3: Notify Stakeholders

- Notify affected users
- Notify management
- Notify legal team if needed
- Document all communications

#### Step 4: Remediate

- Patch the vulnerability
- Implement additional security measures
- Monitor for suspicious activity
- Conduct security audit

---

### Database Corruption

#### Step 1: Stop Writes

```bash
# Stop application
pm2 stop anc-studio

# Enable maintenance mode
# (configure nginx to return 503)
```

#### Step 2: Assess Damage

```bash
# Check database integrity
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database"

# Check for corrupted tables
psql $DATABASE_URL -c "\dt"
```

#### Step 3: Restore from Backup

```bash
# Restore from latest backup
pg_restore -d anc_studio backup.dump

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM proposals"
```

#### Step 4: Restart Application

```bash
# Start application
pm2 start anc-studio

# Verify functionality
curl http://localhost:3000/health
```

---

## RESOURCES & CONTACTS

### Documentation

- [PROJECT_OVERVIEW.md](invoify/PROJECT_OVERVIEW.md) - Detailed project documentation
- [PROJECT_MASTER_TRUTH.md](invoify/PROJECT_MASTER_TRUTH.md) - Critical business rules
- [ONBOARDING_HANDOVER.md](invoify/ONBOARDING_HANDOVER.md) - Previous onboarding guide
- [ESTIMATOR_CONSTITUTION.md](invoify/ESTIMATOR_CONSTITUTION.md) - Calculation rules
- [SETUP_SUMMARY.md](invoify/SETUP_SUMMARY.md) - Setup instructions
- [BAD_GATEWAY_FIX.md](invoify/BAD_GATEWAY_FIX.md) - Troubleshooting guide

### Key Contacts

| Role | Name | Contact | Responsibilities |
|------|------|----------|------------------|
| **Project Lead** | Ahmad | ahmad@anc.com | Product decisions, priorities |
| **Business Rules** | Natalia | natalia@anc.com | Estimator logic, margin rules |
| **Technical Lead** | [Your Name] | [email] | Architecture, code reviews |
| **DevOps** | [Name] | [email] | Deployment, infrastructure |

### External Services

- **AnythingLLM:** https://anythingllm.com - AI engine for RAG extraction
- **Prisma:** https://www.prisma.io - Database ORM
- **Puppeteer:** https://pptr.dev - PDF generation
- **Next.js:** https://nextjs.org - React framework
- **Tailwind CSS:** https://tailwindcss.com - CSS framework

### Community

- **GitHub Issues:** https://github.com/[repo]/issues
- **Discord:** https://discord.gg/uhXKHbVKHZ
- **Documentation:** https://docs.anc.com

### Learning Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **React Documentation:** https://react.dev
- **TypeScript Documentation:** https://www.typescriptlang.org/docs
- **Prisma Documentation:** https://www.prisma.io/docs
- **Tailwind CSS Documentation:** https://tailwindcss.com/docs

---

## ⚠️ CRITICAL WARNINGS

1. **NEVER** change Divisor Margin formula without explicit approval from Natalia
2. **NEVER** expose internal costs in client-facing exports
3. **NEVER** use fuzzy matching for Excel columns (use fixed indices)
4. **NEVER** commit `.env` files or secrets
5. **ALWAYS** test with real RFP documents before deploying
6. **ALWAYS** verify share link sanitization after changes
7. **ALWAYS** deep clone before sanitizing data
8. **ALWAYS** validate margin input (< 100%)
9. **ALWAYS** use `startsWith('alt')` for ALT row filtering
10. **ALWAYS** ensure signature is last element in PDF

---

## 🎯 SUCCESS METRICS

- **Calculation Accuracy:** 99.9%+ (verified against manual calculations)
- **Data Security:** 0 internal cost leakage incidents
- **PDF Quality:** Ferrari-level output matching manual quotes
- **AI Auto-Fill Rate:** 85%+ (17/20 fields)
- **Proposal Generation Time:** < 1 hour from RFP upload to shareable link
- **Uptime:** 99.9%+ availability
- **Test Coverage:** 80%+ for critical business logic

---

## 📝 FINAL NOTES

This onboarding guide is a living document. As the project evolves, this guide should be updated to reflect changes, new features, and lessons learned.

**Remember:**
- Ask questions when unsure
- Test thoroughly before deploying
- Document your changes
- Help others learn
- Continuously improve

**Welcome to the team!** 🚀

---

**Document Version:** 3.0 (Ultimate Edition)  
**Last Updated:** 2026-01-31  
**Maintained By:** Development Team  
**Next Review:** 2026-02-28
