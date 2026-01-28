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
    <div className="h-full max-w-[1920px] mx-auto px-4 flex items-center justify-between">
      {/* Logo with clear space */}
      <div className="flex items-center shrink-0 pl-2 w-44">
        <LogoSelector theme="dark" width={80} height={32} />
      </div>

      {/* Wizard Stepper (centered) */}
      <div className="flex-1 flex justify-center">
        <WizardStepper wizard={wizard} />
      </div>

      {/* Right Actions - Strict: Save and Finalize only */}
      <div className="flex items-center gap-3 shrink-0 w-44 justify-end">
        <SaveIndicator
          status={saveStatus}
          lastSavedAt={(initialData as any)?.lastSavedAt ? new Date((initialData as any).lastSavedAt) : undefined}
        />

        <Button
          size="sm"
          onClick={() => handleSubmit(onFormSubmit)()}
          className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-bold h-9 px-5 rounded-lg transition-all"
        >
          Finalize 🏁
        </Button>
      </div>
    </div>
  );

  // Form Content (Drafting Mode)
  const FormContent = (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="px-4 pt-4 shrink-0">
        <ActionToolbar />
      </div>

      <div className="flex-1 overflow-auto">
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

  // AI Content (Intelligence Mode)
  const AIContent = (
    <div className="h-full bg-zinc-950 border-r border-zinc-800/50">
      <RfpSidebar />
    </div>
  );

  // Audit Content (Audit Mode)
  const AuditContent = (
    <div className="h-full bg-zinc-950 overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Project Financial Audit</h2>
          <p className="text-sm text-zinc-500">Real-time gap analysis and margin verification Protocol.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">17/20 Strategy Match</Badge>
        </div>
      </div>
      <AuditTable />
    </div>
  );

  // PDF Content (The Anchor)
  const PDFContent = (
    <div className="p-4">
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
