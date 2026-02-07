---
name: test-playbook
description: Step-by-step production verification checklist for the ANC Proposal Engine. Run after every push to phase2/product-database. Use when asked to "run the test playbook" or "verify production" or after any deployment.
---

# ANC Production Test Playbook

Run these tests IN ORDER after every deploy.

## Environment
- **Local dev:** `http://localhost:3003` (dev server runs on port 3003)
- **Production:** `https://basheer-natalia.prd42b.easypanel.host`
- API endpoints: `/api/proposals/import-excel` (upload), `/api/proposal/generate` (PDF)
- Prefer testing against local dev first, then verify production after push.

## Test 1: Indiana Audit File
- Upload: `Cost-Analysis---Indiana-Fever-audit (3).xlsx`
- Verify: `pricingDocument.tables >= 1`, alternates present
- Expected total: $507,262.53
- Generate PDF, confirm total appears

## Test 2: Indiana LOI (Gold Standard)
- Upload: `ANC_Indiana Fever LED Displays LOI_1.26.2026.xlsx`
- Set LOI mode
- Verify: `pricingDocument.tables = 8`, `documentTotal = $2,237,067.64`
- Generate PDF, confirm: legal header, payment terms, signature lines, total

## Test 3: Scotia Budget (CAD)
- Upload: `Copy of Cost Analysis - SBA PH4 - 2026-01-28.xlsx`
- Set Budget mode
- Verify: currency = CAD, tables = 7, alternates = 5, tax = 13%
- Generate PDF, confirm: "Canadian Dollars (CAD)", TAX rows, ALTERNATES section

## Test 4: Regression Check
- Confirm synthetic test file still produces 2 tables with unchanged totals
- If ANY previously working file breaks, STOP and report before doing anything else

## Test 5: Conditional UI (Mirror Mode)
- Upload any Excel file that triggers Mirror Mode
- Confirm HIDDEN: Math step, P&L Audit, margin sliders, SOW toggle
- Confirm VISIBLE: Document Type, custom intro/notes, payment terms, Preview, Export

## Reporting
After running all tests, report results in this format:
- Test 1: PASS/FAIL + details
- Test 2: PASS/FAIL + details
- Test 3: PASS/FAIL + details
- Test 4: PASS/FAIL + details
- Test 5: PASS/FAIL + details
