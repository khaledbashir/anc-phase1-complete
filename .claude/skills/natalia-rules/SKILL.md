---
name: natalia-rules
description: Natalia Kovaleva's exact requirements for Mirror Mode in the ANC Proposal Engine. Use whenever working on Mirror Mode, PDF templates, Excel parsing, or any feature that touches the proposal output. These rules override all other assumptions.
---

# Natalia's Rules (Mirror Mode)

These are direct quotes and requirements from Natalia Kovaleva, Director of Proposals. They are non-negotiable.

## The Golden Rule
"The task is to mirror whatever is here exactly... No calculation, no thinking."

## The Six Mirror Rules
1. NO MATH — Use Excel totals exactly, never recalculate
2. Exact section order — First section in Excel = first in PDF
3. Exact row order — Preserve line item sequence within sections
4. Show alternates — Don't filter rows containing "alternate"
5. Show tax/bond even if zero — Display all financial rows
6. Trust Excel's grand total — Use "SUB TOTAL (BID FORM)" value

## What Natalia Said
- "We don't look at [Cost/Margin columns]... whatever is here is what your engine will show"
- "Fix some typos if estimator makes any typo"
- "We will feed the program already calculated file and will just need the nice PDF"

## Column Visibility
- SHOW: Description, Selling Price (labeled "PRICING" or "AMOUNT")
- HIDE: Cost, Margin $, Margin %

## What Mirror Mode Must HIDE
- Strategic P&L Audit table
- Global Strategic Controls (margin slider, Std/Agg/Prem)
- Sales Tax / Bond Rate inputs
- Sales Quotation Items editor
- AI-generated SOW toggle
- MATH step entirely

## What Mirror Mode Must KEEP
- Document Type selector (Budget/Proposal/LOI)
- Custom intro/notes text
- Payment terms editor (LOI only)
- Preview + Export PDF

## Three Document Types
- Budget: Header says "BUDGET ESTIMATE", no signatures, no payment terms
- Proposal: Header says "SALES QUOTATION", no signatures, no payment terms
- LOI: Full legal header with addresses, payment terms, signature lines

## If In Doubt
Ask: "Would Natalia see this and say it doesn't match her Excel?" If yes, it's wrong.
