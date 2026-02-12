-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'WARNING', 'ERROR', 'BLOCKED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'AUDIT', 'APPROVED', 'SHARED', 'SIGNED', 'CLOSED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentMode" AS ENUM ('BUDGET', 'PROPOSAL', 'LOI');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ESTIMATOR', 'PRODUCT_EXPERT', 'PROPOSAL_LEAD', 'FINANCE', 'OUTSIDER', 'VIEWER');

-- DropForeignKey
ALTER TABLE "CostLineItem" DROP CONSTRAINT "CostLineItem_screenConfigId_fkey";

-- DropForeignKey
ALTER TABLE "ManualOverride" DROP CONSTRAINT "ManualOverride_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "ProposalVersion" DROP CONSTRAINT "ProposalVersion_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "ScreenConfig" DROP CONSTRAINT "ScreenConfig_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "SignatureAuditTrail" DROP CONSTRAINT "SignatureAuditTrail_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workspaceId_fkey";

-- AlterTable
ALTER TABLE "CostLineItem" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "margin" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ManualOverride" DROP COLUMN "fieldPath",
DROP COLUMN "overriddenAt",
DROP COLUMN "overriddenBy",
ADD COLUMN     "approver" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "field" TEXT NOT NULL,
DROP COLUMN "originalValue",
ADD COLUMN     "originalValue" DECIMAL(65,30) NOT NULL,
DROP COLUMN "overrideValue",
ADD COLUMN     "overrideValue" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "chatConversations" JSONB,
ADD COLUMN     "chatHistory" JSONB,
ADD COLUMN     "clientAddress" TEXT,
ADD COLUMN     "clientCity" TEXT,
ADD COLUMN     "clientLogo" TEXT,
ADD COLUMN     "clientZip" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customProposalNotes" TEXT,
ADD COLUMN     "descriptionOverrides" JSONB,
ADD COLUMN     "documentConfig" JSONB,
ADD COLUMN     "documentMode" "DocumentMode" NOT NULL DEFAULT 'BUDGET',
ADD COLUMN     "embeddingStatus" TEXT,
ADD COLUMN     "insuranceRateOverride" DECIMAL(65,30),
ADD COLUMN     "intelligenceBrief" JSONB,
ADD COLUMN     "lastVerifiedBy" TEXT,
ADD COLUMN     "loiHeaderText" TEXT,
ADD COLUMN     "marginAnalysis" JSONB,
ADD COLUMN     "masterTableIndex" INTEGER,
ADD COLUMN     "mirrorMode" BOOLEAN,
ADD COLUMN     "overheadRate" DECIMAL(65,30) DEFAULT 0.10,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "priceOverrides" JSONB,
ADD COLUMN     "pricingDocument" JSONB,
ADD COLUMN     "pricingMode" TEXT,
ADD COLUMN     "profitRate" DECIMAL(65,30) DEFAULT 0.05,
ADD COLUMN     "purchaserLegalName" TEXT,
ADD COLUMN     "quoteItems" JSONB,
ADD COLUMN     "shareExpiresAt" TIMESTAMP(3),
ADD COLUMN     "sharePasswordHash" TEXT,
ADD COLUMN     "signatureBlockText" TEXT,
ADD COLUMN     "signerName" TEXT,
ADD COLUMN     "signerTitle" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "tableHeaderOverrides" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "venue" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "internalAudit" SET DATA TYPE TEXT,
ALTER COLUMN "clientSummary" SET DATA TYPE TEXT,
DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "aiFilledFields",
ADD COLUMN     "aiFilledFields" TEXT[];

-- AlterTable
ALTER TABLE "ProposalVersion" DROP COLUMN "snapshotData",
ADD COLUMN     "auditData" JSONB NOT NULL,
ADD COLUMN     "manifest" JSONB NOT NULL,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "uglySheetUrl" TEXT,
ALTER COLUMN "createdBy" SET NOT NULL,
ALTER COLUMN "changeReason" SET NOT NULL;

-- AlterTable
ALTER TABLE "ScreenConfig" ADD COLUMN     "brightness" DOUBLE PRECISION,
ADD COLUMN     "customDisplayName" TEXT,
ADD COLUMN     "externalName" TEXT,
ADD COLUMN     "formFactor" TEXT,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "manufacturerProductId" TEXT,
ADD COLUMN     "quantity" INTEGER DEFAULT 1,
ADD COLUMN     "serviceType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authRole" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "workspaceId" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'VIEWER';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "clientLogo" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "RfpDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposalId" TEXT,

    CONSTRAINT "RfpDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalSnapshot" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "shareHash" TEXT NOT NULL,
    "snapshotData" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "taxRate" DECIMAL(65,30),
    "bondRate" DECIMAL(65,30),
    "margin" DECIMAL(65,30),
    "totalSellingPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "shareHash" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "message" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "pinX" DOUBLE PRECISION,
    "pinY" DOUBLE PRECISION,
    "pinNumber" INTEGER,
    "screenshotData" TEXT,
    "audioData" TEXT,
    "audioDuration" DOUBLE PRECISION,
    "transcript" TEXT,
    "aiCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "sessionId" TEXT,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerProduct" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "productFamily" TEXT NOT NULL,
    "modelNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pixelPitch" DOUBLE PRECISION NOT NULL,
    "cabinetWidthMm" DOUBLE PRECISION NOT NULL,
    "cabinetHeightMm" DOUBLE PRECISION NOT NULL,
    "cabinetDepthMm" DOUBLE PRECISION,
    "weightKgPerCabinet" DOUBLE PRECISION NOT NULL,
    "maxNits" DOUBLE PRECISION NOT NULL,
    "typicalNits" DOUBLE PRECISION,
    "refreshRate" INTEGER,
    "maxPowerWattsPerCab" DOUBLE PRECISION NOT NULL,
    "typicalPowerWattsPerCab" DOUBLE PRECISION,
    "environment" TEXT NOT NULL,
    "ipRating" TEXT,
    "operatingTempMin" DOUBLE PRECISION,
    "operatingTempMax" DOUBLE PRECISION,
    "serviceType" TEXT NOT NULL DEFAULT 'front',
    "supportsHalfModule" BOOLEAN NOT NULL DEFAULT false,
    "isCurved" BOOLEAN NOT NULL DEFAULT false,
    "costPerSqFt" DECIMAL(65,30),
    "msrpPerSqFt" DECIMAL(65,30),
    "extendedSpecs" JSONB,
    "sourceSpreadsheet" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "environment" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModule" (
    "id" TEXT NOT NULL,
    "modelNumber" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "pixelPitch" DOUBLE PRECISION NOT NULL,
    "moduleWidth" DOUBLE PRECISION NOT NULL,
    "moduleHeight" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "brightness" INTEGER NOT NULL,
    "powerMax" INTEGER NOT NULL,
    "powerAvg" INTEGER,
    "refreshRate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxPixels" INTEGER NOT NULL,
    "inputs" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionNode" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "parentNodeId" TEXT,
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionOption" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "nextNodeId" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingFormula" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaVariable" (
    "id" TEXT NOT NULL,
    "variableName" TEXT NOT NULL,
    "defaultValue" DECIMAL(65,30),
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormulaVariable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalSnapshot_shareHash_key" ON "ProposalSnapshot"("shareHash");

-- CreateIndex
CREATE INDEX "Comment_proposalId_idx" ON "Comment"("proposalId");

-- CreateIndex
CREATE INDEX "ChangeRequest_proposalId_idx" ON "ChangeRequest"("proposalId");

-- CreateIndex
CREATE INDEX "ChangeRequest_shareHash_idx" ON "ChangeRequest"("shareHash");

-- CreateIndex
CREATE INDEX "ChangeRequest_sessionId_idx" ON "ChangeRequest"("sessionId");

-- CreateIndex
CREATE INDEX "ActivityLog_proposalId_createdAt_idx" ON "ActivityLog"("proposalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerProduct_modelNumber_key" ON "ManufacturerProduct"("modelNumber");

-- CreateIndex
CREATE INDEX "ManufacturerProduct_pixelPitch_environment_idx" ON "ManufacturerProduct"("pixelPitch", "environment");

-- CreateIndex
CREATE INDEX "ManufacturerProduct_manufacturer_idx" ON "ManufacturerProduct"("manufacturer");

-- CreateIndex
CREATE INDEX "ManufacturerProduct_isActive_idx" ON "ManufacturerProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE INDEX "ProductSeries_manufacturerId_idx" ON "ProductSeries"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSeries_manufacturerId_name_key" ON "ProductSeries"("manufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModule_modelNumber_key" ON "ProductModule"("modelNumber");

-- CreateIndex
CREATE INDEX "ProductModule_seriesId_idx" ON "ProductModule"("seriesId");

-- CreateIndex
CREATE INDEX "ProductModule_pixelPitch_idx" ON "ProductModule"("pixelPitch");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "DecisionNode_categoryId_idx" ON "DecisionNode"("categoryId");

-- CreateIndex
CREATE INDEX "DecisionNode_parentNodeId_idx" ON "DecisionNode"("parentNodeId");

-- CreateIndex
CREATE INDEX "DecisionOption_nodeId_idx" ON "DecisionOption"("nodeId");

-- CreateIndex
CREATE INDEX "DecisionOption_isFinal_idx" ON "DecisionOption"("isFinal");

-- CreateIndex
CREATE UNIQUE INDEX "PricingFormula_optionId_key" ON "PricingFormula"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaVariable_variableName_key" ON "FormulaVariable"("variableName");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualOverride" ADD CONSTRAINT "ManualOverride_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfpDocument" ADD CONSTRAINT "RfpDocument_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalSnapshot" ADD CONSTRAINT "ProposalSnapshot_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidVersion" ADD CONSTRAINT "BidVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenConfig" ADD CONSTRAINT "ScreenConfig_manufacturerProductId_fkey" FOREIGN KEY ("manufacturerProductId") REFERENCES "ManufacturerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenConfig" ADD CONSTRAINT "ScreenConfig_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLineItem" ADD CONSTRAINT "CostLineItem_screenConfigId_fkey" FOREIGN KEY ("screenConfigId") REFERENCES "ScreenConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureAuditTrail" ADD CONSTRAINT "SignatureAuditTrail_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSeries" ADD CONSTRAINT "ProductSeries_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModule" ADD CONSTRAINT "ProductModule_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProductSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionNode" ADD CONSTRAINT "DecisionNode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionNode" ADD CONSTRAINT "DecisionNode_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "DecisionNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOption" ADD CONSTRAINT "DecisionOption_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DecisionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOption" ADD CONSTRAINT "DecisionOption_nextNodeId_fkey" FOREIGN KEY ("nextNodeId") REFERENCES "DecisionNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingFormula" ADD CONSTRAINT "PricingFormula_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "DecisionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

