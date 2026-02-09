# ANC Proposal Engine — Claude Code Rules

## CORE RULE 1 — ZERO BULLSHIT ENGINEERING

This system does not tolerate fake work, lazy shortcuts, or dishonest engineering.

### ABSOLUTE RULES (VIOLATION = REJECTION)

1. **NO FAKE FUNCTIONALITY** — No simulated behavior, no mocked responses, no "thinking" animations, no pretending something works when it doesn't. If it's not real, it does not exist.
2. **NO PLACEHOLDERS DISGUISED AS FEATURES** — No stubs shown to users, no TODO logic exposed as real, no "coming soon" features that partially run. Unbuilt means invisible.
3. **NO ERROR MASKING** — Never hide failures behind friendly messages, never swallow or soften errors. Show the actual error, even if it's ugly.
4. **NO LAZY HACKS** — No duct tape, no "temporary" fixes with no expiry, no shortcuts to avoid proper architecture. If it needs to be built, build it correctly.
5. **NO PROBLEM SWEEPING** — Don't patch symptoms, don't defer structural flaws, don't silence bugs. Fix the root cause or don't touch it.
6. **REAL OR NOTHING** — Real AI responses, real data, real integrations, real behavior. Illusions are forbidden.
7. **HACKS: RARE, DEFENSIBLE, AND IMPRESSIVE** — Hacks are allowed only if the constraint is real and external, the hack is technically honest and clever (not evasive), and you would be proud to explain it to a senior engineer.

## CORE RULE 2 — ENTERPRISE-GRADE ONLY

We build enterprise-grade only. If asked for lower quality, refuse and propose the closest enterprise-grade solution.

1. **ENTERPRISE-GRADE ONLY** — Deliver only enterprise-grade, production-ready work — secure, reliable, maintainable, testable, observable, and compliant with best practices. No shortcuts, no "quick hacks," no brittle or undocumented solutions.
2. **REFUSE LOW QUALITY** — If asked for anything intentionally lower quality (temporary fix, messy code, skipping error handling/tests, hardcoding secrets, ignoring edge cases, "ship it" without verification), you must refuse.
3. **UPGRADE THE REQUEST** — After refusing, propose the best enterprise-grade alternative that still meets the business goal. If tradeoffs exist, present 1–3 options and recommend the most robust.
4. **QUALITY GATE** — Before finalizing, ensure: correctness and edge-case handling, security best practices (no secrets, least privilege, safe inputs/outputs), clear structure and maintainability, appropriate tests/verification steps, logging/observability where relevant, safe deployment/rollback considerations when applicable.
5. **EXPLAIN IMPROVEMENTS** — Briefly explain what you changed compared to the "lower-quality" ask and why it makes it enterprise-grade.

## WORKFLOW RULE — PRODUCTION IS THE TRUTH

- **No local dev.** Code → commit → push → EasyPanel auto-builds. That's it.
- If it's not in GitHub, it does not exist.
- Production is the only source of truth. "It works locally" doesn't count.
- **NEVER merge branches without explicit command.** Merging requires 3 confirmations.
- **Branch:** `phase2/product-database` — never merge into `rag` or vice versa.

## STACK

- Next.js 15.3, React 18, TypeScript, Prisma + PostgreSQL
- shadcn/ui, Tailwind, AG Grid, Framer Motion
- AnythingLLM RAG, Browserless PDF
- GitHub: khaledbashir/rag2 | VPS: 138.201.126.110
