---
trigger: manual
---

# CORE RULE — ZERO BULLSHIT ENGINEERING

This system does not tolerate fake work, lazy shortcuts, or dishonest engineering.

## ABSOLUTE RULES (VIOLATION = REJECTION)

### 1. NO FAKE FUNCTIONALITY

- No simulated behavior
- No mocked responses
- No "thinking" animations
- No pretending something works when it doesn't
- If it's not real, it does not exist.

### 2. NO PLACEHOLDERS DISGUISED AS FEATURES

- No stubs shown to users
- No TODO logic exposed as real
- No "coming soon" features that partially run
- Unbuilt means invisible.

### 3. NO ERROR MASKING

- Never hide failures behind friendly messages
- Never swallow or soften errors
- Show the actual error, even if it's ugly
- If it breaks, we face it.

### 4. NO LAZY HACKS

- No duct tape
- No "temporary" fixes with no expiry
- No shortcuts to avoid proper architecture
- If it needs to be built, build it correctly.

### 5. NO PROBLEM SWEEPING

- Don't patch symptoms
- Don't defer structural flaws
- Don't silence bugs
- Fix the root cause or don't touch it.

### 6. REAL OR NOTHING

- Real AI responses
- Real data
- Real integrations
- Real behavior
- Illusions are forbidden.

### 7. HACKS: RARE, DEFENSIBLE, AND IMPRESSIVE

Hacks are allowed only if all of the following are true:

- The constraint is real and external
- The hack is technically honest
- The hack is clever, not evasive
- The hack would still be respectable in a post-mortem
- You would be proud to explain it to a senior engineer

If it's a hack, it must:

- reduce complexity, not hide it
- expose limitations, not obscure them
- make the system better under constraints

If your "hack" feels like a workaround, it's rejected.
If it doesn't make me go "okay… that's actually smart", it doesn't ship.

## ENFORCEMENT PRINCIPLE

A hack should look like a smart constraint-aware design —
not an apology for not doing the work.

Build it right.
Or build it clever.
But never build it fake.

---

# WORKFLOW RULE — PRODUCTION IS THE TRUTH

This workflow exists because dev environments lie.
Production does not.

## ABSOLUTE WORKFLOW RULES (NON-NEGOTIABLE)

### 1. DEV IS A LIE

- Local dev lies
- Preview builds lie
- Mock environments lie
- They show behavior that does not survive reality.
- Production is the only source of truth.

### 2. PRODUCTION-FIRST ONLY

- I do not review dev-only work
- I do not trust "it works locally"
- I do not accept screenshots, logs, or claims
- If you build something:
  - It must be pushed to GitHub
  - It must build on EasyPanel
  - Only then does it exist
- If I can't access it through the real pipeline, it doesn't count.

### 3. NO REDUNDANT BUILDS

- Do not build the same thing twice
- Do not recreate work "just to test"
- Do not maintain parallel versions
- If it builds on EasyPanel, that is the test.
- We do not duplicate effort to make ourselves feel safe.

### 4. LOCAL / DEV WORK IS EXCEPTION-ONLY

You may build outside production only if:

- It is technically unavoidable
- The work cannot be executed inside EasyPanel
- The result will immediately be pushed and built in production
- Dev exists to unblock production, not replace it.

### 5. IF IT'S NOT IN GITHUB, IT DOES NOT EXIST

- No hidden local state
- No private builds
- No "I'll push it later"
- If it's not committed and pushed, it's imaginary.

### 6. NEVER MERGE BRANCHES WITHOUT EXPLICIT COMMAND

This rule is sacred.

- You do not merge branches by default
- You do not "clean things up"
- You do not assume intent
- Merging happens only when I explicitly ask for it.

### 7. MERGE CONFIRMATION PROTOCOL (MANDATORY)

When I request a merge, you must:

1. Ask: "Are you sure you want to merge?"
2. Ask again: "This cannot be undone — confirm?"
3. Ask a third time: "Final confirmation. Proceed?"

Only after three explicit confirmations do you merge.

No shortcuts.
No assumptions.
No "helpfulness".

## ENFORCEMENT PRINCIPLE

If it doesn't survive production, it never worked.
If it isn't deployed, it isn't real.

We don't optimize for comfort.
We optimize for truth.
