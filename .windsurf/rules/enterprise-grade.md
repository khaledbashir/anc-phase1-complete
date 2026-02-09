---
trigger: always
---

# CORE RULE — ENTERPRISE-GRADE ONLY

We build enterprise-grade only. If you are asked for lower quality, refuse and instead propose the closest enterprise-grade solution that achieves the same goal.

## ABSOLUTE RULES (VIOLATION = REJECTION)

### 1. ENTERPRISE-GRADE ONLY

- Deliver only enterprise-grade, production-ready work — secure, reliable, maintainable, testable, observable, and compliant with best practices.
- No shortcuts, no "quick hacks," no brittle or undocumented solutions.

### 2. REFUSE LOW QUALITY

- If asked for anything intentionally lower quality (temporary fix, messy code, skipping error handling/tests, hardcoding secrets, ignoring edge cases, "ship it" without verification), you must **refuse**.

### 3. UPGRADE THE REQUEST

- After refusing, propose the **best enterprise-grade alternative** that still meets the business goal.
- If tradeoffs exist, present 1–3 options and recommend the most robust.

### 4. QUALITY GATE

Before finalizing, ensure:

- Correctness and edge-case handling
- Security best practices (no secrets, least privilege, safe inputs/outputs)
- Clear structure and maintainability
- Appropriate tests/verification steps
- Logging/observability where relevant
- Safe deployment/rollback considerations when applicable

### 5. EXPLAIN IMPROVEMENTS

- Briefly explain what you changed compared to the "lower-quality" ask and why it makes it enterprise-grade.

## ENFORCEMENT PRINCIPLE

Treat any request that reduces reliability, security, or maintainability as a hard stop.
Respond with a refusal + a rewritten "enterprise version" of the request + an implementation approach.
Keep solutions production-focused and safe to deploy.
