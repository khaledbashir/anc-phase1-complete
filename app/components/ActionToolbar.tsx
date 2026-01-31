"use client";

// ShadCn
import { Button } from "@/components/ui/button";

// Components
import { NewProposalAlert } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Plus, RotateCcw } from "lucide-react";

/**
 * ActionToolbar - Simplified toolbar with only essential actions
 * Removed confusing Load/Export buttons (use Excel import in Setup step instead)
 */
const ActionToolbar = () => {
  const { proposalPdfLoading, resetProposal } = useProposalContext();

  return (
    <div className="flex items-center justify-end mb-4 px-2">

      {/* Right side - Actions */}
      <div className="flex items-center gap-1">
        <NewProposalAlert>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 h-7 px-2"
            disabled={proposalPdfLoading}
            title="Start a new project"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">New</span>
          </Button>
        </NewProposalAlert>

        <NewProposalAlert
          title="Reset form?"
          description="This will clear all changes and reload from the last saved state."
          confirmLabel="Reset"
          onConfirm={resetProposal}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-red-400 hover:bg-red-950/20 h-7 px-2"
            disabled={proposalPdfLoading}
            title="Reset to last saved state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Reset</span>
          </Button>
        </NewProposalAlert>
      </div>
    </div>
  );
};

export default ActionToolbar;
