# ANC Studio - Developer Onboarding & Handover Guide

**Last Updated:** 2026-01-29  
**Project Status:** Production-Ready  
**Version:** 2.0 (Integrity Hardened)

---

## 🎯 PROJECT OVERVIEW

**ANC Studio** is a next-generation proposal generation system for ANC Sports Enterprises, LLC. It automates the creation of LED display proposals with AI-powered RFP extraction, intelligent pricing calculations, and high-fidelity PDF generation.

### Business Context
- **Client:** ANC Sports Enterprises (Purchase, NY)
- **Industry:** LED Display Systems for Sports Venues
- **Primary Users:** Estimators, Sales Engineers, Project Managers
- **Key Clients:** Jacksonville Jaguars, West Virginia University (WVU)

### Core Value Proposition
- **75% Mirror Mode:** Bypass AI calculations by importing pre-calculated Excel spreadsheets
- **25% Intelligence Mode:** AI-driven extraction from 2,500-page RFP documents
- **100% Data Security:** Client-facing exports never reveal internal costs or margins
- **Ferrari-Level Output:** High-fidelity PDF proposals that match manual quotes

---

## 🏗️ TECHNOLOGY STACK

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context (ProposalContext)
- **PDF Generation:** Puppeteer + React-to-PDF

### Backend
- **API Routes:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **AI Engine:** AnythingLLM (RAG - Retrieval Augmented Generation)
- **File Processing:** XLSX (Excel parsing), PDF.js

### Infrastructure
- **Deployment:** Docker containers
- **Hosting:** VPS with Easypanel
- **Environment:** Production (Linux 5.15)

---

## 📐 CRITICAL BUSINESS RULES

### 1. Natalia Math (Divisor Margin Model)

**THE MOST IMPORTANT RULE:** The system uses **Divisor Margin**, NOT markup.

```
WRONG (Markup):  Price = Cost × (1 + Margin)
CORRECT (Divisor): Price = Cost / (1 - Margin)

Example: $10,000 cost with 25% margin
Markup:   $10,000 × 1.25 = $12,500
Divisor:  $10,000 / 0.75 = $13,333.33
```

**Calculation Sequence:**
1. Total Cost = Sum of all line items (hardware, structure, install, labor, power, etc.)
2. Sell Price = Total Cost / (1 - Margin)
3. Bond = Sell Price × 1.5%
4. B&O Tax = (Sell Price + Bond) × 2%
5. Sales Tax = (Sell Price + Bond + B&O) × 9.5%
6. Final Total = Sell Price + Bond + B&O + Sales Tax

**File:** [`lib/estimator.ts:428`](invoify/lib/estimator.ts:428)

---

### 2. Mirror Mode (Excel Bypass)

**Purpose:** 75% of proposals use pre-calculated Excel spreadsheets from senior estimators.

**Column Mapping (FIXED - No Fuzzy Matching):**
- Column A (0): Display Name
- Column E (4): Pixel Pitch
- Column F (5): Height
- Column G (6): Width
- Column H (7): Pixel H (Resolution Height)
- Column J (9): Pixel W (Resolution Width)
- Column M (12): Brightness

**Alternate Row Handling:**
- Rows starting with "ALT" or "Alternate" are **SKIPPED** (not ghosted)
- Example: "Altitude Display" would be incorrectly skipped if using `includes('alt')`
- Solution: Use `startsWith('alt')` (case-insensitive)

**File:** [`services/proposal/server/excelImportService.ts:41`](invoify/services/proposal/server/excelImportService.ts:41)

---

### 3. 17/20 Logic (Blue Glow)

**Target:** AI should fill 17 out of 20 critical fields (85% completion rate).

**20 Critical Fields:**
1. Division 11 extraction accuracy
2. Client name
3. Client address
4. Sender name
5. Screen count (at least 1)
6-20. Per-screen specs (name, width, height, pitch, brightness, cost basis)

**Gap Analysis:** The system tracks missing fields and displays a completion score.

**File:** [`lib/gap-analysis.ts:105`](invoify/lib/gap-analysis.ts:105)

---

### 4. RAG Extraction (Division 11 Priority)

**Master Truth:** Section 11 06 60 (Display Schedule) is the absolute source for quantities and dimensions.

**Keyword Priority (Highest to Lowest):**
1. "Section 11 06 60" (Display Schedule)
2. "Display Schedule"
3. "Section 11 63 10" (LED Display Systems)
4. "Division 11"
5. "LED Display"
6. "Pixel Pitch"
7. "Brightness"

**Configuration:**
- `scoreThreshold: 0.2` (20% similarity minimum)
- `topN: 6` (Return top 6 results)

**File:** [`lib/rag-sync.ts:38`](invoify/lib/rag-sync.ts:38)

---

### 5. Security & Snapshot Integrity

**Rule:** Client-facing share links must NEVER reveal internal costs or margins.

**Sanitization Process:**
1. Deep clone the proposal object
2. Set `cost: 0` and `margin: 0` for all line items
3. Set `bondRateOverride: undefined`
4. Set `taxRateOverride: undefined`
5. Set `internalAudit: undefined`
6. Save static JSON snapshot to database
7. Share link retrieves from snapshot (not live data)

**File:** [`app/api/projects/[id]/share/route.ts:27`](invoify/app/api/projects/[id]/share/route.ts:27)

---

### 6. Nomenclature Standards

**"Nits" → "Brightness"**
- All client-facing text must use "Brightness"
- Variable names can remain as `brightnessNits` (internal)
- Display text: "Brightness: 5000" (NOT "Brightness: 5000 nits")

---

## 🗂️ PROJECT STRUCTURE

```
invoify/
├── app/
│   ├── api/                          # API Routes
│   │   ├── agent/                    # AnythingLLM integration
│   │   ├── proposals/                # Proposal CRUD operations
│   │   ├── rfp/                      # RFP upload & parsing
│   │   └── projects/                 # Project management & sharing
│   ├── components/
│   │   ├── layout/                   # Layout components (StudioLayout)
│   │   ├── proposal/                 # Proposal form & AI sidebar
│   │   ├── templates/                # PDF templates (ProposalTemplate1, 2, 3)
│   │   └── reusables/                # Reusable UI components
│   ├── share/[hash]/                 # Public share link page
│   └── projects/                     # Project management UI
├── lib/
│   ├── estimator.ts                  # ⭐ Natalia Math calculations
│   ├── rag-sync.ts                   # ⭐ RAG keyword weighting
│   ├── gap-analysis.ts               # ⭐ 17/20 logic
│   ├── rfp-parser.ts                 # RFP document parsing
│   └── catalog.ts                    # LED product catalog
├── services/
│   └── proposal/server/
│       └── excelImportService.ts     # ⭐ Mirror Mode Excel ingestion
├── prisma/
│   └── schema.prisma                 # Database schema
└── types.ts                          # TypeScript type definitions
```

---

## 🚀 GETTING STARTED

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional, for deployment)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and AnythingLLM settings

# 3. Run database migrations
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/anc_studio"

# AnythingLLM (AI Engine)
ANYTHING_LLM_BASE_URL="http://localhost:3001"
ANYTHING_LLM_KEY="your-api-key-here"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 🔧 KEY FILES TO UNDERSTAND

### 1. `lib/estimator.ts` - The Calculation Engine

**Why Important:** Contains all pricing logic and Natalia Math.

**Key Functions:**
- `calculatePerScreenAudit()` - Main calculation function
- `calculateTotalWithBond()` - Bond calculation
- `calculateANCProject()` - Project-level aggregation

**Critical Line:** Line 428 - Divisor Margin formula

---

### 2. `services/proposal/server/excelImportService.ts` - Mirror Mode

**Why Important:** Handles Excel ingestion for 75% of proposals.

**Key Functions:**
- `parseANCExcel()` - Main Excel parser
- `findMirrorItems()` - Matches project names to margin analysis

**Critical Lines:**
- Lines 41-59 - Fixed column mapping
- Lines 71-73 - Alternate row filtering

---

### 3. `lib/rag-sync.ts` - AI Extraction

**Why Important:** Powers the Intelligence Mode for RFP parsing.

**Key Functions:**
- `vectorSearch()` - RAG query with boosted keywords
- `uploadLinkToWorkspace()` - Document ingestion

**Critical Lines:** Lines 38-48 - Keyword priority weighting

---

### 4. `app/components/layout/StudioLayout.tsx` - UI Architecture

**Why Important:** The main application layout with 50/50 split.

**Key Features:**
- Fixed 100vh viewport lock
- CSS visibility toggling for mode switching
- Vertical navigation rail (Drafting, Intelligence, Audit)

**Critical Lines:** Lines 48-211 - Layout structure

---

### 5. `app/components/templates/proposal-pdf/ProposalTemplate2.tsx` - PDF Output

**Why Important:** Generates the high-fidelity PDF proposals.

**Key Features:**
- Specifications table with brightness display
- Pricing table with tax calculations
- Signature block as absolute final element

**Critical Lines:** Lines 363-424 - Signature section

---

## 🧪 TESTING

### Unit Tests

```bash
# Run estimator tests
npm test -- estimator.test.ts

# Run Excel import tests
npm test -- excelImport.test.ts

# Run all tests
npm test
```

### Manual Testing Checklist

**Mirror Mode:**
- [ ] Upload Excel with Columns A, E, F, G, H, J, M
- [ ] Verify "Alternate" rows are skipped
- [ ] Verify "Altitude Display" is NOT skipped

**Intelligence Mode:**
- [ ] Upload 2,500-page RFP PDF
- [ ] Verify Division 11 extraction
- [ ] Check 17/20 completion score

**Security:**
- [ ] Create share link
- [ ] Inspect browser network tab
- [ ] Verify `cost: 0` and `margin: 0` in response

**PDF Generation:**
- [ ] Generate proposal PDF
- [ ] Verify signature is last element
- [ ] Check "Brightness" (not "nits") in specs table

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: Division by Zero Error

**Symptom:** `Infinity` selling price

**Cause:** Margin set to 100% or higher

**Solution:** Added validation in `lib/estimator.ts:427`

---

### Issue 2: Excel Column Mis-Mapping

**Symptom:** Wrong data extracted from Excel

**Cause:** Fuzzy matching incorrect columns

**Solution:** Use fixed column indices (A=0, E=4, F=5, etc.)

---

### Issue 3: "Altitude Display" Skipped

**Symptom:** Valid display excluded from proposal

**Cause:** `includes('alt')` matches "altitude"

**Solution:** Use `startsWith('alt')` instead

---

### Issue 4: Internal Costs Leaked in Share Link

**Symptom:** Client can see internal costs via browser inspector

**Cause:** Missing sanitization

**Solution:** Deep clone before sanitization

---

## 📊 PERFORMANCE OPTIMIZATION

### Database Queries
- Use `select` to limit returned fields
- Implement pagination for large datasets
- Add indexes on frequently queried columns

### PDF Generation
- Cache generated PDFs for 5 minutes
- Use Puppeteer in headless mode
- Optimize images before embedding

### AI Processing
- Batch RAG queries
- Cache vector search results
- Limit `topN` to 6 results

---

## 🔐 SECURITY CONSIDERATIONS

### Data Sanitization
- **ALWAYS** deep clone before sanitizing
- **NEVER** log unsanitized proposal data
- **ALWAYS** set `cost: 0` and `margin: 0` for client views

### API Routes
- Validate all input data
- Rate limit expensive operations
- Sanitize error messages

### Database
- Use environment variables for credentials
- Enable SSL for database connections
- Regular backups

---

## 🚢 DEPLOYMENT

### Docker Deployment

```bash
# Build Docker image
docker build -t anc-studio .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e ANYTHING_LLM_BASE_URL="your-llm-url" \
  anc-studio
```

### VPS Deployment (Easypanel)

1. SSH into server
2. Clone repository
3. Install dependencies: `npm install --production`
4. Build application: `npm run build`
5. Start with PM2: `pm2 start npm --name "anc-studio" -- start`
6. Configure Nginx reverse proxy
7. Set up SSL certificate

---

## 📚 ADDITIONAL RESOURCES

### Documentation
- [PROJECT_OVERVIEW.md](invoify/PROJECT_OVERVIEW.md) - Detailed project documentation
- [ESTIMATOR_CONSTITUTION.md](invoify/ESTIMATOR_CONSTITUTION.md) - Calculation rules
- [SETUP_SUMMARY.md](invoify/SETUP_SUMMARY.md) - Setup instructions

### Key Contacts
- **Project Lead:** Ahmad (Product Owner)
- **Business Rules:** Natalia (Estimator)
- **Technical Lead:** [Your Name]

### External Services
- **AnythingLLM:** AI engine for RAG extraction
- **Prisma:** Database ORM
- **Puppeteer:** PDF generation

---

## 🎓 QUICK START FOR NEW DEVELOPERS

### Day 1: Read & Understand
1. Read this handover document
2. Review `lib/estimator.ts` - Understand Natalia Math
3. Review `services/proposal/server/excelImportService.ts` - Understand Mirror Mode
4. Set up development environment

### Day 2: Code Exploration
1. Run the application locally
2. Create a test proposal using Mirror Mode
3. Create a test proposal using Intelligence Mode
4. Generate a PDF and verify output

### Day 3: Make Changes
1. Fix a simple bug
2. Add a new field to the proposal form
3. Test your changes thoroughly
4. Submit a pull request

---

## ⚠️ CRITICAL WARNINGS

1. **NEVER** change the Divisor Margin formula without explicit approval from Natalia
2. **NEVER** expose internal costs in client-facing exports
3. **NEVER** use fuzzy matching for Excel columns (use fixed indices)
4. **ALWAYS** test with real RFP documents before deploying
5. **ALWAYS** verify share link sanitization after changes

---

## 📈 FUTURE ROADMAP

### Phase 1 (Current)
- ✅ Integrity hardening
- ✅ Security enhancements
- ✅ Nomenclature standardization

### Phase 2 (Next)
- Multi-tab Excel verification viewer
- Site-specific structural logic
- Performance optimization

### Phase 3 (Future)
- Real-time collaboration
- Advanced analytics
- Mobile responsive design

---

## 🎯 SUCCESS METRICS

- **Accuracy:** 99%+ calculation accuracy
- **Performance:** < 3 seconds for PDF generation
- **Security:** 0 data leakage incidents
- **Uptime:** 99.9% availability
- **User Satisfaction:** 4.5/5 stars

---

**Welcome to the ANC Studio team! We're excited to have you on board. If you have any questions, don't hesitate to reach out.**

**Remember:** The "Master Truth" is Section 11 06 60 (Display Schedule), and Natalia Math uses the Divisor Margin model. Everything else follows from these two principles.
