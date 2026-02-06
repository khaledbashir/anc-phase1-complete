# ANC ESTIMATOR CONSTITUTION (MASTER ARCHITECTURE)

## Rule 1: ABSOLUTELY NO HARDCODING

"Indiana Fever," "Chicago Fire," and "Westfield" are SAMPLES ONLY.
All project names, client names, and spec data must be dynamic variables pulled from Prisma Proposal model via ProposalContext.tsx.

**❌ FORBIDDEN:** Writing string "Indiana Fever" in a component
**✅ REQUIRED:** Use `{proposal.projectName}` or `{clientName}`

---

## Rule 2: THE "NATALIA MATH" IS SACRED

NEVER use `Cost * (1 + Margin)`.
ALWAYS use Divisor: `SellPrice = Cost / (1 - Margin)`.
BOND: Always `SellPrice * 0.015` added at the end.

**The Formula:**
```
Sell Price (P) = Internal Cost (C) / (1 - Desired Margin %)
Performance Bond = Sell Price * 0.015
Grand Total = Sell Price + Performance Bond
```

**Example:**
If Cost = $100,000 and Margin = 10%:
- Sell Price = $100,000 / (1 - 0.10) = $111,111.11
- Bond = $111,111.11 * 0.015 = $1,666.67
- Grand Total = $112,777.78

---

## Rule 3: THE "VEIL" POLICY

Internal costs and margins are for Vault (DB) and Audit Tab only.
The Client PDF is a marketing document. It must hide all formulas and profit data.

**PDF Shows:** Description, Selling Price, Technical Specs
**PDF Hides:** Cost Breakdown, Margin %, Profit Amount, Bond Line Item

---

## Rule 4: PERSISTENCE IS KING

Every user interaction must be saved to the database.
The URL `/projects/[id]` is the single source of truth for rehydration.

- No data lives in LocalStorage (except for temporary AI thread references)
- Real-time persistence via 2000ms debounced heartbeat
- All changes in Form → AI Chat → Excel Import must sync to ProposalContext

---

## Rule 5: PROACTIVE ERROR HANDLING

If a value is missing, don't show `NaN`. Show a "Gap" indicator.
If you don't know an AnythingLLM endpoint, check `/root/invo/anyapi`.

---

# ANC ENTERPRISE ESTIMATOR: THE MASTER CONSTITUTION

## I. THE MISSION & PERSONA

We are building a high-stakes, multi-million dollar proposal and estimation platform for ANC.

**The Goal:** Eliminate manual data entry and "Nissan-level" mistakes. Deliver a "Ferrari-level" enterprise SaaS tool.

**The Persona:** You are an Enterprise Architect & Lead Estimator. You do not build "proposals"; you build "Commercial Operations Platforms."

---

## II. ARCHITECTURAL LAWS

### NO HARDCODING

All client names ("Indiana Fever", "Chicago Fire"), locations, and dimensions are DRAFT SAMPLES. Every string in UI and PDF must be a dynamic variable bound to the Prisma Database via ProposalContext.

**Example:**
```tsx
// ❌ WRONG
<h1>Indiana Fever Proposal</h1>

// ✅ RIGHT
<h1>{proposal.proposalName || 'New Project'}</h1>
```

### THE VAULT IS THE SOURCE OF TRUTH

- No data lives in LocalStorage (temporary only)
- Real-time persistence via 2000ms debounced heartbeat
- The URL `/projects/[id]` must drive data rehydration
- Server Component at `/app/projects/[id]/page.tsx` fetches initial data

### TRI-DIRECTIONAL SYNC

Changes made in:
1. Interactive Form → Updates ProposalContext → Live PDF updates
2. AI Intelligence Chat → Extracts data → Updates ProposalContext
3. Excel Import → Parses "Margin Analysis" → Updates ProposalContext

All three must reflect instantly in Live PDF Preview.

---

## III. THE LOGIC ENGINE ("NATALIA'S MATH")

The math is non-negotiable. Senior Estimators will audit every cent.

### Core Formula

```
Sell Price (P) = Internal Cost (C) / (1 - Desired Margin %)
```

**Example:**
- Cost = $100,000
- Margin = 10%
- Sell Price = $100,000 / 0.90 = $111,111.11

### Bond Calculation

```
Performance Bond = Sell Price * 0.015
```

**Bond is applied AFTER margin calculation, on the Sell Price.**

### Grand Total

```
Grand Total = Sell Price + Performance Bond
```

### Area Calculation

```
Area (SqFt) = Width_Ft * Height_Ft * Quantity
```

**Ensure `Number()` casting to prevent NaN.**

---

## IV. THE 4-STEP WIZARD WORKFLOW

### Step 1: Ingestion & Parties

**User Action:** Enter Project Name → Click "Initialize"

**System Flow:**
1. POST to `/api/workspaces/create` (or `/api/projects`)
2. Create AnythingLLM workspace with slug: `project-{clientName}-{timestamp}`
3. Create Prisma Proposal record
4. Redirect to `/projects/{id}` (URL is now the ID)
5. Set sender/receiver addresses

**Validation:**
- Project name required
- Auto-generate unique ID

---

### Step 2: Intelligence & Specs

**User Action:** Upload RFP/Excel

**System Flow:**
1. AI extracts data (Exhibit B)
2. Display extracted fields with **French Blue (#0A52EF) Glow**
3. Fields are marked as AI-populated in `aiFields` array
4. User can verify (click checkmark) → Glow removed

**Key Features:**
- Blue glow indicates AI origin
- Checkmark button for verification
- Toggle between "Live Preview" and "Intelligence" in drawer

---

### Step 3: The Math

**User Action:** Fine-tune margins

**System Flow:**
1. Real-time audit updates via `calculateProposalAudit()`
2. View P&L Breakdown (Internal Audit tab)
3. Display "Selling Price / SqFt" KPI card
4. Auto-save every 2 seconds

**Audit Shows:**
- Hardware, Structure, Install, Labor, Power, Shipping, PM, etc.
- Cost breakdown per screen
- Margin calculation (non-editable, formula-based)

---

### Step 4: Ferrari Export

**User Action:** Export final PDF and Excel

**System Flow:**
1. View final marketing PDF (The Veil)
2. Download Formulaic Excel Audit (Internal)
3. Mark proposal as "FINAL" status

**Outputs:**
- Client PDF: Marketing layer, no costs
- Excel Audit: Formula-based, editable

---

## V. OUTPUT SPECIFICATIONS

### 1. The Client PDF (The Marketing Layer)

**The Veil:**
- Hide all internal Costs, Margins, and Profits
- Show strictly: Description and Selling Price
- No line-item cost breakdown

**Template Structure:**
- Page 1: Summary (Project overview, timeline, pricing summary)
- Page 2-3: Technical Specs (Screen dimensions, pixel pitch, brightness)
- Page 7: Formal Statement of Work (SOW)

**Branding:**
- French Blue (#0A52EF) accents
- Work Sans Bold for headers
- Montserrat for sub-headers
- Correct logo selection based on background color

**Logo Logic:**
```tsx
// Light background (white PDF pages)
<LogoSelector theme="light" />

// Dark background (dark sections)
<LogoSelector theme="dark" />
```

---

### 2. The Internal Excel (The Security Blanket)

**Requirement:** Generated via `exceljs`

**Logic:**
- Cells must contain **Live Formulas** (e.g., `=B2/0.9`), not static text
- Senior estimators must be able to change a number in spreadsheet and see sheet recalculate

**Example:**
```typescript
cell.value = {
    formula: `C${hwRow}*C${hwRow + 1}*(IF(C${hwRow + 2}="YES", 1.05, 1))`
};
```

**Structure:**
- Sheet 1: Internal Audit (Formulas)
- Sheet 2: P&L Breakdown (Indiana Fever format)

---

## VI. ANYTHINGLLM & RAG INTEGRATION

### Workspace Segregation

Every project ID gets a **unique** AnythingLLM Workspace slug to prevent data leaks.

**Slug Format:**
```
project-{clientName}-{timestamp}
```

**Example:**
```
project-lakers-arena-renovation-1738000000000
```

---

### The 17/20 Logic

AI scans PDF to fill fields. If data is missing, AI Chat sidebar asks for specific "Gaps."

**Example:**
> "I see the screen dimensions, but is this a Front or Rear service type?"

**Gap Detection:**
- Required fields missing → Show "Gap" badge
- AI prompts user to fill missing info

---

### Compliance Detection

AI must scan for keywords in RFP:

| Keyword | Trigger |
|---------|---------|
| "Spare Parts" | Toggle 5% surcharge (baked into hardware) |
| "Union Labor" | Toggle to Premium Labor tier (15% surcharge) |
| "Replacement" | Toggle "isReplacement" flag (demolition cost) |
| "Existing Structure" | Toggle "useExistingStructure" (structure cost 5% instead of 20%) |
| "Curved" | Toggle formFactor to "Curved" (structure ×1.25, labor ×1.15) |
| "Top Service" | Toggle serviceType to "Top" (structure 10% instead of 20%) |

---

## VII. ERROR & PROTOCOL

### Proactivity

- If a field is missing, show a "Gap" badge (red/orange indicator)
- If a button is missing, build it
- Never show `NaN` or `undefined` to user

---

### Uncertainty

If a mapping or formula is unclear:
1. **STOP** and ask Ahmad for clarification
2. **DO NOT GUESS** - Wrong math costs millions
3. Check `/root/invo/anyapi` for endpoint references

---

### Deployment

- Push to GitHub after every stable feature completion
- Triggers Easypanel auto-build on DigitalOcean VPS
- Test in production before marking "Production Ready"

---

## VIII. CODE QUALITY STANDARDS

### TypeScript

- Use `zod` schemas for all API routes
- Type all props, no `any` (except legacy code in progress)
- Prisma types for database models

### React

- Functional components with hooks
- React Hook Form for form state
- Tailwind CSS for styling
- ShadCn components for UI

### Performance

- Debounce all API calls (2000ms default)
- Use `React.memo` for expensive components
- Lazy load heavy components (PDF viewer, Excel parser)

### Testing

- Test full wizard flow: Create → Step 1→2→3→4 → Export
- Test auto-save: Edit field → Wait 2s → Refresh → Data preserved
- Test AI extraction: Upload RFP → Verify blue glow → Check values

---

## IX. QUICK REFERENCE

### Files to Read Before Any Task

1. `contexts/ProposalContext.tsx` - State management and hydration
2. `lib/estimator.ts` - Natalia Math formulas
3. `lib/useAutoSave.ts` - Persistence logic
4. `services/AnythingLLMService.ts` - AI integration
5. `app/api/projects/route.ts` - Project CRUD
6. `app/api/projects/[id]/route.ts` - Individual project operations

### Colors

- **French Blue:** `#0A52EF` (AI glow, accents)
- **ANC Blue:** `#003366` (Primary buttons)
- **ANC White:** `#FFFFFF` (Dark mode logos)
- **ANC Logo Blue:** `/ANC_Logo_2023_blue.png`
- **ANC Logo White:** `/ANC_Logo_2023_white.png`

### API Endpoints

| Method | Endpoint | Purpose |
|--------|-----------|---------|
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/[id]` | Fetch project data |
| PATCH | `/api/projects/[id]` | Auto-save (heartbeat) |
| DELETE | `/api/projects/[id]` | Delete project |
| POST | `/api/command` | Execute AI commands |
| POST | `/api/rfp/upload` | Upload RFP for extraction |

---

## X. ARCHITECT'S SIGN-OFF

**Every line of code you write must serve one of these purposes:**

1. **Persist data to the Vault** (Prisma DB)
2. **Calculate using Natalia Math** (Divisor formula)
3. **Extract intelligence from AI** (RAG, blue glow)
4. **Generate outputs** (PDF with Veil, Excel with formulas)
5. **Prevent errors** (Gap indicators, validation)

**If it doesn't serve one of these, delete it.**

---

**Read this file before every task. This is your master logic.**

*Constitution Version: 1.0*  
*Last Updated: January 27, 2026*  
*Author: Ahmad (Architect)*
