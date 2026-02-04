# Database Connection Solution

**Date:** February 4, 2026  
**Status:** ⚠️ **REQUIRES DATABASE ACCESS**

---

## Current Situation

**Issue:** Test scripts cannot connect to database at `localhost:5432`

**Root Cause:** 
- Placeholder `DATABASE_URL` in `.env.local` doesn't match actual database
- Dev server is running (PID 2148851) and must have database access
- Need to determine what database the dev server is using

---

## Solutions

### **Option 1: Use API Endpoint (Recommended)**

**File:** `scripts/test-webhook-via-api.ts` (CREATED)

**Approach:** Test webhook via API endpoint instead of direct database access.

**Advantages:**
- Doesn't require direct database connection
- Uses same path as production
- Tests full stack (API → Database)

**Usage:**
```bash
# Get proposal ID from UI (http://localhost:3000/projects)
npx tsx scripts/test-webhook-via-api.ts [proposal-id]
```

**Status:** ✅ **READY** - Script created and ready to use

---

### **Option 2: Configure Actual Database**

**Steps:**
1. **Determine Dev Server Database:**
   - Check dev server environment variables
   - Or check what database the running Next.js app is using

2. **Update `.env.local`:**
   ```bash
   # Use the same DATABASE_URL as dev server
   DATABASE_URL=postgresql://[actual-credentials]
   ```

3. **Test Connection:**
   ```bash
   npx tsx scripts/list-proposals.ts
   ```

**Status:** ⏳ **PENDING** - Need to identify dev server's database connection

---

### **Option 3: Use SQLite for Testing**

**File:** `prisma/schema.test.prisma` (CREATED)

**Approach:** Temporarily switch to SQLite for local testing.

**Steps:**
1. Use test schema: `npx prisma generate --schema=prisma/schema.test.prisma`
2. Set `DATABASE_URL=file:./test.db`
3. Run migrations: `npx prisma db push --schema=prisma/schema.test.prisma`
4. Run tests

**Status:** ⚠️ **COMPLEX** - Requires schema duplication and client regeneration

---

## Recommended Approach

**Use Option 1 (API Endpoint)** because:
- ✅ No database configuration needed
- ✅ Tests full stack
- ✅ Works with any database setup
- ✅ Matches production flow

**Next Steps:**
1. Get a proposal ID from the UI (create one or use existing)
2. Run: `npx tsx scripts/test-webhook-via-api.ts [proposal-id]`
3. Verify locking and audit trail creation

---

## Getting a Proposal ID

### Method 1: Via UI
1. Navigate to `http://localhost:3000/projects`
2. Create a new proposal or open existing
3. Copy ID from URL: `/projects/[id]`

### Method 2: Via Browser Console
```javascript
// In browser console on projects page
document.querySelector('[data-proposal-id]')?.getAttribute('data-proposal-id')
```

### Method 3: Check Database (if accessible)
```bash
# If database connection works
npx tsx scripts/list-proposals.ts
```

---

## Test Scripts Available

1. ✅ `scripts/test-webhook-via-api.ts` - **RECOMMENDED** (uses API, no DB needed)
2. ⏳ `scripts/simulate-docusign-webhook.ts` - Requires database connection
3. ⏳ `scripts/list-proposals.ts` - Requires database connection
4. ⏳ `scripts/create-test-proposal.ts` - Requires database connection

---

## Status

- ✅ **API Test Script:** Created and ready
- ⏳ **Database Connection:** Needs configuration
- ✅ **Webhook Handler:** Code complete
- ✅ **Gap Fill Logic:** Verified and working

**Recommendation:** Use API endpoint test script to verify webhook without database configuration.
