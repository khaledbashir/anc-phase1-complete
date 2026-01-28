"use client";

// ShadCn
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Components
import {
  BaseButton,
  NewProposalAlert,
  ProposalLoaderModal,
  ProposalExportModal,
} from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { FolderUp, Import, Plus, RotateCcw, FileText } from "lucide-react";

const ActionToolbar = () => {
  const { proposalPdfLoading, newProposal, resetProposal } = useProposalContext();
  const { _t } = useTranslationContext();

  return (
    <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
      <div className="flex items-center gap-1 flex-1">
        <span className="text-xs text-zinc-500 px-2">Actions</span>
        <div className="h-4 w-px bg-zinc-800" />
      </div>

      <ProposalLoaderModal>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          disabled={proposalPdfLoading}
        >
          <FolderUp className="w-4 h-4 mr-2" />
          <span className="text-xs">{_t("actions.loadProposal")}</span>
        </Button>
      </ProposalLoaderModal>

      <ProposalExportModal>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          disabled={proposalPdfLoading}
        >
          <Import className="w-4 h-4 mr-2" />
          <span className="text-xs">{_t("actions.exportProposal")}</span>
        </Button>
      </ProposalExportModal>

      <NewProposalAlert>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          disabled={proposalPdfLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-xs">{_t("actions.newProposal")}</span>
        </Button>
      </NewProposalAlert>

      <NewProposalAlert
        title="Reset form?"
        description="This will clear all fields and re-fetch the baseline data from the Vault."
        confirmLabel="Reset"
        onConfirm={resetProposal}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-red-400 hover:bg-red-950/50"
          disabled={proposalPdfLoading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          <span className="text-xs">Reset</span>
        </Button>
      </NewProposalAlert>
    </div>
  );
};

export default ActionToolbar;
