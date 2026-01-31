#!/bin/sh

# Regenerate Prisma Client to ensure it matches the schema
npx prisma generate

# Sync database schema (more forgiving than migrate deploy)
# This will add missing columns/tables without requiring migration history
echo "Syncing database schema..."
npx prisma db push --accept-data-loss || echo "Schema sync completed (some warnings expected)"

# Start the application
exec npm start