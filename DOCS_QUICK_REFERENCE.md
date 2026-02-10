# ANC Documentation Quick Reference

## When to Use Each Skill/File

| Skill/Skill Name | Use When... | File Path |
|------------------|-------------|-----------|
| **anc-bible** | Starting ANY ANC conversation; need architecture, file locations, deployment info | `.claude/skills/anc-bible/SKILL.md` |
| **natalia-rules** | Working on Mirror Mode, PDF templates, Excel parsing, or proposal output | `.claude/skills/natalia-rules/SKILL.md` |
| **test-playbook** | After deploying; asked to "run tests" or "verify production" | `.claude/skills/test-playbook/SKILL.md` |
| **excel-file-registry** | Testing Excel parsing; need to know expected totals/tables for test files | `.claude/skills/excel-file-registry/SKILL.md` |
| **intelligence-mode** | Building quotes from scratch; working with Step3Math, margins, audit tables | `.claude/skills/intelligence-mode/SKILL.md` |
| **product-catalog** | Working with LED products database, product matching, admin UI | `.claude/skills/product-catalog/SKILL.md` |
| **handoff-templates** | Reporting status to Ahmad; requesting approval; blocked on something | `.claude/skills/handoff-templates/SKILL.md` |
| **anythingllm-skill-builder** | Creating AnythingLLM custom agent skills (plugin.json + handler.js) | `.claude/skills/anythingllm-skill-builder/SKILL.md` |

## Critical Commands

```bash
# Load a skill (use in conversation with AI)
/load-skill anc-bible
/load-skill natalia-rules
/load-skill test-playbook

# Or reference directly: "Check SKILL.md for natalia-rules"
```

## Test Files (for reference)

| File | Expected Total | Tables | Mode |
|------|----------------|--------|------|
| `ANC_Indiana Fever LED Displays LOI_1.26.2026.xlsx` | $2,237,067.64 | 8 | LOI |
| `Cost-Analysis---Indiana-Fever-audit (3).xlsx` | $507,262.53 | 1 | Any |
| `Copy of Cost Analysis - SBA PH4 - 2026-01-28.xlsx` | CAD, 13% tax | 7 | Budget |

## Key File Paths (Copy-Paste Ready)

```
# Parsers
services/pricing/pricingTableParser.ts          # Mirror Mode
services/proposal/server/excelImportService.ts  # Intelligence Mode

# PDF
services/proposal/server/generateProposalPdfServiceV2.ts
app/components/templates/proposal-pdf/ProposalTemplate5.tsx

# State
contexts/ProposalContext.tsx
contexts/ChargesContext.tsx
contexts/SignatureContext.tsx

# Wizard
app/components/proposal/form/wizard/WizardProgress.tsx
app/components/proposal/form/wizard/WizardNavigation.tsx
app/components/proposal/form/wizard/steps/Step1Ingestion.tsx
app/components/proposal/form/wizard/steps/Step2Intelligence.tsx
app/components/proposal/form/wizard/steps/Step3Math.tsx
app/components/proposal/form/wizard/steps/Step4Export.tsx
```

## Branch Policy

```
rag                        - One purpose
phase2/product-database    - Deploy branch (EasyPanel watches this)

NEVER merge. Always push to current branch.
```

## Deployment

```
Production: https://basheer-natalia.prd42b.easypanel.host
Local dev:  http://localhost:3003
Deploy to:  phase2/product-database
```

## Natalia's 6 Golden Rules (Mirror Mode)

1. NO MATH — Use Excel totals exactly
2. Exact section order
3. Exact row order
4. Show alternates
5. Show tax/bond even if zero
6. Trust Excel's grand total

---

## AnythingLLM Skill Builder

When you need to create a custom AnythingLLM agent skill, load **anythingllm-skill-builder**.

**What it creates:**
- `plugin.json` — Metadata, params, setup args
- `handler.js` — Runtime logic
- `README.md` — Documentation

**Your AnythingLLM setup:**
- Service: `basheer / anything-llm`
- API URL: `https://basheer-anything-llm.c9tnyg.easypanel.host/api/v1`
- Skills path: `/app/server/storage/plugins/agent-skills/`
- Hot reload: No restart needed — just refresh page

**Say to use:**
```
"Create an AnythingLLM skill that..."
"Build a custom agent skill for AnythingLLM"
"Load anythingllm-skill-builder"
```

---

**Pro tip:** Start every ANC conversation by loading `anc-bible` first, then load other skills as needed.
