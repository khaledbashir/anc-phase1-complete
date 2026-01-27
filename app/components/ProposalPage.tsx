"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

// Components
import ProposalForm from "@/app/components/invoice/ProposalForm";
import PdfViewer from "@/app/components/invoice/actions/PdfViewer";
import ActionToolbar from "@/app/components/ActionToolbar";
import RfpSidebar from "@/app/components/invoice/RfpSidebar";
import LogoSelector from "@/app/components/reusables/LogoSelector";

// ShadCn
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Utils
import { cn } from "@/lib/utils";

// Icons
import { Send, Sparkles, Download, Share2, Upload, Loader2, BrainCircuit } from "lucide-react";

// Types
import { ProposalType } from "@/types";

// Hooks
import useAutoSave from "@/lib/useAutoSave";

// Components
import SaveIndicator from "@/app/components/reusables/SaveIndicator";

interface ProposalPageProps {
  initialData?: Partial<ProposalType>;
  projectId?: string;
}

const ProposalPage = ({ initialData, projectId }: ProposalPageProps) => {
  const { handleSubmit, setValue, reset, control } = useFormContext<ProposalType>();
  const { _t } = useTranslationContext();
  const { onFormSubmit, activeTab, setActiveTab, importANCExcel, excelImportLoading } = useProposalContext();

  // Initialize form with server data if available
  useState(() => {
    if (initialData) {
      reset(initialData);
    }
    if (projectId) {
      setValue("details.proposalId" as any, projectId);
    }
  });

  // Enterprise Auto-Save Hook (Heartbeat)
  const { status: saveStatus } = useAutoSave({
    projectId: projectId || null,
    debounceMs: 2000
  });

  const projectName = useWatch({
    name: "details.proposalName" as any,
    control: control,
  }) as any || "Untitled Project";

  const [isIntelligenceEngineOpen, setIsIntelligenceEngineOpen] = useState(false);

  const handleExport = () => {
    // Trigger standard form submit which leads to PDF generation 
    handleSubmit(onFormSubmit)();
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importANCExcel(file);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-full max-w-[1920px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LogoSelector theme="dark" width={100} height={40} />
          </div>

          {/* Editable Project Name */}
          <div className="flex-1 max-w-md mx-8">
            <Input
              value={String(projectName)}
              readOnly
              className="bg-transparent border-none text-center text-zinc-100 font-medium text-lg focus:ring-0 px-4 cursor-default"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} lastSavedAt={(initialData as any)?.lastSavedAt ? new Date((initialData as any).lastSavedAt) : undefined} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIntelligenceEngineOpen(!isIntelligenceEngineOpen)}
              className={cn(
                "transition-all",
                isIntelligenceEngineOpen
                  ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-700 font-bold"
                  : "text-zinc-400 border-zinc-700 hover:text-blue-500 hover:border-blue-500 font-medium"
              )}
            >
              <BrainCircuit className="w-4 h-4 mr-2" />
              Intelligence Engine
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              onClick={() => document.getElementById("excel-import-input")?.click()}
              disabled={excelImportLoading}
            >
              {excelImportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </>
              )}
            </Button>
            <input
              id="excel-import-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <Button
              size="sm"
              onClick={handleExport}
              className="bg-[#003366] hover:bg-[#004080] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Proposal PDF
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Canvas */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-6">
        <Form {...useFormContext<ProposalType>()}>
          <form
            onSubmit={handleSubmit(onFormSubmit, (err) => console.log(err))}
            className="flex gap-6 h-full relative"
          >
            {/* Left: Proposal Editor (60%) */}
            <div className="flex-1 min-w-0 transition-all duration-300">
              <div className="max-w-3xl mx-auto space-y-4">
                <ActionToolbar />
                <ProposalForm />
              </div>
            </div>

            {/* Right: Live PDF Preview (40%) / RfpSidebar Toggle */}
            <div className={cn(
              "transition-all duration-300 flex gap-4",
              isIntelligenceEngineOpen ? "w-[60%] min-w-[900px]" : "w-[40%] min-w-[500px]"
            )}>
              <div className="flex-1 sticky top-24 h-[calc(100vh-120px)]">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-2xl h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center shrink-0">
                    <span className="text-zinc-400 text-sm font-medium">Live Proposal Preview</span>
                  </div>
                  <div className="p-4 bg-zinc-950/50 relative flex-1 overflow-y-auto custom-scrollbar">
                    <PdfViewer />
                  </div>
                </div>
              </div>

              {isIntelligenceEngineOpen && (
                <div className="w-96 shrink-0 sticky top-24 h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-300">
                  <RfpSidebar />
                </div>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ProposalPage;
