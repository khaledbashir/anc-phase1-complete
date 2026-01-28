"use client";

import { useState } from "react";

// ShadCn
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Components
import { BaseButton } from "@/app/components";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";

// Types
import { ExportTypes } from "@/types";

type ProposalExportModalType = {
    children: React.ReactNode;
};

const ProposalExportModal = ({ children }: ProposalExportModalType) => {
    const [open, setOpen] = useState(false);

    const { proposalPdfLoading, exportProposalAs, exportAudit } = useProposalContext();
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export the proposal</DialogTitle>
                    <DialogDescription>
                        Please select export option for your proposal
                    </DialogDescription>
                </DialogHeader>

                {/* Export options here */}

                <BaseButton
                    tooltipLabel="Export Internal Audit (XLSX)"
                    variant="default"
                    className="bg-[#0A52EF] hover:bg-[#004080] text-white w-full"
                    disabled={proposalPdfLoading}
                    onClick={() => exportAudit()}
                >
                    Download Internal Audit (XLSX)
                </BaseButton>

                <div className="w-full border-t border-zinc-200 my-2" />

                <BaseButton
                    tooltipLabel="Export Proposal as JSON"
                    variant="outline"
                    disabled={proposalPdfLoading}
                    onClick={() => exportProposalAs(ExportTypes.JSON)}
                >
                    JSON Data
                </BaseButton>
                <BaseButton
                    tooltipLabel="Export Proposal as CSV"
                    variant="outline"
                    disabled={proposalPdfLoading}
                    onClick={() => exportProposalAs(ExportTypes.CSV)}
                >
                    CSV Data
                </BaseButton>

                <BaseButton
                    tooltipLabel="Export Proposal as XML"
                    variant="outline"
                    disabled={proposalPdfLoading}
                    onClick={() => exportProposalAs(ExportTypes.XML)}
                >
                    XML Data
                </BaseButton>
            </DialogContent>
        </Dialog>
    );
};

export default ProposalExportModal;
