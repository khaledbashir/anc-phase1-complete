# HANDOVER

## Repository Snapshot
- Branch: `phase2/product-database`
- Stack: Next.js 15, Prisma, PostgreSQL, Browserless/Puppeteer, AnythingLLM
- Core app code: `app/`, `services/`, `lib/`, `contexts/`, `hooks/`, `types/`

## Production-Critical Flow (Mirror Mode)
- Excel upload/import: `services/proposal/server/excelImportService.ts`
- Pricing parse: `services/pricing/pricingTableParser.ts`
- Proposal rendering: `app/components/templates/proposal-pdf/ProposalTemplate5.tsx`
- PDF generation: `services/proposal/server/generateProposalPdfServiceV2.ts`
- API namespace (canonical): `/api/proposals/*`

## Current State
- Placeholder/dev pages removed: `/analytics`, `/vision-demo`, `/test/ai-browser`
- Deprecated `/api/proposal/*` routes removed; `/api/proposals/*` is canonical
- `bcrypt` removed; `bcryptjs` retained
- Userback dummy identity removed; session-based payload used in layout
- Puter.js moved from global load to lazy load in Kimi vision path
- Sidebar shell centralized via `app/components/layout/AppShell.tsx`

## Known Gaps / Next Priorities
1. RBAC enforcement: `middleware.ts` still pass-through; enforce role-based route guards.
2. Feature flags: all disabled in `lib/featureFlags.ts`; enable only when fully production-ready.
3. Testing: add regression coverage for pricing parser and Excel import/export.
4. Rate limiting: add abuse controls on public and high-cost API endpoints.
5. Parser decomposition: split `pricingTableParser.ts` into smaller modules to reduce risk.

## Deploy/Run
- Dev: `pnpm dev`
- Build: `pnpm build`
- Typecheck: `pnpm exec tsc --noEmit`

## Operational Notes
- Keep docs minimal; update this file only for major architectural/status changes.
- If introducing new surface area, add tests and route-level auth controls in the same change.
