# ANC AI Operations — Feature Checklist

> Master checklist of all AI-powered features to build. Work through one at a time.

---

## 1. SMART PDF FILTER — "The Noise Killer"

- [x] **1A. Document Skeleton Scanner** — Structural scan of uploaded PDFs (type, sections, parties, dates, relevance breakdown by 🔴🟡⚪)
- [x] **1B. Smart Extraction** — Extract only high-value content (displays/specs, pricing, timeline, scope, requirements). Skip boilerplate.
- [x] **1C. Relevance Scoring API** — Classify each PDF section into category + relevance score (1-10). JSON output for pipeline use.

---

## 2. RFP INTAKE PROCESSOR

- [x] **2A. Client RFP Analyzer** — Parse RFP into structured brief: client overview, display requirements table, deadlines, scope, forms/compliance, evaluation criteria, red flags, recommended past projects.
- [x] **2B. RFP Completeness Checker** — Gap analysis between original RFP and ANC's draft response. Status per requirement (✅ addressed / ⚠️ partial / ❌ missing / 📋 form needed / ❓ clarification).

---

## 3. PROJECT LIBRARY & AUTO-SELECTOR

- [x] **3A. Case Study Tagger** — Catalog past ANC projects into structured JSON (location, display tech, services, industry tags, differentiators).
- [x] **3B. Auto-Select Past Projects** — Given an RFP summary, recommend 2-4 best-fit past projects with talking points and positioning.

---

## 4. SPEC LOOKUP & PRODUCT DATABASE

- [x] **4A. Display Spec Calculator** — Given pixel pitch + dimensions + indoor/outdoor, calculate resolution, pixel count, power, weight, electrical, cabinet count. Output ready for Form 1.

---

## 5. PRICING STRUCTURE TEMPLATES

- [x] **5A. Pricing Breakdown Generator** — Generate ANC-standard pricing table per display location (LED product, structural, electrical, PM, submittals, tax, bond, alternates). Summary table at top.

---

## 6. SCHEDULE TEMPLATE GENERATOR

- [x] **6A. Installation Schedule Builder** — Generate phased project schedule (Design → Manufacturing → Integration → Installation → Closeout) with dates, durations, dependencies per display location.

---

## 7. WARRANTY & SERVICE PROPOSAL GENERATOR

- [x] **7A. Warranty Package Builder** — Generate warranty/service proposal: monitoring, preventative maintenance, SLA response times, spare parts, pricing tiers (5yr base / 10yr extended / white glove).

---

## 8. ANYTHINGLLM CONVERSATION STARTERS

- [x] **8A. Estimator Quick-Start Prompts** — Pre-built prompts for Matt/Jeremy/Natalia to use in the copilot (RFP intake, pricing, past projects, gap analysis, scheduling).

---

## 9. CONTENT & LIVESYNC TEMPLATES

- [x] **9A. LiveSync Boilerplate Generator** — Generate venue-type-specific LiveSync CMS descriptions for proposals (transit/sports/commercial/entertainment).

---

## 10. ANC AI SYSTEM PROMPT

- [x] **10A. Master System Prompt** — Base system prompt for any Claude/AnythingLLM instance working on ANC projects. Covers company context, role, standards, and guardrails.

---

## Implementation Notes

- Each item above is a standalone feature — build and ship one at a time
- Features go into **both** AnythingLLM (as skills/system prompts) **and** the app UI (as quick actions)
- Full prompt text for each feature is in the project lead's prompt library doc
- Priority order: TBD by project lead per sprint
