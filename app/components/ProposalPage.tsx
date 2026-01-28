"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Wizard, useWizard } from "react-use-wizard";

// Components
import StudioLayout from "@/app/components/layout/StudioLayout";
import PdfViewer from "@/app/components/proposal/actions/PdfViewer";
import RfpSidebar from "@/app/components/proposal/RfpSidebar";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import SaveIndicator from "@/app/components/reusables/SaveIndicator";
import WizardStepper from "@/app/components/proposal/form/wizard/WizardProgress";
import ActionToolbar from "@/app/components/ActionToolbar";
import { WizardStep } from "@/app/components";
import {
  Step1Ingestion,
  Step2Intelligence,
  Step3Math,
  Step4Export
} from "@/app/components/proposal/form/wizard/steps";

// ShadCn
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Download, Share2, Upload, Loader2 } from "lucide-react";
import AuditTable from "@/app/components/proposal/AuditTable";

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

  // Initialize form with server data
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
    if (projectId) {
      setValue("details.proposalId" as any, projectId);
    }
  }, [initialData, projectId, reset, setValue]);

  // Auto-Save
  const { status: saveStatus } = useAutoSave({
    projectId: projectId || null,
    debounceMs: 2000
  });

  // Header: Logo | Stepper (center) | Actions
  const HeaderContent = (
    <div className="h-full w-full flex items-center justify-between px-6">
      {/* Logo Guard: Blue header = White Logo */}
      <div className="flex items-center shrink-0 w-64">
        <LogoSelector theme="dark" width={100} height={40} className="p-0" />
      </div>

      {/* Wizard Stepper (centered) */}
      <div className="flex-1 flex justify-center max-w-2xl">
        <WizardStepper wizard={wizard} />
      </div>

      {/* Right Actions - Strict: Save and Finalize only */}
      <div className="flex items-center gap-4 shrink-0 w-64 justify-end">
        <SaveIndicator
          status={saveStatus}
          lastSavedAt={(initialData as any)?.lastSavedAt ? new Date((initialData as any).lastSavedAt) : undefined}
        />

        <Button
          size="sm"
          onClick={() => handleSubmit(onFormSubmit)()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 px-6 rounded-lg transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
        >
          Finalize
        </Button>
      </div>
    </div>
  );

  // Form Content (The Hub - Drafting Mode)
  const FormContent = (
    <div className="flex flex-col h-full">
      {/* ActionToolbar: only visible in drafting mode */}
      <div className="px-6 pt-6 shrink-0">
        <ActionToolbar />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <WizardStep>
          <Step1Ingestion />
        </WizardStep>
        <WizardStep>
          <Step2Intelligence />
        </WizardStep>
        <WizardStep>
          <Step3Math />
        </WizardStep>
        <WizardStep>
          <Step4Export />
        </WizardStep>
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
          <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/20 font-medium px-3 py-1">17/20 Strategy Match</Badge>
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
    <div className="animate-in fade-in zoom-in-95 duration-700">
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
    <Wizard>
      <WizardWrapper initialData={initialData} projectId={projectId} />
    </Wizard>
  );
};

export default ProposalPage;
