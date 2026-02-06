# Approved shit

Items you’ve approved this session. One source of truth.

---

## Workflow improvements (templates, comparison, versioning) — 3-line summary

- **Templates:** Save current proposal as a named template (e.g. “School district AV”) and start new ones from it so you don’t redo structure and defaults every time.
- **Comparison:** Side‑by‑side view of two proposals or two versions (e.g. Budget vs Proposal, or v1 vs v2) so you can diff line items, totals, and narrative without flipping tabs.
- **Versioning:** Every save creates a version (with optional label like “Pre-review” or “Final”); you can list versions, restore any one, and optionally compare any two—so you never lose a prior state and can roll back or branch.

---

## Master Truth: AI & product (from PRD, transcripts, Strategic QA)

### Pains and stakeholders
- **#1 pain:** Manual drudgery + data-entry risk (scouring 2,500+ page RFPs, re-typing Excel → InDesign). Secondary: slow turnaround; trust → **Blue Glow** + **Trust but Verify** = **P0**.
- **They = internal ANC:** Natalia (Ferrari PDF, zero math, speed), Jeremy (RFP parsing, Division 11), Eric (catalog, module matching), Alison (French Blue, 2025 Identity).

### Demo target: 17/20 extraction + gap fill
1. Ingest massive PDF (e.g. Jacksonville Jaguars RFP).
2. Auto-fill **17 of 20** fields correctly.
3. Stop at missing field → **Gap Fill** chat (e.g. “Is this front or rear service?”).
4. **Block export** until gap filled (“Natalia Gatekeeper”).

### Architecture (locked)
- **AnythingLLM only** — workspaces + vector DB for audit trail and context isolation; no direct OpenAI/Anthropic.
- **One workspace per PROJECT** (Proposal lives inside). All AI (AiWand, Sidebar) must use **current project’s `aiWorkspaceSlug`** — no global workspace (data leakage risk).

### P0 requirements
- **Citations:** Every AI-extracted field shows `[Source: Section X, Page Y]` in Intelligence Sidebar or tooltip on Blue Glow field.
- **AiWand:** Must use current project workspace (not global).

### The 20 (PRD 6.2)
Screen Name, MM Pitch, Quantity, Active Height, Active Width, Pixel Res H/W, **Brightness** (not Nits), Structural Tonnage, Location/Zone, Service Type, Application, + financial (Margin, Tax, Bond, etc.).

### Division 11
- **Primary:** 11 06 60 / 11 63 10 for LED. **Also:** Division 27 (sound), Division 26 (lighting) when in scope.

### Ferrari rules (approved set)
French Blue (#0A52EF) only; Work Sans (700/600); 100vh, 50/50 Hub/Anchor; “Brightness” not “Nits”; no `$0.00` → `[PROJECT TOTAL]`; 55° slash on PDF covers.

### Roadmap
- **Smart Ingest:** HIGH — find Division 11 / Display Schedule pages in 2,500-page PDFs, embed only those.
- **Vision:** MVP = text/OCR to find drawing *page* (e.g. “AV-101”); no geometry interpretation yet.
- **Main AI surface:** RFP extraction (Populate); Sidebar = Gap Fill + ad-hoc only (not command bar).

---

## Master Truth: Smart Filter, Vision, Extraction (Jacksonville / WVU / Alfond directives)

### Smart filter
- **Must-keep phrases:** Division 11, 11 06 60, 11 63 10, Display Schedule, **Exhibit B**, **Cost Schedule**, **Bid Form**, **Thornton Tomasetti**, **Division 26**, **Division 27** (sports lighting, sound). WVU: pricing in Exhibit B; structural tonnage in TTE reports; 27 41 16.64, 26 51 13 in scope.
- **Page limits (embedding cap):** After filtering, we embed at most **100–150 pages** (and 450k characters) into AnythingLLM — not “we only read 100 pages of your 2,500.” The full RFP is scanned/scored; only the best (Division 11, Exhibit B, drawings, etc.) are kept, then capped so RAG stays fast and accurate. Original doc can be 2,500+ pages; we intentionally drop the rest (noise).
- **Division 26/27:** Always keep (ANC scope includes sound + sports lighting).

### Vision (drawings)
- **Drawing pages to scan:** 8–10 (Jeremy needs AV + A sheets for Center Hung, Ribbons, structural details).
- **When vision off:** Show UI warning: *"Vision disabled: Drawing analysis skipped. Please manually verify structural constraints."*
- **Search description:** Look for sheet labels **AV** / **A**; identify **Elevation**, **Structural Attachment**, **Center Hung**, **Ribbon** (connection of provider equipment to project structure).

### Boss-level extraction
- **Citation shape:** Object shape `{ value, citation }` for every field (P0 for Trust but Verify; RAG Sidebar / Blue Glow tooltip).
- **Missing fields:** Return `null` (explicit missing) so frontend triggers Gap Fill and blocks export.
- **Brightness:** Store as **number**; display label always **"Brightness"** (never "Nits").

### End-to-end
- **Multi-file:** Support many PDFs per project (Jacksonville folder: Volume 1, Volume 3, Addendums, BIM). Ingest folder and query across.
- **Progress:** Show progress (e.g. “Scanning for Division 11…”) for trust.
- **Re-extract:** Support “Re-extract” without re-upload (e.g. after prompt improvements). Implemented: `POST /api/rfp/extract`, RE-EXTRACT button in Intelligence Sidebar.

### Demo priority (lock first)
1. Citation shape (source linking) — P0. **Done:** Citations in UI (tooltip on Blue Glow fields + “Sources” in Intelligence Sidebar).
2. Division 11 & Cost Schedule filtering — P0.
3. Brightness nomenclature — P0.

### Explicitly out of scope
- **Export gate (blocking export):** Do NOT add anything that prevents exporting. No blocking PDF export or approval based on gaps. User: scratch anything that prevents exporting.
