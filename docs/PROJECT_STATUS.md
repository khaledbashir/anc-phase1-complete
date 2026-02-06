# ANC Studio - Project Status & Single Source of Truth

## 1. Project Overview
ANC Studio is an AI-powered proposal generation system for large-format LED display projects. It transforms RFPs and technical specs into branded PDFs and Internal Audit Excels.

## 2. Implementation Status (as of 2026-01-30)

### 2.1 Core Features
| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| **Natalia Math (Divisor Engine)** | ✅ Implemented | P0 | Formula: `Selling Price = Cost / (1 - Margin)`. |
| **Mirror Mode (Excel Import)** | ⚠️ Partial | P0 | Mapping Column A, E, F, G, H/J, M. **Issue**: Resets project name. |
| **Internal Audit Excel** | ✅ Implemented | P0 | Fixed "empty sheet" issue by preferring local state over DB draft. |
| **Branded PDF Export** | ✅ Implemented | P0 | Fixed "not working" issue; auto-generates if missing. |
| **Share Link (Sanitized)** | ⚠️ In Progress | P0 | Snapshotting implemented; sanitization needs verification. |
| **AI Wand (Address/Details)** | ❌ Missing | P1 | Frontend button exists; backend API route pending. |
| **RFP Extraction (RAG)** | ⚠️ Partial | P1 | File upload exists; Workspace slug hydration issues detected. |
| **Wizard Validation** | ✅ Fixed | P0 | Next Step button now unblocked by Project/Client name. |
| **Identity (Colors/Fonts)** | ✅ Aligned | P0 | French Blue (#0A52EF) and Work Sans enforced. |

### 2.2 UI/UX Improvements
| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| **Header Cleanup** | ❌ Pending | Medium | Messy layout; needs reorganization. |
| **UI Crowding** | ❌ Pending | Medium | Elements are too big; needs responsive scaling. |
| **Accordions/Collapsing** | ❌ Pending | Medium | Hide ingestion box after successful import. |
| **Nomenclature Sync** | ✅ Fixed | P0 | "Nits" changed to "Brightness" everywhere. |

## 3. Technical Debt & Bug Log
- **Mirror Mode State**: Project name resets to "New Project" because Excel import overwrites state without local persistence.
- **AnythingLLM Integration**: Workspace slugs are not always correctly initialized, breaking chat and RFP upload.
- **AI Enrichment**: `/api/agent/enrich` route is missing implementation.
- **Share Link Validation**: Ensure `proposalId` is correctly populated for public viewing.

## 4. Next Steps (Action Plan)
1. **Implement AI Enrichment API**: Connect AI wand to AnythingLLM @agent search.
2. **Fix Mirror Mode Reset**: Persist project name before import or merge smarter.
3. **UI Polish**:
   - Clean up header (move global exports, remove redundant import).
   - Implement accordion for Ingestion step.
   - Reduce size of UI elements for higher density.
4. **Stabilize RAG**: Ensure RFP upload correctly creates/uses AnythingLLM workspaces.
5. **Verify Share Link**: Test the public-facing sanitized snapshot.

---
*This document serves as the master record for ANC Studio development. Refer to `prisma/clientneed` for the full PRD.*
