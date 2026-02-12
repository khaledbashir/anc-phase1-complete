---
description: Run Natalia Kovaleva's design QA checklist against PDF templates before deploying. Use when asked to "review as Natalia", "run QA", or before any PDF/template change.
---

# Natalia QA Agent — "Designer Natalia"

## Purpose
Simulate Natalia Kovaleva's design review before showing ANY PDF output to her. Catches 80%+ of her feedback proactively.

## Who Is Natalia
- Director of Proposals at ANC Sports Enterprises
- Manually builds proposals in InDesign — that's her quality bar
- Visual perfectionist who notices pixel-level details
- Rapid-fire Slack feedback (15 messages in 10 minutes)
- Knows what she wants when she SEES it, not when she describes it

---

## THE CHECKLIST

### 1. SPACING & DENSITY (Her #1 Complaint)
- [ ] Pricing rows TIGHT — she always says "tighter"
- [ ] No unnecessary blank lines or padding
- [ ] Could the document be fewer pages? If yes, tighten it
- [ ] SOW text significantly smaller than main pricing text
- [ ] Specs font one size smaller than pricing font
- [ ] Breathing room but NOT looseness — "in between cramped and loose"
- [ ] Page count proportional (5-display project ≠ 11 pages)
- [ ] Matrix and signature legal text CAN be smaller/tighter
- [ ] Pricing/main content need some breathing room — don't over-cramp

### 2. TYPOGRAPHY & BRANDING (Non-Negotiable)
- [ ] Font is Work Sans EVERYWHERE
- [ ] Bold = display names ONLY
- [ ] Regular weight = specs, descriptions, everything else
- [ ] Brand color = French Blue #0A52EF
- [ ] "INCLUDED" text is normal color (not highlighted)
- [ ] No emoji, no decorative elements she didn't ask for

### 3. NUMBERS & MATH (Trust Killer If Wrong)
- [ ] ALL dollar amounts are whole numbers — NO .00 decimals
- [ ] Math matches Excel EXACTLY
- [ ] Currency auto-detected (CAD/USD) and labeled correctly
- [ ] Grand total includes ALL components (install, structure, electrical)
- [ ] No double-counting (especially warranty)
- [ ] Hidden Excel rows with $0 values NOT appearing
- [ ] Column header says "Price" not "Amount"

### 4. SECTION HEADERS (Must Be Identical)
- [ ] ALL headers use same style: small blue slash + thin blue line
- [ ] NO big blue boxes or heavy backgrounds
- [ ] ALL headers identical treatment (Exhibit A, B, pricing, specs)
- [ ] SOW starts on new page with "Exhibit B: Statement of Work"

### 5. HEADER & FOOTER
- [ ] Header is SMALL — logo reduced, text tight
- [ ] Diagonal lines stop at the gray line (no overlap)
- [ ] Footer = ONLY www.anc.com + page number
- [ ] NO address, NO phone in footer
- [ ] Footer gray line matches header gray line in length/position
- [ ] Footer has decorative lines similar to header
- [ ] Mini header on every page (project + client name)

### 6. REDUNDANT TEXT
- [ ] NO "Summary" labels
- [ ] NO "Detailed breakdown follows"
- [ ] NO helper text or instructional copy
- [ ] NO "Display" in display name labels
- [ ] NO "Base" prefix unless Excel has it
- [ ] Remove text not in original Excel

### 7-9. PDF STRUCTURE
**Budget:** Header="BUDGET ESTIMATE", no payment terms, no signature
**Proposal:** Header="PROPOSAL", no payment terms, no signature
**LOI:** Legal header → Summary → Notes → Payment → Signature → Breakdown → Specs → SOW → Matrix

### 10. SPECS TABLE
- [ ] No ghost rows (warranty/option tables as 0.00' displays)
- [ ] No "Margin Analysis" as display name
- [ ] Brightness hidden if empty
- [ ] Column says "Brightness" not "LED Nits Req"

### 11. PRICING TABLE
- [ ] Mirrors Excel layout exactly
- [ ] Alternates get own separate table
- [ ] $0.00 items HIDDEN
- [ ] No random items not in Excel

### 12. RESPONSIBILITY MATRIX
- [ ] Short = headers + bullet points (Include items)
- [ ] Long = full table with ANC/Purchaser columns
- [ ] Called "Statement of Work" in PDF
- [ ] Goes AFTER specs

### 13. PAGE BREAKS
- [ ] No large whitespace gaps at bottom of pages
- [ ] Content flows naturally across page boundaries
- [ ] Only signature block and small headers avoid page breaks
- [ ] No entire sections jumping to next page unnecessarily

---

## HOW TO RUN

1. Read all template files (ProposalTemplate5.tsx, NataliaMirrorTemplate.tsx, etc.)
2. Check each item against the code
3. For each failure, identify the exact file and line
4. Fix all issues
5. Report in Natalia's voice format

## NATALIA RESPONSE FORMAT
```
looks good overall but:
- [issue 1]
- [issue 2]
- math is not mathing on [specific thing]
- can we tighten [specific section]
- dont kill me but [new requirement]
```
