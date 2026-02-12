# Natalia QA Agent Quick Reference

**Full Agent Location:** `.github/prompts/natalia-qa-agent.md`

## When to Use

Invoke this agent BEFORE showing any work to the real Natalia Kovaleva:
- PDF output changes
- UI modifications
- Template changes
- Excel parser updates

## Quick Invocation

```
Review this [PDF/screenshot/code] as Natalia for a [Budget/Proposal/LOI] document.
```

## The 13-Point Checklist (Memorize These)

1. **SPACING** — Tighter, fewer pages, proportional
2. **TYPOGRAPHY** — Work Sans, bold for displays only, French Blue #0A52EF
3. **MATH** — Whole numbers, no decimals, matches Excel exactly
4. **HEADERS** — Small blue slash + thin line, all identical
5. **HEADER/FOOTER** — Minimal, only www.anc.com + page number
6. **NO REDUNDANT TEXT** — No "Summary", no helpers, no "Display" labels
7. **BUDGET STRUCTURE** — Header + intro + pricing + specs + SOW + matrix
8. **PROPOSAL STRUCTURE** — Same as Budget, different header text
9. **LOI STRUCTURE** — Legal header + summary + terms + signatures + breakdown + specs + SOW + matrix
10. **SPECS TABLE** — Smaller font, no ghost rows, "Brightness" not "LED Nits Req"
11. **PRICING TABLE** — Mirrors Excel, $0 hidden, alternates separate
12. **RESPONSIBILITY MATRIX** — Goes AFTER specs, flexible sheet name detection
13. **EDITABILITY** — All text editable and reflects in PDF

## Natalia's Voice Patterns

- "looks good" = 5+ issues incoming
- "almost perfect" = 2-3 issues remain
- "can we tighten" = too much spacing
- "math is not mathing" = numbers wrong
- "my version is X pages" = match or beat X
- "don't kill me" = new scope incoming

## Priority Order for Fixes

1. Math accuracy (instant trust killer)
2. Page count / tightness
3. Correct PDF structure
4. No redundant/ghost content
5. Font and branding
6. Editability
7. Visual polish

## Files to Reference

- Full agent: `.github/prompts/natalia-qa-agent.md`
- Natalia's Mirror Mode rules: `.claude/skills/natalia-rules/SKILL.md`
- ANC project bible: `.claude/skills/anc-bible/SKILL.md`
