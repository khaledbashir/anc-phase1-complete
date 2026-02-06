# Natalia Verification + Auto-Fix: Executive Summary & Action Plan

**Date:** 2026-01-30  
**Status:** Ready for Implementation  
**Documents:** 
- [VERIFICATION_AUTO_FIX_DISCOVERY.md](./VERIFICATION_AUTO_FIX_DISCOVERY.md) - Complete discovery
- [VERIFICATION_ARCHITECTURE.md](./VERIFICATION_ARCHITECTURE.md) - Implementation guide

---

## Executive Summary

Natalia currently has a **robust but unverified** proposal pipeline. The system calculates correctly using the "Natalia Math Divisor Model" (Cost / (1 - Margin)), but lacks automated verification that source Excel totals match exported PDF totals. 

**The Solution:** A reconciliation system that:
1. ✅ **Verifies** all calculations at each pipeline stage
2. ✅ **Auto-fixes** 6/10 common issues without human intervention
3. ✅ **Flags** only true exceptions for human review
4. ✅ **Blocks** exports when critical issues are found
5. ✅ **Tracks** all verification data for audit trail

**Impact:** Reduce human review time from 30 minutes to <5 minutes per proposal, with 95% auto-verification rate.

---

## Problem Statement

### Current State

```
Excel Upload → Parse → Calculate → Export PDF
                                    ↓
                            ❌ NO VERIFICATION
                            ❌ NO RECONCILIATION
                            ❌ NO AUTO-FIX
                            ❌ NO AUDIT TRAIL
```

**Key Issues:**
1. **No Verification:** We don't check if Excel totals match our calculated totals
2. **No Auto-Fix:** Common issues (missing brightness, ALT rows) require manual handling
3. **No Audit Trail:** Can't trace discrepancies back to source
4. **No Blocking:** Can export PDF even with critical errors
5. **No Versioning:** PDF and "ugly sheet" aren't paired immutably

### Desired State

```
Excel Upload → Parse → Calculate → VERIFY → Auto-Fix → Export PDF
                                      ↓
                              ✅ MANIFEST RECORDED
                              ✅ RECONCILIATION REPORT
                              ✅ EXCEPTIONS TRACKED
                              ✅ AUTO-FIX APPLIED
                              ✅ AUDIT TRAIL COMPLETE
```

---

## Solution Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────┘

1. COMPUTE MANIFEST
   ├─ Capture control totals at each stage
   ├─ Track rows read, screens extracted, ALT rows skipped
   └─ Store source vs calculated values for each screen

2. RECONCILE
   ├─ Compare Excel source totals vs Natalia calculated totals
   ├─ Detect variances > $0.01 or > 0.001%
   ├─ Categorize exceptions by type and severity
   └─ Generate human-readable reconciliation report

3. AUTO-FIX
   ├─ Automatically fix 6/10 common issues:
   │  • Missing brightness (set to undefined)
   │  • ALT rows (already filtered)
   │  • Rounding drift (accept if < $0.01)
   │  • Non-numeric costs (parse currency strings)
   │  • Formula not updated (recalculate from scratch)
   │  • Tax rate detection (auto-detect Morgantown)
   ├─ Flag remaining 4/10 for human review
   └─ Log all fixes for audit trail

4. STORE & REPORT
   ├─ Store manifest with proposal
   ├─ Store reconciliation report
   ├─ Store exceptions and auto-fix summary
   └─ Generate trust badge (VERIFIED/WARNING/ERROR)

5. GATE EXPORTS
   ├─ VERIFIED (Green): Allow PDF, Share, Sign
   ├─ WARNING (Yellow): Allow PDF (with banner), Block Share/Sign
   └─ ERROR/Blocked (Red): Block all exports
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Verification Engine** | `lib/verification.ts` | Compute manifest, generate report |
| **Auto-Fix Engine** | `lib/autoFix.ts` | Fix safe issues automatically |
| **Exception Handler** | `lib/exceptions.ts` | Detect and categorize issues |
| **Types** | `types/verification.ts` | All type definitions |
| **API** | `app/api/proposals/verify/route.ts` | Verify endpoint |
| **UI** | `app/components/verification/TrustBadge.tsx` | Status badge |

---

## Implementation Plan

### Phase 1: Core Engine (Week 1-2)

**Goal:** Build verification and auto-fix engines.

**Tasks:**
1. Create `types/verification.ts` with all types
2. Create `lib/verification.ts` with manifest computation
3. Create `lib/exceptions.ts` with detection logic
4. Create `lib/autoFix.ts` with auto-fix rules
5. Update `prisma/schema.prisma` with verification fields
6. Run database migrations

**Deliverables:**
- ✅ Verification engine that computes manifests
- ✅ Exception detection for all 10 failure modes
- ✅ Auto-fix for 6/10 failure modes
- ✅ Database schema updated

**Success Criteria:**
- Can compute manifest from Excel import
- Can detect all exception types
- Can auto-fix safe issues
- Manifest stored in database

### Phase 2: API Integration (Week 2-3)

**Goal:** Integrate verification into proposal workflow.

**Tasks:**
1. Create `app/api/proposals/verify/route.ts`
2. Create `app/api/proposals/auto-fix/route.ts`
3. Create `app/api/proposals/reconciliation/route.ts`
4. Update `excelImportService.ts` to compute manifest
5. Update `generateProposalPdfService.ts` to check status
6. Add verification to proposal save flow

**Deliverables:**
- ✅ Verify API endpoint
- ✅ Auto-fix API endpoint
- ✅ Reconciliation report API
- ✅ Verification triggered on import
- ✅ Export gating implemented

**Success Criteria:**
- Verification runs automatically on Excel import
- Can trigger manual verification via API
- Export blocked if verification fails
- Reconciliation report accessible

### Phase 3: UI Components (Week 3-4)

**Goal:** Integrate verification into user experience.

**Tasks:**
1. Create `TrustBadge.tsx` component
2. Create `ReconciliationReport.tsx` viewer
3. Create `ExceptionModal.tsx` for fixing issues
4. Integrate trust badge into proposal editor
5. Add export gating with warnings
6. Create "Send to Finance" workflow

**Deliverables:**
- ✅ Trust badge showing verification status
- ✅ Reconciliation report viewer
- ✅ Exception modal with fix actions
- ✅ Export gating with appropriate warnings
- ✅ Finance package email system

**Success Criteria:**
- Trust badge visible in proposal editor
- Can view reconciliation report
- Can fix exceptions via modal
- Exports blocked/gated appropriately
- Finance can review via email

### Phase 4: Testing (Week 4-5)

**Goal:** Ensure correctness with comprehensive tests.

**Tasks:**
1. Create 3 real Excel test files
2. Write unit tests for verification engine
3. Write integration tests for Excel import
4. Write reconciliation tests
5. Create golden dataset regression suite
6. Add CI/CD integration

**Deliverables:**
- ✅ 3 test Excel files with expected manifests
- ✅ 50+ unit tests for calculations
- ✅ Integration tests for import flow
- ✅ Golden dataset regression suite
- ✅ Automated regression testing

**Success Criteria:**
- All tests pass
- Regression suite runs in CI/CD
- Golden dataset produces consistent results
- Edge cases handled correctly

### Phase 5: Deployment (Week 5-6)

**Goal:** Deploy to production and monitor.

**Tasks:**
1. Deploy to staging environment
2. Test with real ANC proposals
3. Train users on new workflow
4. Deploy to production
5. Monitor metrics and iterate
6. Document and handoff

**Deliverables:**
- ✅ Staging deployment
- ✅ User training materials
- ✅ Production deployment
- ✅ Monitoring dashboard
- ✅ Documentation complete

**Success Criteria:**
- Staging tests pass with real data
- Users trained on new workflow
- Production deployed without issues
- Metrics show 95% auto-verification rate
- Human review time <5 minutes

---

## Key Metrics & Success Criteria

### Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Auto-verification rate | 0% | >95% | % of proposals with VERIFIED status |
| Human review time | 30 min | <5 min | Time from import to verified |
| False positive rate | Unknown | <5% | % of WARNING that should be VERIFIED |
| Exception auto-fix rate | 0% | >80% | % of exceptions auto-fixed |
| Export blocking accuracy | N/A | 100% | ERROR status always blocks export |

### Qualitative Success Criteria

- ✅ Natalia can verify proposals without human intervention
- ✅ Finance can trust VERIFIED proposals without rechecking
- ✅ Exceptions are clearly categorized with actionable fixes
- ✅ Audit trail exists for all proposals
- ✅ PDF and ugly sheet are versioned together

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation | Medium | Optimize manifest computation, add caching |
| Database schema changes | High | Use migrations, test on staging first |
| Breaking existing workflows | High | Add feature flags, gradual rollout |
| False positives blocking exports | High | Conservative thresholds, manual override |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User resistance to change | Medium | Training, clear documentation, quick wins |
| Increased support burden | Low | Self-service exception fixing, clear error messages |
| Regression in calculations | Critical | Comprehensive test suite, golden dataset |

---

## Resource Requirements

### Team

- **2 Full-Stack Engineers** (6 weeks)
  - Backend: Verification engine, API endpoints
  - Frontend: UI components, integration
- **1 QA Engineer** (2 weeks)
  - Test case development
  - Golden dataset creation
- **1 Product Manager** (ongoing)
  - Requirements gathering
  - User training

### Infrastructure

- **Database:** PostgreSQL (existing)
- **Storage:** PDF and Excel file storage (existing)
- **Monitoring:** Error tracking and metrics (existing)

### Budget

- **Engineering:** 2 engineers × 6 weeks = 12 person-weeks
- **QA:** 1 engineer × 2 weeks = 2 person-weeks
- **Total:** 14 person-weeks

---

## Timeline

```
Week 1-2:  Phase 1 - Core Engine
           ├─ Types & interfaces
           ├─ Verification engine
           ├─ Exception detection
           ├─ Auto-fix engine
           └─ Database schema

Week 2-3:  Phase 2 - API Integration
           ├─ Verify endpoint
           ├─ Auto-fix endpoint
           ├─ Reconciliation endpoint
           └─ Import integration

Week 3-4:  Phase 3 - UI Components
           ├─ Trust badge
           ├─ Report viewer
           ├─ Exception modal
           └─ Export gating

Week 4-5:  Phase 4 - Testing
           ├─ Unit tests
           ├─ Integration tests
           ├─ Golden dataset
           └─ Regression suite

Week 5-6:  Phase 5 - Deployment
           ├─ Staging deployment
           ├─ User training
           ├─ Production deployment
           └─ Monitoring
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 5  
**Parallel Work:** Phase 4 can start during Phase 3

---

## Next Steps

### Immediate Actions (This Week)

1. **Review Documents**
   - [ ] Stakeholders review discovery document
   - [ ] Engineering reviews architecture document
   - [ ] Product approves timeline and budget

2. **Decide on Thresholds**
   - [ ] Variance threshold: $0.01 or $1.00?
   - [ ] Percentage threshold: 0.001% or 0.1%?
   - [ ] Blocking behavior: Block on ERROR? Block on WARNING?

3. **Allocate Resources**
   - [ ] Assign 2 engineers to project
   - [ ] Schedule QA engineer for week 4-5
   - [ ] Book stakeholder review meetings

4. **Set Up Infrastructure**
   - [ ] Create feature branch
   - [ ] Set up staging environment
   - [ ] Configure CI/CD for tests

### First Sprint (Week 1)

**Goal:** Get verification engine working end-to-end

**Tasks:**
1. Create all type definitions
2. Implement manifest computation
3. Implement exception detection
4. Write first unit tests
5. Demo to stakeholders

**Deliverables:**
- Working verification engine
- Can compute manifest from test data
- Unit tests passing
- Demo to stakeholders

---

## Open Questions

### Require Decision

1. **Threshold Values**
   - What variance threshold is acceptable? (Recommend: $0.01 OR 0.001%)
   - What percentage threshold? (Recommend: 0.001%)
   - **Decision needed:** Week 1

2. **Blocking Behavior**
   - Should we block PDF export on ERROR only, or WARNING too?
   - **Recommendation:** Block on ERROR, warn on WARNING
   - **Decision needed:** Week 1

3. **ALT Row Reporting**
   - Should skipped ALT rows appear in reconciliation report?
   - **Recommendation:** Yes, as INFO-level exceptions
   - **Decision needed:** Week 1

### To Be Determined

1. **Test Data**
   - Can we get 3 real ANC Excel files for golden dataset?
   - **Timeline:** Week 4

2. **User Training**
   - What training format? (Video, doc, workshop?)
   - **Timeline:** Week 5

3. **Rollout Strategy**
   - Big bang or gradual rollout?
   - **Timeline:** Week 5

---

## Success Stories

### Before Verification

```
User uploads Excel → Natalia calculates → User exports PDF
                                                    ↓
                                    Finance manually rechecks everything
                                    (30 minutes per proposal)
                                    ❌ Risk of human error
                                    ❌ No audit trail
```

### After Verification

```
User uploads Excel → Natalia calculates → VERIFY → Auto-fix → Export PDF
                                                      ↓
                                          95% auto-verified (GREEN)
                                          4% need review (YELLOW)
                                          1% blocked (RED)
                                                      ↓
                                    Finance reviews only exceptions
                                    (<5 minutes per proposal)
                                    ✅ Full audit trail
                                    ✅ Trust through verification
```

---

## Conclusion

The verification + auto-fix system will **transform Natalia from a calculation tool into a trusted proposal platform**. By automating verification and fixing common issues, we'll:

- **Reduce human review time** from 30 minutes to <5 minutes
- **Increase trust** through automated verification
- **Improve accuracy** with audit trails and reconciliation
- **Scale efficiently** without adding QA headcount

The architecture is **ready for implementation**, the **timeline is realistic**, and the **impact is measurable**.

**Recommendation:** Proceed with Phase 1 immediately.

---

## Appendix

### Related Documents

- [VERIFICATION_AUTO_FIX_DISCOVERY.md](./VERIFICATION_AUTO_FIX_DISCOVERY.md) - Complete discovery (11 sections)
- [VERIFICATION_ARCHITECTURE.md](./VERIFICATION_ARCHITECTURE.md) - Implementation guide with code examples
- [PROJECT_MASTER_TRUTH.md](./PROJECT_MASTER_TRUTH.md) - Project documentation
- [ESTIMATOR_CONSTITUTION.md](./ESTIMATOR_CONSTITUTION.md) - Math engine rules

### Key Files to Modify

1. **New Files:**
   - `types/verification.ts`
   - `lib/verification.ts`
   - `lib/exceptions.ts`
   - `lib/autoFix.ts`
   - `app/api/proposals/verify/route.ts`
   - `app/api/proposals/auto-fix/route.ts`
   - `app/components/verification/TrustBadge.tsx`

2. **Modified Files:**
   - `prisma/schema.prisma` (add verification fields)
   - `services/proposal/server/excelImportService.ts` (compute manifest)
   - `services/proposal/server/generateProposalPdfService.ts` (check status)

3. **Test Files:**
   - `test/verification/verification.test.ts`
   - `test/verification/autoFix.test.ts`
   - `test/fixtures/golden-dataset/*.xlsx`

### Contact

**Questions?** Contact the engineering team or review the architecture document.

**Ready to start?** Begin with Phase 1: Core Engine (Week 1-2).

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-30  
**Status:** Ready for Implementation  
**Next Review:** After Phase 1 completion (Week 2)
