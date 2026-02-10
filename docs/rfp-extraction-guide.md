# ANC RFP Extraction System — User Guide

## Overview
The ANC Proposal Engine can automatically process large RFP PDFs (100+ pages) and extract structured data. It filters out ~60-70% noise (legal boilerplate, team bios, disclaimers) and analyzes only high-value content.

## Available Extraction APIs

### 1. Smart RFP Processor (POST /api/rfp/process)
What it does: Full document scan + AI-powered structured extraction
Input: PDF file (multipart/form-data), optional mode param ("scan" for instant structure-only, "full" for AI analysis)
Output: Section map with relevance scores, AI-generated brief with client overview, display requirements, deadlines, scope, forms, red flags
Best for: First pass on any new RFP — get the big picture fast

### 2. Form 1 Spec Extractor (POST /api/rfp/extract-specs)
What it does: Extracts display specifications from "Requirement Details" forms (Form 1a, 1b, Exhibit G)
Output: Structured specs per display — dimensions (ft), pixel pitch (mm), brightness (nits), power (watts), weight (lbs), hardware model, processing system
Best for: Auto-filling the proposal form with display specs instead of typing them manually

### 3. Pricing Section Mapper (POST /api/rfp/extract-pricing)
What it does: Detects distinct pricing sections and alternates/upsells
Output: Pricing sections with estimated totals, line item counts, tax/bond flags. Alternates with type (upgrade/deduct/add-on) and price differences.
Best for: Understanding the pricing structure before building the Excel cost analysis

### 4. Schedule & Warranty Extractor (POST /api/rfp/extract-schedule)
What it does: Extracts construction schedule phases and warranty/service terms
Output: Phases with durations, dates, tasks, dependencies. Warranty with base/extended years, response times, SLA, spare parts %, maintenance visits.
Best for: Building the project schedule and warranty proposal sections

## How It Works
- PDF text is extracted server-side (pdf-parse)
- Text is split into sections by headings
- Each section is scored by keyword heuristics (no AI cost):
  - PRICING, DISPLAY_SPECS = score 10 (highest)
  - SCOPE = 9, SCHEDULE = 8, REQUIREMENTS = 7
  - LEGAL = 2, BOILERPLATE = 1 (filtered out)
- Only high-value sections (score >= 5) are sent to AI
- Result: ~30 pages analyzed instead of 200

## Tips
- Upload the PDF once — all 4 extractors run in parallel
- Check the "Section Map" to see what was filtered and why
- If regex confidence is low, the system automatically falls back to AI
- Copy results directly into the proposal form
