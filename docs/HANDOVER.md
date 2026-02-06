# Handover Document - Database Migration Issue

## Summary
Migrated the application from old database/AnythingLLM instances to new production infrastructure. Successfully updated environment variables and Docker configuration, but **database authentication is still failing**.

---

## What Was Done

### 1. Environment Variables Updated
Changed from old credentials to new production database:

**Old (deprecated):**
- Database: `209.38.250.155:15432/anc_production`
- Password: `45a2b41a4fc7c0b0d384`
- AnythingLLM: `basheer-anything-llm.c9tnyg.easypanel.host`
- Key: `KPFXD2Q-YE3MKYY-JHVDTJ9-PTJ5ZNQ`

**New (production):**
- Database: `basheer_natadb:5432/nata` (internal) or `138.201.126.110:15432/nata` (external)
- Password: `32e4654c47db3b3f2a1e`
- AnythingLLM: `basheer-anything-llm.prd42b.easypanel.host`
- Key: `7YMK7HD-B1KMNBZ-PPQ3DSV-9RGQDT7`

### 2. AnythingLLM Workspace Created
- Created new workspace: `nata-estimator`
- Slug: `nata-estimator`
- Updated env to use the new workspace

### 3. Dockerfile Fixed
**Issue:** Prisma folder wasn't being copied to production stage

**Changes:**
- Added `COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma`
- Added `WORKDIR /app` to production stage
- Created `docker-entrypoint.sh` to run migrations at runtime
- Updated CMD to use entrypoint script

### 4. Git Commits Pushed
All changes pushed to `feat/audit-engine` branch:
- `Update database and AnythingLLM credentials to production`
- `Update AnythingLLM workspace to nata-estimator`
- `Fix Dockerfile: copy prisma folder and run migrations on startup`
- `Fix: Run prisma migrations at runtime instead of build time`
- `Fix: Add WORKDIR in production stage and fix chmod path`
- `Fix DATABASE_URL password (a1e)`

---

## Current Issue

**Error:** `P1000: Authentication failed against database server`

The application cannot authenticate with the PostgreSQL database at `basheer_natadb:5432/nata`.

### Symptoms
- Container starts successfully
- Prisma migrations attempt to run
- Authentication fails immediately
- API endpoints return "Database Persistence Failed"

### Troubleshooting Attempted
1. ✅ Updated database URL to use internal host (`basheer_natadb:5432`)
2. ✅ Updated database URL to use external host (`138.201.126.110:15432`)
3. ✅ Verified password format (no quotes in Easypanel env vars)
4. ✅ Tried multiple password variations

---

## Next Steps to Resolve

### 1. Verify Database Credentials in Easypanel
Go to your database service in Easypanel and:
- **Copy the password EXACTLY** - character by character
- Check for any special characters that might be getting escaped
- Verify the database name is `nata`
- Verify the username is `postgres`

### 2. Test Database Connection
From the Easypanel container terminal, try:

```bash
# Test with internal host
psql -h basheer_natadb -p 5432 -U postgres -d nata

# Test with external host
psql -h 138.201.126.110 -p 15432 -U postgres -d nata
```

### 3. Check if Database Exists
If you can connect to the postgres database, check if `nata` exists:

```sql
\l
-- If nata doesn't exist, create it:
CREATE DATABASE nata;
```

### 4. Verify Database User Permissions
The postgres user might not have access to the `nata` database. Check:

```sql
\du
-- Should show postgres with privileges
```

### 5. Check Easypanel Network Configuration
- Verify both services are on the same network
- Check if there are any firewall rules blocking internal connections

### 6. Alternative: Use External URL with Different Port
Try connecting to the postgres database first to verify credentials work:

```
DATABASE_URL=postgres://postgres:32e4654c47db3b3f2a1e@138.201.126.110:15432/postgres?sslmode=disable
```

---

## Files Modified

1. **`.env`** - Updated DATABASE_URL and AnythingLLM credentials
2. **`easypanel-env`** - Created reference file for Easypanel env vars
3. **`Dockerfile`** - Fixed Prisma folder copy and entrypoint
4. **`docker-entrypoint.sh`** - Created new script for runtime migrations

---

## Current Environment Variables for Easypanel

```
DATABASE_URL=postgres://postgres:32e4654c47db3b3f2a1e@basheer_natadb:5432/nata?sslmode=disable
ANYTHING_LLM_URL=https://basheer-anything-llm.prd42b.easypanel.host/api/v1
ANYTHING_LLM_KEY=7YMK7HD-B1KMNBZ-PPQ3DSV-9RGQDT7
ANYTHING_LLM_WORKSPACE=nata-estimator
ANYTHING_LLM_MASTER_CATALOG_URL=https://basheer-invo.c9tnyg.easypanel.host/assets/data/anc_catalog.csv
```

**Note:** In Easypanel, do NOT use quotes around the values.

---

## Contact Points

If database authentication continues to fail, check:
- Easypanel database service logs
- Database container logs
- Network connectivity between services

---

**Status:** ⚠️ BLOCKED - Database Authentication Issue
**Last Updated:** January 28, 2026
**Branch:** feat/audit-engine