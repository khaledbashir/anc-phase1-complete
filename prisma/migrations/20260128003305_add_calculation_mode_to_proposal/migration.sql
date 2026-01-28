-- CreateEnum
CREATE TYPE "CalculationMode" AS ENUM ('MIRROR', 'INTELLIGENCE');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "calculationMode" "CalculationMode" NOT NULL DEFAULT 'INTELLIGENCE';
