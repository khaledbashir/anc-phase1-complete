-- Frankenstein Excel Normalizer: ImportProfile table
-- Stores layout fingerprints so non-standard Excel formats auto-import on repeat.
CREATE TABLE "ImportProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "targetSheet" TEXT,
    "headerRowIndex" INTEGER NOT NULL,
    "dataStartRowIndex" INTEGER NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "dataEndStrategy" TEXT NOT NULL DEFAULT 'blank_row',
    "createdBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportProfile_fingerprint_key" ON "ImportProfile"("fingerprint");
CREATE INDEX "ImportProfile_fingerprint_idx" ON "ImportProfile"("fingerprint");
