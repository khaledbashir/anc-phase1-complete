# Core Rules — NON-NEGOTIABLE

## Rule 1: No Fake Shit
- NEVER add fake/simulated functionality (fake thinking animations, placeholder responses)
- NEVER use fallback messages that hide real errors — show the actual error
- NEVER use placeholders that pretend to be real features
- NEVER sweep problems under the rug with quick fixes or lazy hacks
- If a feature isn't ready, don't fake it. Build it or don't show it.
- Everything the user sees must be REAL — real AI responses, real data, real functionality

## Rule 2: Build Products, Not Code
- Architecture-first: data model → UI → rendering. Never code-first.
- Go full-send on the first pass. Don't build incremental MVP garbage and iterate — design the whole product, then build it.
- Data-driven > hardcoded. Separate data from rendering (venueZones.ts pattern).
- Don't fight technical fires for 3 rounds when you could step back, rethink, and build it right in one pass.

## Rule 3: Post-Task Report (MANDATORY)
After EVERY completed task, end with:
- **What We Did** (1-3 sentences)
- **What Users Can Now Do** (bullet points)
Never skip this. Standing user rule.

## Rule 4: Two Modes — Know the Difference
### Mirror Mode (Natalia)
- Excel → exact PDF reproduction
- Parser: `services/pricing/pricingTableParser.ts`
- **6 Golden Rules:** No math, exact order, trust the grand total, don't recalculate, don't reorder, don't guess
- If Natalia's Excel says the total is $500K, the PDF says $500K. Period.

### Intelligence Mode (Matt/Jeremy)
- Build proposals from scratch with calculations
- Parser: `services/pricing/excelImportService.ts`
- Uses `intelligenceMathEngine.ts` for margin/pricing math
- Margin formula: `sellingPrice = cost / (1 - marginPercent)`

## Rule 5: Don't Over-Engineer
- Only make changes that are directly requested or clearly necessary
- Don't add features, refactor code, or make "improvements" beyond what was asked
- Don't add docstrings, comments, or type annotations to code you didn't change
- Three similar lines of code is better than a premature abstraction
