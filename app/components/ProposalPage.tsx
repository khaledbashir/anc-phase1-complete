"use client";

import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Wizard, useWizard } from "react-use-wizard";

// Components
import StudioLayout from "@/app/components/layout/StudioLayout";
import { StudioHeader } from "@/app/components/layout/StudioHeader";
import PdfViewer from "@/app/components/proposal/actions/PdfViewer";
import RfpSidebar from "@/app/components/proposal/RfpSidebar";
import ActionToolbar from "@/app/components/ActionToolbar";
import { WizardStep } from "@/app/components";
import {
  Step1Ingestion,
  Step2Intelligence,
  Step3Math,
  Step4Export
} from "@/app/components/proposal/form/wizard/steps";

// Context
import { useProposalContext, ProposalContextProvider } from "@/contexts/ProposalContext";
import { FEATURES } from "@/lib/featureFlags";

import AuditTable from "@/app/components/proposal/AuditTable";
import CopilotPanel from "@/app/components/chat/CopilotPanel";
import { ProposalFormErrorBoundary } from "@/app/components/ProposalFormErrorBoundary";
import { Badge } from "@/components/ui/badge";

// Types
import { ProposalType } from "@/types";

// Hooks
import useAutoSave from "@/lib/useAutoSave";

interface ProposalPageProps {
  initialData?: Partial<ProposalType>;
  projectId?: string;
}

/**
 * WizardWrapper - Provides wizard context to both stepper and form
 * PROMPT 56: Single hydration authority - this is the ONLY place that sets form state on load
 */
const WizardWrapper = ({ projectId, initialData }: ProposalPageProps) => {
  const { handleSubmit, setValue, reset, control } = useFormContext<ProposalType>();
  const { onFormSubmit, importANCExcel, excelImportLoading, setInitialDataApplied } = useProposalContext();
  const wizard = useWizard();
  const { activeStep } = wizard;

  const mirrorModeFlag = useWatch({ name: "details.mirrorMode", control });
  const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
  const isMirrorMode =
    mirrorModeFlag === true || ((pricingDocument as any)?.tables?.length ?? 0) > 0;

  // PROMPT 56: Single hydration path - ONE function that sets EVERYTHING
  const normalizedProjectId = projectId && projectId !== "new" ? projectId : null;
  const hydrationCompleteRef = useRef(false);
  const lastProjectIdRef = useRef<string | undefined>(projectId);

  // Reset hydration guard when projectId changes (navigation)
  useEffect(() => {
    if (lastProjectIdRef.current !== projectId) {
      hydrationCompleteRef.current = false;
      lastProjectIdRef.current = projectId;
    }
  }, [projectId]);

  // PROMPT 56: SINGLE HYDRATION FUNCTION - runs ONCE per project load
  useEffect(() => {
    // Skip if no initialData or Excel import in progress
    if (!initialData || excelImportLoading) return;
    
    // Skip if already hydrated for this project
    if (hydrationCompleteRef.current) return;

    // PROMPT 56: ONE function that sets EVERYTHING from database
    console.log("[HYDRATE] Loading project from database:", projectId || "new");
    
    // Apply form data
    reset(initialData);
    
    // Ensure proposalId is set
    if (normalizedProjectId) {
      setValue("details.proposalId" as any, normalizedProjectId);
    }

    // Log what was hydrated
    const data = initialData as any;
    console.log("[HYDRATE] Complete. Screens:", data.details?.screens?.length || 0, 
                "Tables:", data.details?.pricingDocument?.tables?.length || 0,
                "HasMarginAnalysis:", !!data.marginAnalysis,
                "HasPricingDoc:", !!data.details?.pricingDocument);

    // Mark as complete - prevents any other hydration paths from running
    hydrationCompleteRef.current = true;
    if (setInitialDataApplied) {
      setInitialDataApplied(true);
    }
  }, [initialData, normalizedProjectId, reset, setValue, excelImportLoading, projectId, setInitialDataApplied]);

  // Auto-Save
  const { status: saveStatus } = useAutoSave({
    projectId: projectId || null,
    debounceMs: 2000
  });

  // Mirror Mode: skip Math step entirely
  useEffect(() => {
    if (isMirrorMode && activeStep === 2) {
      wizard.goToStep(3);
    }
  }, [isMirrorMode, activeStep, wizard]);

  // Header: Logo | Stepper (center) | Actions
  const HeaderContent = (
    <StudioHeader
      saveStatus={saveStatus}
      initialData={initialData}
      excelImportLoading={excelImportLoading}
      onImportExcel={importANCExcel}
      onExportPdf={() => handleSubmit(onFormSubmit)()}
      projectId={projectId ?? undefined}
    />
  );

  // Form Content (The Hub - Drafting Mode)
  const effectiveStep = isMirrorMode && activeStep === 2 ? 3 : activeStep;
  const FormContent = (
    <div className="flex flex-col h-full">
      {/* ActionToolbar: only visible in drafting mode */}
      <div className="px-6 pt-6 shrink-0">
        <ActionToolbar />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <ProposalFormErrorBoundary>
          {effectiveStep === 0 && (
            <WizardStep>
              <Step1Ingestion />
            </WizardStep>
          )}
          {effectiveStep === 1 && (
            <WizardStep>
              <Step2Intelligence />
            </WizardStep>
          )}
          {!isMirrorMode && activeStep === 2 && (
            <WizardStep>
              <Step3Math />
            </WizardStep>
          )}
          {effectiveStep === 3 && (
            <WizardStep>
              <Step4Export />
            </WizardStep>
          )}
        </ProposalFormErrorBoundary>
      </div>
    </div>
  );

  // AI Content (The Hub - Intelligence Mode)
  const AIContent = (
    <div className="h-full flex flex-col">
      <RfpSidebar />
    </div>
  );

  // Audit Content (The Hub - Audit Mode / Margin Analysis)
  const AuditContent = (
    <div className="h-full min-h-0 flex flex-col p-6 space-y-6">
      <div className="shrink-0 flex items-center justify-between bg-zinc-900/40 p-5 rounded-xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-white">Financial Audit</h2>
          <p className="text-xs text-zinc-500">Real-time margin verification and profitability analysis.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {FEATURES.STRATEGIC_MATCH_BADGE && (
            <Badge className="bg-[#0A52EF]/10 text-[#0A52EF] border-[#0A52EF]/10 font-semibold px-2 py-0.5 rounded" title="Strategic match score (Phase 2)">17/20 Strategic Match</Badge>
          )}
          <span className="text-[10px] text-zinc-500 font-medium">Natalia Math Engine Active</span>
        </div>
      </div>

      <div className="flex-1 min-h-[320px] overflow-auto custom-scrollbar">
        <AuditTable />
      </div>
    </div>
  );

  // PDF Content (The Anchor)
  const PDFContent = (
    <div className="w-full h-full">
      <PdfViewer />
    </div>
  );

  return (
    <>
      <StudioLayout
        header={HeaderContent}
        formContent={FormContent}
        aiContent={AIContent}
        auditContent={isMirrorMode ? null : AuditContent}
        showAudit={!isMirrorMode}
        pdfContent={PDFContent}
      />
      <CopilotPanel />
    </>
  );
};

/**
 * ProposalPage - Main workspace with Wizard context provider.
 * Wraps with a scoped ProposalContextProvider so initialData/projectId are available
 * in context; this ensures new projects get a clean Excel state (no stale cache).
 */
const ProposalPage = ({ initialData, projectId }: ProposalPageProps) => {
  return (
    <ProposalContextProvider initialData={initialData} projectId={projectId}>
      <Wizard header={<WizardWrapper initialData={initialData} projectId={projectId} />}>
        <div className="hidden" />
        <div className="hidden" />
        <div className="hidden" />
        <div className="hidden" />
      </Wizard>
    </ProposalContextProvider>
  );
};

export default ProposalPage;
