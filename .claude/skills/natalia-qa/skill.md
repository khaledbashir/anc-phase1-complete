---
description: Run Natalia Kovaleva's design QA checklist against PDF templates before deploying. Use when asked to "review as Natalia", "run QA", or before any PDF/template change.
---

# Natalia QA Agent — "Designer Natalia"

## Purpose
Simulate Natalia Kovaleva's design review before showing ANY PDF output to her.

## Key Files to Check
- `app/components/templates/proposal-pdf/ProposalTemplate5.tsx` — main template
- `app/components/templates/proposal-pdf/NataliaMirrorTemplate.tsx` — mirror mode template
- `app/components/templates/proposal-pdf/ProposalLayout.tsx` — global layout/CSS
- `app/components/templates/proposal-pdf/MirrorPricingSection.tsx` — pricing tables
- `app/components/templates/proposal-pdf/BaseBidDisplaySystemSection.tsx` — base bid
- `app/components/templates/proposal-pdf/exhibits/ExhibitA_SOW.tsx` — SOW exhibit
- `app/components/templates/proposal-pdf/exhibits/ExhibitB_CostSchedule.tsx` — cost exhibit
- `services/proposal/server/generateProposalPdfServiceV2.ts` — PDF generation service

## Checklist Categories
1. **Spacing & Density** — Her #1 complaint. Always "tighter". SOW < pricing < specs font sizes.
2. **Typography** — Work Sans everywhere. Bold = display names only. Brand = #0A52EF.
3. **Numbers** — Whole numbers only (no .00). Math must match Excel exactly. No double-counting.
4. **Section Headers** — ALL identical: blue slash + thin line. No big blue boxes.
5. **Header/Footer** — Small header. Footer = www.anc.com + page number only. Lines must match width.
6. **Redundant Text** — No "Summary", "Display", "Base" prefixes, helper text, or instructional copy.
7. **PDF Structure** — Budget (no sig/payment), Proposal (no sig/payment), LOI (full legal).
8. **Specs** — No ghost rows, no "Margin Analysis", brightness hidden if empty.
9. **Pricing** — Mirrors Excel exactly. Alternates separate. $0 items hidden.
10. **Resp Matrix** — Short=bullets, Long=table. Called "Statement of Work". After specs.
11. **Page Breaks** — No whitespace gaps. Content flows naturally. Only signature avoids breaks.
12. **Editability** — Display names, prices, descriptions, notes, payment terms all editable.

## Her Priority Order
1. Math accuracy (instant trust killer)
2. Page count / tightness
3. Correct PDF structure for mode
4. No redundant/ghost content
5. Font and branding consistency
6. Editability works
7. Visual polish

## Anti-Patterns
- Never show "Coming Soon" features
- Always tell her Ctrl+Shift+R (she never clears cache)
- Never change a design she already approved
- Keep status updates to 3-4 bullets max
- Never add helper text to client-facing PDFs
