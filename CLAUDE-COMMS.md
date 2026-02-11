# CLAUDE-COMMS.md

> **Purpose:** This file is the communication channel between two Claude instances working with Ahmad on the ANC Proposal Engine. Chat Claude (claude.ai) handles architecture, planning, spec design, and review. IDE Claude (Cursor/Claude Code) handles implementation, debugging, and code-level decisions. Ahmad relays between us, but this file is the persistent shared context so neither instance loses the thread.
>
> **Protocol:** Each entry is timestamped and attributed. Either instance can write here. Read this file before starting any new task related to the PDF Triage Tool.

---

## 2025-02-11 — INITIAL STATE DUMP (from Chat Claude)

### What This Project Is

The PDF Page Triage Tool is a standalone utility at `/tools/pdf-filter` in the ANC Proposal Engine (Next.js app). It lets estimators (Matt, Jeremy, Eric) drop in massive RFP PDFs (2500+ pages), automatically filter them down to only the relevant pages, and export a clean PDF. It's a pre-processing step before content goes into AnythingLLM or the proposal engine's embedding pipeline.

The tool has **zero AI dependency for text pages** — pure keyword matching. It uses a **vision model (Claude Haiku) only for construction drawings** that have no text layer.

---

### Spec Evolution (how we got here)

The spec went through 4 major iterations in chat. Here's what changed and why:

**V1 (initial):** Basic split-screen, keywords on left, PDF preview on right, checkbox filtering. Simple but flat — everything on one screen, no scale handling.

**V2 (first rewrite):** Three-phase flow (Upload → Triage → Export). Two-column KEEP/DISCARD with drag-and-drop. Virtualized lists for scale. TF-style scoring. This was solid but had issues:

**V2 review — what Chat Claude pushed back on:**
- ❌ Reorder within KEEP = scope creep. Cut it. Original PDF order is correct.
- ❌ No fuzzy matching — normalization only. Fuzzy on 2500 pages is slow + false positives erode trust. Let users enter keyword variants explicitly.
- ✅ Thumbnails only for KEEP column. DISCARD is a compact text list. Saves ~90% memory.
- ✅ Batch selection mandatory — checkbox multi-select + shift+click + "Move Selected" buttons. Dragging 15 pages one at a time is unacceptable.
- ✅ Standalone `/tools/` route, not embedded in proposal flow. Useful outside proposals (AnythingLLM prep, client specs). Can embed later.

**V3 (keyword bank):** Ahmad's call — estimators shouldn't type the same keywords every time. Added a preset keyword bank with 8 categories and 170+ ANC domain terms, all active by default. Custom keywords are additive, tucked below as "Add Custom Keywords." Zero-config for 90% of use cases: Drop PDF → Analyze → done.

**V4 (two-pipeline architecture):** Ahmad's call — drawings are a blind spot. Text-only pages get keyword scoring. Drawing pages (< 50 chars of text) get routed to a separate tab for vision model analysis. User-triggered (costs money). Progressive streaming results. This is the current spec.

---

### Current Spec Summary (V4 — what should be built)

```
PDF uploaded (2,400 pages)
│
├── Step 0: Classification (instant, local, no AI)
│   Page has ≥ 50 chars extracted text → TEXT PAGE
│   Page has < 50 chars → DRAWING PAGE
│
├── Tab 1: Text Triage
│   Preset keyword bank (170+ terms, 8 categories, all ON by default)
│   Custom keywords additive
│   TF-style scoring: hits / √(text length)
│   KEEP column: thumbnail cards, lazy-rendered, virtualized
│   DISCARD column: compact text list, no thumbnails
│   Threshold slider for auto-split
│   Batch select + shift+click + drag-and-drop between columns
│
├── Tab 2: Drawing Triage
│   User-triggered vision analysis (not automatic — costs money)
│   Cost estimate shown before user clicks Analyze
│   Drawing category toggles (electrical, structural, signage, etc.)
│   Custom instructions field
│   Progressive streaming results (cards appear as batches complete)
│   Confidence zones: ≥70% auto-KEEP, <30% auto-DISCARD, 30-70% highlighted for review
│   Same KEEP/DISCARD UX as text but with AI descriptions + category tags
│
├── Tab 3: Export
│   Merges KEEP from both tabs in original PDF page order
│   Export options: combined, text-only, drawings-only
│   Page manifest showing every kept page
│   Size reduction percentage
│
└── Safety Features
    Scanned PDF detection (< 100 chars total → warning)
    AbortController on vision calls (cancel on reset/nav)
    No auto-cost-incurrence (vision requires explicit user action)
```

---

### What IDE Claude Built (First Pass)

**Files created:**
- `app/tools/pdf-filter/page.tsx` — dynamic import wrapper (SSR-safe)
- `app/tools/pdf-filter/PdfFilterClient.tsx` — main client component (~1400 lines)
- `app/tools/pdf-filter/lib/scoring.ts` — classification + keyword scoring
- `app/tools/pdf-filter/lib/keyword-presets.ts` — 8 categories, 170+ terms
- `app/tools/pdf-filter/lib/drawing-categories.ts` — 9 drawing categories
- `app/tools/pdf-filter/lib/pdf-utils.ts` — pdf.js text extraction, thumbnails, pdf-lib export
- `app/tools/pdf-filter/lib/pdf-vision.ts` — vision batching, prompts, progressive results
- `app/api/tools/pdf-vision/route.ts` — Claude Haiku API endpoint
- Modified `DashboardSidebar.tsx` — added sidebar link
- Modified `BaseNavbar.tsx` — hide navbar on /tools routes

---

### Chat Claude's Audit of First Pass

**What was good:**
- Clean separation into lib modules
- SSR-safe dynamic import
- Confidence zone logic correct (70/30 thresholds)
- Scanned PDF detection implemented

**Bugs found:**
1. **CRITICAL — Race condition in analyzeAllDrawings:** Concurrent processBatch calls mutated shared `allResults` array. → IDE Claude fixed this.
2. **HIGH — No AbortController:** Orphaned vision API fetches on reset/nav. → IDE Claude fixed this.
3. **HIGH — Sequential thumbnail bottleneck:** 1,300 drawings rendered one-at-a-time before first API call. → IDE Claude fixed with batch parallelism.

**Missing features found:**
1. **@dnd-kit not implemented:** Packages installed, zero imports. Only batch select buttons existed. → IDE Claude added DnD with DndContext, DroppableColumn, DraggableWrapper.
2. **Confidence zones had no visual distinction:** 45% confidence looked identical to 95%. → IDE Claude added ConfidenceBadge component with green/amber/red + "NEEDS REVIEW" banner.

**Still pending:**
1. Component extraction — 1400 lines in one file. Spec called for separate KeepColumn.tsx, DiscardColumn.tsx, DrawingCard.tsx, PagePreview.tsx, ThresholdSlider.tsx, VisionConfig.tsx, ExportTab.tsx. Functional but not properly decomposed.
2. Real PDF load testing — nothing tested with actual 2500-page PDF.

---

### CURRENT BLOCKER — pdf.js Worker Error

**Status: BROKEN on deployed EasyPanel instance.**

Error message on `/tools/pdf-filter`:
```
PDF analysis failed: Setting up fake worker failed: "Failed to fetch dynamically imported module: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.624/pdf.worker.min.mjs"
```

**Chat Claude's analysis:**
This is almost certainly a version mismatch. The code is trying to load a pdf.js worker from CDN at version 5.4.624, but the installed `pdfjs-dist` package is probably a different version. Or the worker URL is hardcoded/wrong. Or Next.js has specific web worker requirements that aren't being met.

**Questions to investigate:**
1. What version of `pdfjs-dist` is in package.json?
2. What version is the worker URL pointing to in pdf-utils.ts?
3. Is there a version mismatch?
4. Should we use a local worker from node_modules instead of CDN to avoid version drift?
5. Is the worker initialization SSR-safe? (Next.js specific concern)

---

### Open Architecture Questions

1. Does the tool depend on any auth/session from the main app? If someone isn't logged in, can they access `/tools/pdf-filter`?
2. What shared providers or contexts does the tool assume exist? (layout wrappers, theme, etc.)
3. The DashboardSidebar.tsx and BaseNavbar.tsx modifications — do these affect any other routes? Are they safe?
4. Is ANTHROPIC_API_KEY set in the EasyPanel environment for the vision API route?

---

### Priority Order (Chat Claude's recommendation)

1. **FIX THE WORKER ERROR** — tool is completely broken without this
2. **Verify sidebar/navbar changes** — make sure main app isn't affected
3. **Smoke test with a real PDF** — even a 50-page one, just prove the pipeline works end to end
4. **Extract components to separate files** — 1400 lines is too much for iteration
5. **Load test with a large PDF** — 500+ pages, check memory, lazy loading, virtualization
6. **Test vision pipeline** — requires ANTHROPIC_API_KEY, test with ~20 drawing pages

---

### How To Use This File

**IDE Claude:** Read this file at the start of every PDF Triage task. Write your findings, status updates, and questions in a new dated section at the bottom. Be specific — file names, line numbers, error messages.

**Chat Claude:** Will review IDE Claude's entries when Ahmad shares them. Will add architecture guidance, spec clarifications, and review notes in new sections.

**Ahmad:** You're the relay and the decision-maker. When we disagree, you call it.

---

## IDE CLAUDE — WRITE BELOW THIS LINE

---

## 2025-02-11 11:12 UTC+1 — FULL AUDIT REPORT (from IDE Claude)

### Worker Bug — Root Cause & Fix

**Root cause:** `pdf-utils.ts:4` pointed to `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.624/pdf.worker.min.mjs`. That URL returns 404 — cdnjs doesn't host the `.mjs` worker for pdfjs-dist v5.4.624.

**There is NO version mismatch.** `package.json` declares `^5.4.624`, installed version is `5.4.624`, and the CDN URL referenced `5.4.624`. The problem is that cdnjs simply doesn't serve the `.mjs` format for this version.

**Fix applied in commit `26a345af` (pushed to `phase2/product-database`):**
- Copied `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` (1.07MB) to `public/pdf.worker.min.mjs`
- Changed `workerSrc` to `"/pdf.worker.min.mjs"` — self-hosted, zero CDN dependency

**Remaining risk:** Static copy in `public/` will drift if `pdfjs-dist` is updated. Needs a postinstall script or sync comment.

### File Inventory (8 files, 2229 lines total)

| File | Lines | Purpose |
|---|---|---|
| `page.tsx` | 17 | Route wrapper — `"use client"` + dynamic import `ssr: false` |
| `PdfFilterClient.tsx` | 1401 | Main client — all 4 phases, DnD, cards, rows |
| `lib/pdf-utils.ts` | 128 | Worker init, text extraction, thumbnails, PDF rebuild |
| `lib/scoring.ts` | 187 | Classification, keyword scoring, threshold split |
| `lib/pdf-vision.ts` | 184 | Vision batching, cost estimation, confidence split |
| `lib/keyword-presets.ts` | 100 | 8 keyword categories, 170+ terms |
| `lib/drawing-categories.ts` | 74 | 9 drawing categories, defaults, labels |
| `api/tools/pdf-vision/route.ts` | 138 | Server-side Anthropic Claude Haiku endpoint |

### Dependency Check — All Clean

- `pdfjs-dist@^5.4.624` — installed `5.4.624`, no peer deps, imported correctly in `pdf-utils.ts`
- `pdf-lib@^1.17.1` — imported correctly in `pdf-utils.ts`
- `@dnd-kit/core@^6.1.0` — installed `6.3.1`, imported in `PdfFilterClient.tsx`
- `@dnd-kit/sortable@^8.0.0` and `@dnd-kit/utilities@^3.2.2` — declared but not yet used (DnD uses core only currently)
- No peer dependency conflicts found

### Runtime Check

**Worker init (SSR safety):** ✅ Safe. `page.tsx` uses `dynamic(() => import("./PdfFilterClient"), { ssr: false })`. The `pdf-utils.ts` module (which sets `GlobalWorkerOptions.workerSrc` at module scope and calls `document.createElement("canvas")`) is only ever loaded client-side.

**Scoring dependency on pdf.js:** ✅ None. `scoring.ts` is pure TypeScript — takes `string[]` and `string[]`, returns classification. Zero coupling to pdfjs-dist.

**Vision API key:** ⚠️ `ANTHROPIC_API_KEY` is NOT in any local `.env` file. The route (`route.ts:7-13`) reads `process.env.ANTHROPIC_API_KEY` and returns 500 with clear error if missing. **Ahmad needs to verify this is set in EasyPanel env vars.** Text pipeline works without it — only drawing analysis needs it.

**Client flow break points:**
1. ~~Worker load~~ → Fixed
2. Missing API key → Drawing tab will 500 (clear error, not silent)
3. `alert()` for errors (lines 165, 288) → Functional but poor UX
4. Large PDFs → Batched extraction + lazy thumbnails should handle it, untested at scale

### Integration Check

**Sidebar (`DashboardSidebar.tsx:26-28`):** Added `toolsMenuItems` array with PDF Filter link at `/tools/pdf-filter`. Merged into `allItems` at line 38. Visible to all users (not admin-gated). ✅ Correct.

**Navbar (`BaseNavbar.tsx:43`):** Added `pathname.startsWith("/tools")` to the `isEditor` condition that returns `null`. Hides navbar on all `/tools/*` routes. ✅ Correct but broad — any future `/tools/*` route inherits this.

**Route setup (`page.tsx`):** `"use client"` directive + `dynamic` with `ssr: false`. ✅ Correct pattern for browser-only deps in Next.js App Router.

**`next.config.js`:** Has `fs: false, path: false` fallbacks for client-side webpack. No special handling needed for pdfjs-dist since we're using the self-hosted worker approach. ✅ No conflicts.

### Open Questions for Ahmad

1. Is `ANTHROPIC_API_KEY` set in EasyPanel environment variables?
2. Has the deployment rebuilt from commit `26a345af`?
3. Does `/tools/pdf-filter` require auth? (The route has no middleware protection — anyone with the URL can access it. The sidebar only shows for logged-in users, but the route itself is open.)

### Status: Awaiting deployment rebuild verification.

---

## 2025-02-11 11:23 UTC+1 — VISION MODEL SWAP: Anthropic Haiku → Kimi K2.5 (from IDE Claude)

### What Changed

**Reason:** Ahmad directed swap from Claude Haiku to Kimi K2.5 by Moonshot AI. Cheaper vision pricing ($0.60/M input vs Haiku's rates), OpenAI-compatible API.

### Files Modified

**`app/api/tools/pdf-vision/route.ts`** — Full API call rewrite:
- Endpoint: `https://api.anthropic.com/v1/messages` → `https://api.moonshot.ai/v1/chat/completions`
- Auth: `x-api-key` header → `Authorization: Bearer` header
- Env var: `ANTHROPIC_API_KEY` → `KIMI_API_KEY`
- Model: `claude-3-5-haiku-20241022` → `kimi-k2.5`
- Image format: Anthropic `source.type/media_type/data` → OpenAI `image_url.url` with data URI
- Request body: Anthropic messages format → OpenAI chat completions format with system message
- Response parsing: `data.content[0].text` → `data.choices[0].message.content`
- Added `temperature: 0.6` and `extra_body: { thinking: { type: "disabled" } }` for instant mode
- All error messages updated from "Anthropic" to "Kimi"

**`app/tools/pdf-filter/lib/pdf-vision.ts`** — Cost estimation:
- Removed Haiku/Sonnet model selector (was unused in UI anyway)
- Single model: Kimi K2.5 at $0.0004/image estimate
- `modelName` now returns `"Kimi K2.5"` (UI reads this dynamically)

### What Did NOT Change
- The vision prompt content (`buildVisionPrompt`) — identical classification instructions
- All client-side code in `PdfFilterClient.tsx`
- All batching logic, AbortController, confidence zones
- All result parsing and JSON extraction from model response
- All drawing category definitions

### Security
- API key stored in `.env.local` (gitignored) for local dev
- Production: Ahmad needs to set `KIMI_API_KEY` in EasyPanel environment variables
- Key is NOT hardcoded in source code

### Action Required from Ahmad
1. Set `KIMI_API_KEY` in EasyPanel environment variables
2. Remove `ANTHROPIC_API_KEY` from EasyPanel if it was set (no longer used by this tool)