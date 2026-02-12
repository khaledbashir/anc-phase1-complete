-- Strict parser validation contract persistence fields
ALTER TABLE "Proposal"
ADD COLUMN "parserValidationReport" JSONB,
ADD COLUMN "sourceWorkbookHash" TEXT,
ADD COLUMN "parserStrictVersion" TEXT;
