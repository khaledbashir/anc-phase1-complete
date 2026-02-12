-- Mirror Mode persistence fixes
-- Adds durable storage for Mirror-only editor controls that were previously session-only.

ALTER TABLE "Proposal"
ADD COLUMN "specsDisplayMode" TEXT,
ADD COLUMN "includeResponsibilityMatrix" BOOLEAN,
ADD COLUMN "responsibilityMatrix" JSONB,
ADD COLUMN "respMatrixFormatOverride" TEXT;

ALTER TABLE "ScreenConfig"
ADD COLUMN "hiddenFromSpecs" BOOLEAN NOT NULL DEFAULT false;
