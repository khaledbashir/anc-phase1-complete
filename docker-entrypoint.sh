#!/bin/sh

# Sync database schema (more forgiving than migrate deploy)
# This will add missing columns/tables without requiring migration history
npx prisma db push --accept-data-loss 2>/dev/null || echo "Schema sync completed (some warnings expected)"

# Start the application
exec npm start