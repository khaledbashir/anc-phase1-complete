"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
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
import { useProposalContext } from "@/contexts/ProposalContext";

import AuditTable from "@/app/components/proposal/AuditTable";
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
 */
const WizardWrapper = ({ projectId, initialData }: ProposalPageProps) => {
  const { handleSubmit, setValue, reset, control } = useFormContext<ProposalType>();
  const { onFormSubmit, importANCExcel, excelImportLoading } = useProposalContext();
  const wizard = useWizard();
  const { activeStep } = wizard;

  // Initialize form with server data
  // Normalize projectId: treat the literal 'new' as no project
  const normalizedProjectId = projectId && projectId !== "new" ? projectId : null;

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
    if (normalizedProjectId) {
      setValue("details.proposalId" as any, normalizedProjectId);
    }
  }, [initialData, normalizedProjectId, reset, setValue]);

  // Auto-Save
  const { status: saveStatus } = useAutoSave({
    projectId: projectId || null,
    debounceMs: 2000
  });

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
  const FormContent = (
    <div className="flex flex-col h-full">
      {/* ActionToolbar: only visible in drafting mode */}
      <div className="px-6 pt-6 shrink-0">
        <ActionToolbar />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeStep === 0 && (
          <WizardStep>
            <Step1Ingestion />
          </WizardStep>
        )}
        {activeStep === 1 && (
          <WizardStep>
            <Step2Intelligence />
          </WizardStep>
        )}
        {activeStep === 2 && (
          <WizardStep>
            <Step3Math />
          </WizardStep>
        )}
        {activeStep === 3 && (
          <WizardStep>
            <Step4Export />
          </WizardStep>
        )}
      </div>
    </div>
  );

  // AI Content (The Hub - Intelligence Mode)
  const AIContent = (
    <div className="h-full flex flex-col">
      <RfpSidebar />
    </div>
  );

  // Audit Content (The Hub - Audit Mode)
  const AuditContent = (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between bg-zinc-900/40 p-5 rounded-xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-white">Financial Audit</h2>
          <p className="text-xs text-zinc-500">Real-time margin verification and profitability analysis.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className="bg-[#0A52EF]/10 text-[#0A52EF] border-[#0A52EF]/10 font-semibold px-2 py-0.5 rounded">17/20 Strategic Match</Badge>
          <span className="text-[10px] text-zinc-500 font-medium">Natalia Math Engine Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
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
    <StudioLayout
      header={HeaderContent}
      formContent={FormContent}
      aiContent={AIContent}
      auditContent={AuditContent}
      pdfContent={PDFContent}
    />
  );
};

/**
 * ProposalPage - Main workspace with Wizard context provider
 */
const ProposalPage = ({ initialData, projectId }: ProposalPageProps) => {
  return (
    <Wizard header={<WizardWrapper initialData={initialData} projectId={projectId} />}>
      <div className="hidden" />
      <div className="hidden" />
      <div className="hidden" />
      <div className="hidden" />
    </Wizard>
  );
};

export default ProposalPage;
