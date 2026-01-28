"use client";

// ShadCn
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Components
import {
  PdfViewer,
  BaseButton,
  NewProposalAlert,
  ProposalLoaderModal,
  ProposalExportModal,
  NewProjectModal,
} from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { FileInput, FolderUp, Import, Plus, RotateCcw } from "lucide-react";

const ProposalActions = () => {
  const { proposalPdfLoading, newProposal } = useProposalContext();

  const { _t } = useTranslationContext();
  return (
    <div className="w-full">
      <Card className="h-auto sticky top-4 rounded-lg shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle>{_t("actions.title")}</CardTitle>
          <CardDescription>{_t("actions.description")}</CardDescription>
        </CardHeader>

        <div className="flex flex-col flex-wrap items-center gap-3 px-2 pb-6">
          <div className="flex flex-wrap gap-3 w-full">
            {/* Load modal button */}
            <ProposalLoaderModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Open load proposal menu"
                disabled={proposalPdfLoading}
                className="flex-1 min-w-[140px]"
              >
                <FolderUp />
                {_t("actions.loadProposal")}
              </BaseButton>
            </ProposalLoaderModal>

            {/* Export modal button */}
            <ProposalExportModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Open export proposal menu"
                disabled={proposalPdfLoading}
                className="flex-1 min-w-[140px]"
              >
                <Import />
                {_t("actions.exportProposal")}
              </BaseButton>
            </ProposalExportModal>
          </div>

          <div className="flex flex-wrap gap-3 w-full">
            {/* New project / workspace provisioning */}
            <NewProjectModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Initialize a new AI workspace + proposal"
                disabled={proposalPdfLoading}
                className="flex-1 min-w-[140px]"
              >
                <Plus />
                {_t("actions.newProposal")}
              </BaseButton>
            </NewProjectModal>

            {/* Reset form button */}
            <NewProposalAlert
              title="Reset form?"
              description="This will clear all fields and the saved draft."
              confirmLabel="Reset"
              onConfirm={newProposal}
            >
              <BaseButton
                variant="destructive"
                tooltipLabel="Reset entire form"
                disabled={proposalPdfLoading}
                className="flex-1 min-w-[140px]"
              >
                <RotateCcw />
                Reset Form
              </BaseButton>
            </NewProposalAlert>

            {/* Generate pdf button */}
            <BaseButton
              type="submit"
              tooltipLabel="Generate your proposal"
              loading={proposalPdfLoading}
              loadingText="Generating your proposal"
              className="flex-1 min-w-[140px]"
            >
              <FileInput />
              {_t("actions.generatePdf")}
            </BaseButton>
          </div>

          <div className="w-full mt-4">
            {/* Live preview and Final pdf */}
            <PdfViewer />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProposalActions;
