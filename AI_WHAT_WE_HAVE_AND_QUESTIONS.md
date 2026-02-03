# AI: What We Have + Questions for Your Call

**Purpose:** One place for what the AI does today and what we need from you (or from them) so we can scope the next steps.

---

## What we have (in the codebase)

### 1. **Backend: AnythingLLM (RAG)**
- **What it is:** All AI runs through **AnythingLLM** (your hosted RAG). No direct OpenAI/Anthropic in app code — we call `ANYTHING_LLM_BASE_URL` + `ANYTHING_LLM_KEY`.
- **Endpoints we use:** workspace chat, stream-chat, document upload, `update-embeddings`, vector-search, thread/new.
- **Docs:** `anuthingapidoc.md` — create workspace, upload doc, link to workspace, chat for extraction.

### 2. **RFP extraction (two paths)**
- **Path A – Upload flow** (`app/api/rfp/upload/route.ts`): User uploads RFP → file goes to vault + AnythingLLM workspace → we call `queryVault(workspaceSlug, extractionPrompt, "chat")` with a fixed prompt that asks for JSON (clientName, proposalName, venue, screens with name/width/height/quantity/pitch, structural tonnage, etc.). We parse JSON and return `extractedData` to the frontend.
- **Path B – RfpExtractionService** (`services/rfp/server/RfpExtractionService.ts`): Deeper prompt aimed at **Division 11 / Section 11 06 60** (LED Display Schedule). Asks for citations per value, Ferrari rules (union labor, WTC, spare parts, replacement, HDR/brightness, Thornton Tomasetti structural tonnage). Returns structured JSON with `screens[]` and `rulesDetected`. Used when we have a workspace and want “full spec + citations.”

### 3. **AI command bar** (`app/api/command/route.ts` + `AiCommandBar.tsx`)
- User types natural language. We send it to AnythingLLM workspace chat (with optional thread). System prompt describes “ANC Engine Controller” and actions: `ADD_SCREEN`, `UPDATE_CLIENT`, `SET_MARGIN`, `SET_PITCH`, etc.
- After chat we do a **vector-search** on the workspace, try to match product IDs/names to ANC catalog, then optionally emit a JSON action (e.g. add screen with that product). So: RAG answer + product match → proposal update.

### 4. **AiWand (client/address enrichment)** (`app/components/reusables/AiWand.tsx` + `app/api/agent/enrich/route.ts`)
- **Frontend:** Exists. User has a field (e.g. client/venue name), clicks wand, we send `query` + `targetFields` (e.g. `receiver.address`, `receiver.city`).
- **Backend:** Enrich route uses **one fixed workspace** (`ANYTHING_LLM_WORKSPACE` or `anc-estimator`). Asks AnythingLLM for corrected query + up to 5 candidates with address fields in JSON. If LLM fails or returns no JSON we fallback to **Serper** web search for venue address. So: **AiWand backend is implemented** (not missing). It uses global workspace, not per-project.

### 5. **Gap analysis / Bid Health** (non-LLM)
- Pure logic: checks 20 critical fields, weighted completion, grouped gaps, priorities. No AI.

### 6. **Planned / partial**
- **Smart Ingest** (`SMART_INGEST_PLAN.md`): Filter-then-embed — score RFP pages by “signal” vs “noise,” only embed high-value pages; drawings → vision (e.g. Z AI GLM) → text → embed. Not fully implemented.
- **Vision** (`app/api/vision/analyze`, `services/vision/`): Drawing analysis (e.g. GLM) exists in codebase; not wired as the main RFP path.
- **Verification** (`lib/ai-verification.ts`): Helpers to mark “AI-filled” fields as verified (audit trail). No automatic verification flow.
- **SOW generator** (`services/sow/sowGenerator.ts`): Can use AnythingLLM for SOW generation.

---

## What’s *not* in the codebase
- No direct **OpenAI** or **Anthropic** API keys in app code (everything goes through AnythingLLM).
- No “which model” config in app — that’s set in AnythingLLM.
- AiWand is **not** “backend missing” — it has `/api/agent/enrich`; it uses a **single shared workspace** for all projects.

---

## Master Truth answers (PRD, transcripts, Strategic QA)

### 1. #1 AI pain
**Manual drudgery & data-entry risk.** Jeremy and Natalia manually scour 2,500+ page “Humanist” RFPs for LED specs, type into Excel, then re-type into InDesign. Secondary: slow turnaround (weeks per proposal). **Trust:** fear of “hallucination leakage” → **Blue Glow** (AI-filled indicator) and **Trust but Verify** (human must approve) are **P0**.

### 2. Who “they” are
**Internal ANC stakeholders** (tool is for ANC, not end clients).
- **Natalia Kovaleva:** Ferrari-grade PDF, zero math error, workflow speed.
- **Jeremy Joana:** Parsing massive RFPs, Internal Audit Excel, Division 11 specs.
- **Eric Gruner:** LED catalog, module-by-module matching.
- **Alison Burke:** French Blue (#0A52EF), 2025 Identity Guidelines.

### 3. What “get this AI” means
**Demonstrate the 17/20 extraction and gap-fill workflow:**
1. Ingest a massive PDF (e.g. Jacksonville Jaguars RFP).
2. Auto-fill **17 of 20** fields (Height, Width, Pitch, etc.) correctly.
3. **Stop** at a missing field (e.g. Service Type) and trigger **Gap Fill** chat: *“Is this front or rear service?”*
4. **Block export** until gap is filled (“Natalia Gatekeeper”).

### 4. AnythingLLM
**Locked.** Architecture uses AnythingLLM workspaces + vector DB for 15-year audit trail and context isolation. No direct OpenAI/Anthropic for extraction; stay on `/v1/workspace/{slug}/chat` in client’s secure infra.

### 5. Workspace model
**One workspace per PROJECT.** Project (e.g. “Chicago Fire”) = top-level container/workspace. Proposal (e.g. “v1 Budget,” “v2 Quote”) lives inside it. Create workspace via `/v1/workspace/new`, upload RFP into it; AiWand and Sidebar query **that** `aiWorkspaceSlug` only (no cross-project leakage).

### 6. Citations
**P0.** Strategic QA failed a prior build for missing citations. **Requirement:** every AI-extracted field shows `[Source: Section X, Page Y]`. **UI:** Intelligence Sidebar or tooltip on Blue Glow field in Drafting Table.

### 7. AiWand workspace
**Yes — must use current project’s `aiWorkspaceSlug`.** Global workspace = data leakage (e.g. Jaguars data in WVU project); violates security/audit.

### 8. 17/20 and the 20 fields
**Yes — formal “85% auto-fill” success metric.** PRD 6.2 Extraction Targets (the 20):
1. Screen Name, 2. MM Pitch, 3. Quantity, 4. Active Height, 5. Active Width, 6. Pixel Resolution H, 7. Pixel Resolution W, 8. **Brightness** (NOT Nits), 9. Structural Tonnage, 10. Location/Zone, 11. Service Type (Front/Rear), 12. Application (Indoor/Outdoor), plus financial (Margin, Tax, Bond, etc.).

### 9. Division 11 / 11 06 60
**Primary, not only.** Jeremy: “90% of the time it’s in Division 11… specifically 11 63 10 LED display systems.” Exceptions: Sound → Division 27 (e.g. 27 41 16.63), Lighting → Division 26. AI must prioritize 11 06 60 / 11 63 10 for LED but search other divisions when RFP includes Audio/Lighting.

### 10. Ferrari rules (complete set)
1. **Color:** French Blue (#0A52EF) only. No Tailwind blues.  
2. **Typography:** Work Sans — Bold (700) headlines, SemiBold (600) subheads.  
3. **Layout:** Fixed 100vh viewport, no double scroll, 50/50 Hub/Anchor.  
4. **Nomenclature:** “Brightness” not “Nits” everywhere.  
5. **Placeholders:** No `$0.00`; use `[PROJECT TOTAL]`.  
6. **Graphics:** 55° slash pattern on PDF covers.

### 11. Smart Ingest
**HIGH.** Jeremy: “I’ll get a document… 2,500 pages… to find a 12-page document.” System must scan PDF, identify pages with Division 11 / Display Schedule, prioritize embedding/analyzing those pages (token cost + accuracy).

### 12. Vision for drawings
**Text/OCR sufficient for MVP.** Ahmad: AI won’t interpret geometry; use OCR. Goal: find *page* labeled “AV-101” or “Elevation” so Jeremy can look; no need yet to compute steel loads from drawing lines.

### 13. Main AI surface
**RFP extraction (“Populate” action).** Primary = Document ingestion → auto-fill. **Sidebar (chat)** = secondary, for **Gap Fill** (missing 3 fields) and ad-hoc (“What is the liquidated damages clause?”). Not a command bar for UI actions.

---

## One-line summary (post–Master Truth)
**Demo:** 17/20 extraction → Gap Fill for missing fields → block export until filled. **Architecture:** AnythingLLM only, one workspace per project, citations P0, AiWand bound to project workspace. **Ferrari:** French Blue, Work Sans, Brightness not Nits, [PROJECT TOTAL], 55° slash. **Roadmap:** Smart Ingest high; vision = find drawing pages via OCR for MVP.
