# DocuSign Webhook Mock Test - Execution Instructions

**Date:** February 4, 2026  
**Status:** Ready for Execution (Requires Proposal ID)

---

## Prerequisites

1. ✅ **Dev Server Running:** `npm run dev` (confirmed running on PID 2148851)
2. ✅ **Dependencies Installed:** `jsonwebtoken` package installed
3. ✅ **Test Script Created:** `scripts/simulate-docusign-webhook.ts`
4. ⏳ **Proposal ID Required:** Need a valid proposal ID from database

---

## Step 1: Get a Proposal ID

### Option A: Query Database (if DATABASE_URL is set)

```bash
# Set DATABASE_URL in .env.local first
npx tsx scripts/list-proposals.ts
```

### Option B: Create via UI

1. Navigate to `http://localhost:3000/projects/new`
2. Create a test proposal
3. Copy the proposal ID from the URL or database

### Option C: Use API (if available)

```bash
# Check if API endpoint exists
curl http://localhost:3000/api/projects
```

---

## Step 2: Run Mock Webhook Test

Once you have a proposal ID:

```bash
npx tsx scripts/simulate-docusign-webhook.ts [proposal-id]
```

**Example:**
```bash
npx tsx scripts/simulate-docusign-webhook.ts clx123abc456
```

---

## Step 3: Verify Results

The script will automatically verify:

### ✅ **Expected Verifications:**

1. **Status Change:** Proposal status should change to `SIGNED`
2. **Immutability:** `isLocked` should be set to `true`
3. **Locked Timestamp:** `lockedAt` should be set
4. **Document Hash:** SHA-256 hash should be generated
5. **Audit Records:** `SignatureAuditTrail` records should be created
   - Client record: `client@example.com` (PURCHASER role)
   - ANC record: `signer@anc.com` (ANC_REPRESENTATIVE role)

---

## Expected Output

```
🚀 DocuSign Webhook Simulation Test
============================================================
Proposal ID: [proposal-id]
============================================================

✅ Proposal found: [Client Name]
   Current Status: [DRAFT/APPROVED/etc]
   Current Locked: false

📤 Sending mock webhook payload...
   Proposal ID: [proposal-id]
   Webhook URL: http://localhost:3000/api/webhooks/docusign
   Recipients: 2

📥 Webhook Response:
   Status: 200
   Body: {
     "ok": true,
     "message": "Proposal locked successfully",
     "proposalId": "[proposal-id]"
   }

⏳ Waiting for webhook processing...

🔍 Verifying proposal state...

📊 Proposal State:
   ID: [proposal-id]
   Status: SIGNED ✅
   Is Locked: true ✅
   Locked At: [timestamp] ✅
   Document Hash: [hash]... ✅

✅ Locking Verification:
   Status is SIGNED: ✅ YES
   Is Locked: ✅ YES
   Has Document Hash: ✅ YES

📝 Audit Trail Records: 2 ✅

   Record 1:
     Signer Name: Test Client
     Signer Email: client@example.com
     Signer Role: PURCHASER ✅
     Signed At: [timestamp]
     IP Address: unknown (fallback mode)
     Document Hash: [hash]...

   Record 2:
     Signer Name: ANC Representative
     Signer Email: signer@anc.com
     Signer Role: ANC_REPRESENTATIVE ✅
     Signed At: [timestamp]
     IP Address: unknown (fallback mode)
     Document Hash: [hash]...

✅ Audit Trail Verification:
   Records Created: ✅ YES
   Client Record: ✅ YES
   ANC Record: ✅ YES

============================================================
✅ ALL VERIFICATIONS PASSED
   Proposal locking: ✅
   Audit trail creation: ✅
   Document hash generation: ✅
============================================================

🎉 SUCCESS: All webhook logic verified!
```

---

## Troubleshooting

### Error: "Proposal not found"

**Solution:** Ensure the proposal ID exists in the database. Use `scripts/list-proposals.ts` to find valid IDs.

### Error: "DATABASE_URL not set"

**Solution:** Add `DATABASE_URL` to `.env.local`:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Error: "Webhook request failed"

**Solution:** 
1. Ensure dev server is running: `npm run dev`
2. Check server logs for errors
3. Verify webhook endpoint is accessible: `curl http://localhost:3000/api/webhooks/docusign`

### No Audit Records Created

**Possible Causes:**
1. DocuSign service unavailable (expected with MOCK_DATA credentials)
2. Fallback mode should still create records from webhook payload
3. Check webhook handler logs for errors

---

## Next Steps After Successful Test

1. ✅ Document test results
2. ✅ Mark Phase 2.3 as verified
3. ✅ Proceed to next phase (if applicable)
4. ⏳ Replace MOCK_DATA credentials with real DocuSign credentials when available

---

## Status

- ✅ **Test Script:** Ready
- ✅ **Dev Server:** Running
- ⏳ **Proposal ID:** Required (blocking test execution)
- ⏳ **Test Execution:** Pending proposal ID
