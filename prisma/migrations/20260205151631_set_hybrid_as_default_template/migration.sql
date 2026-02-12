-- Migration: Set Hybrid (Template 5) as the standard template
-- Created: 2026-02-05
-- Purpose: Update all existing proposals to use the ANC Hybrid template (ID 5)
--          This is the enterprise-approved standard template agreed with Natalia.
--          Template 2 (Classic) and Template 4 (Premium/Bold) are deprecated for new proposals.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Proposal'
          AND column_name = 'documentConfig'
    ) THEN
        -- Update proposals using Template 2 (Classic) to Template 5 (Hybrid)
        -- The pdfTemplate is stored within the JSON documentConfig field
        UPDATE "Proposal"
        SET "documentConfig" = jsonb_set(
            "documentConfig"::jsonb,
            '{pdfTemplate}',
            '5'::jsonb,
            true
        )
        WHERE "documentConfig"::jsonb->>'pdfTemplate' IN ('2', '4', '1');

        -- Also handle cases where pdfTemplate might be stored as a number
        UPDATE "Proposal"
        SET "documentConfig" = jsonb_set(
            "documentConfig"::jsonb,
            '{pdfTemplate}',
            '5'::jsonb,
            true
        )
        WHERE ("documentConfig"::jsonb->'pdfTemplate')::int IN (2, 4, 1);
    END IF;
END $$;

-- Add a comment to document this migration
COMMENT ON TABLE "Proposal" IS 'ANC Proposal Engine - Hybrid Template (ID 5) is now the enterprise standard. Migrated 2026-02-05.';
