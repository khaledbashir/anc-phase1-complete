# Database Configuration Notes

**Date:** February 4, 2026  
**Status:** ⚠️ **REQUIRES ACTUAL DATABASE CREDENTIALS**

---

## Current Configuration

**File:** `.env.local`

**Placeholder Added:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/invoify_dev
```

**Note:** This is a **placeholder** and needs to be replaced with actual database credentials.

---

## Database Type

**Provider:** PostgreSQL (per `prisma/schema.prisma`)

**Format:**
```bash
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```

---

## How to Configure

### Option 1: Local PostgreSQL

If you have a local PostgreSQL instance:

```bash
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/invoify_dev
```

### Option 2: Production Database (from HANDOVER.md)

Based on documentation, production database format:

```bash
DATABASE_URL=postgresql://postgres:32e4654c47db3b3f2a1e@basheer_natadb:5432/nata?sslmode=disable
```

**⚠️ WARNING:** Do not use production database for local testing unless explicitly authorized.

### Option 3: Docker PostgreSQL

If using Docker:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/invoify_dev
```

---

## Scripts Updated

Both test scripts now load `.env.local` automatically:

- `scripts/list-proposals.ts` - Lists proposals from database
- `scripts/simulate-docusign-webhook.ts` - Tests webhook handler

**Dependency:** `dotenv` package installed to load environment variables.

---

## Verification

Once `DATABASE_URL` is configured:

1. **Test Connection:**
   ```bash
   npx tsx scripts/list-proposals.ts
   ```

2. **Expected Output:**
   ```
   Available Proposals:
   ============================================================
   1. ID: clx123abc456
      Client: Test Client
      Status: DRAFT
      Locked: false
      Created: 2026-02-04
   ```

3. **Run Webhook Test:**
   ```bash
   npx tsx scripts/simulate-docusign-webhook.ts clx123abc456
   ```

---

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Solution:** Ensure `.env.local` exists and contains `DATABASE_URL`

### Error: "Authentication failed"

**Solution:** Check database credentials (username, password, host, port)

### Error: "Connection refused"

**Solution:** 
- Ensure PostgreSQL is running
- Check host/port are correct
- Verify network connectivity

---

## Next Steps

1. **Get Database Credentials:**
   - Check with DevOps/IT team
   - Or set up local PostgreSQL instance
   - Or use Docker PostgreSQL container

2. **Update `.env.local`:**
   - Replace placeholder with actual `DATABASE_URL`

3. **Test Connection:**
   - Run `npx tsx scripts/list-proposals.ts`
   - Verify proposals are listed

4. **Execute Webhook Test:**
   - Use proposal ID from step 3
   - Run webhook simulation
   - Verify locking and audit trail

---

## Security Note

**Never commit `.env.local` to git** - It contains sensitive credentials.

The placeholder value is safe to commit, but actual credentials must remain local.
