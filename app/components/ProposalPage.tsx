"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Wizard, useWizard } from "react-use-wizard";

// Components
import StudioLayout from "@/app/components/layout/StudioLayout";
import PdfViewer from "@/app/components/invoice/actions/PdfViewer";
import RfpSidebar from "@/app/components/invoice/RfpSidebar";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import SaveIndicator from "@/app/components/reusables/SaveIndicator";
import WizardStepper from "@/app/components/invoice/form/wizard/WizardProgress";
import { WizardStep } from "@/app/components";
import {
  Step1Ingestion,
  Step2Intelligence,
  Step3Math,
  Step4Export
} from "@/app/components/invoice/form/wizard/steps";

// ShadCn
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Download, Share2, Upload, Loader2 } from "lucide-react";

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

  const projectName = useWatch({
    name: "details.proposalName" as any,
    control: control,
  }) as any || "Untitled Project";

  // Handle auto-import from dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoImport') === 'true') {
      document.getElementById("excel-import-input")?.click();
      const newUrl = window.location.pathname + (projectId ? `?projectId=${projectId}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [projectId]);

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importANCExcel(file);
    }
  };

  const handleExport = () => {
    handleSubmit(onFormSubmit)();
  };

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
          onClick={handleExport}
          className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-bold h-9 px-5 rounded-lg transition-all"
        >
          Finalize 🏁
        </Button>
      </div>
    </div>
  );

  // Form Content (Drafting Mode)
  const FormContent = (
    <Form {...useFormContext<ProposalType>()}>
      <form onSubmit={handleSubmit(onFormSubmit, (err) => console.log(err))}>
        {/* WE DO NOT MAP HERE - The Wizard provider in ProposalPage will automatically 
            render the current step if we pass individual WizardStep components as children.
            BUT, since we are inside WizardWrapper which is ALREADY UNDER <Wizard>,
            and using useWizard() hook, we should just render the children directly.
            The current double-rendering is because ProposalPage wraps <Wizard> and WizardWrapper 
            is where useWizard is used. We need to be careful.
        */}
        <div className="p-0">
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
      </form>
    </Form>
  );

  // AI Content (Intelligence Mode)
  const AIContent = (
    <div className="h-full">
      <RfpSidebar />
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
