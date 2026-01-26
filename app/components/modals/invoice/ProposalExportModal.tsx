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

    const { proposalPdfLoading, exportProposalAs } = useProposalContext();
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export the invoice</DialogTitle>
                    <DialogDescription>
                        Please select export option for your invoice
                    </DialogDescription>
                </DialogHeader>

                {/* Export options here */}

                <div className="flex flex-wrap flex-row gap-5">
                    <BaseButton
                        tooltipLabel="Export Invoice as JSON"
                        variant="outline"
                        disabled={proposalPdfLoading}
                        onClick={() => exportProposalAs(ExportTypes.JSON)}
                    >
                        Export as JSON
                    </BaseButton>
                    <BaseButton
                        tooltipLabel="Export Invoice as CSV"
                        variant="outline"
                        disabled={proposalPdfLoading}
                        onClick={() => exportProposalAs(ExportTypes.CSV)}
                    >
                        Export as CSV
                    </BaseButton>

                    <BaseButton
                        tooltipLabel="Export Invoice as XML"
                        variant="outline"
                        disabled={proposalPdfLoading}
                        onClick={() => exportProposalAs(ExportTypes.XML)}
                    >
                        Export as XML
                    </BaseButton>

                    <BaseButton
                        tooltipLabel="Export Invoice as XLSX"
                        variant="outline"
                        disabled={proposalPdfLoading}
                        onClick={() => exportProposalAs(ExportTypes.XLSX)}
                    >
                        Export as XLSX
                    </BaseButton>

                    <BaseButton
                        tooltipLabel="Export Internal Audit (XLSX)"
                        variant="outline"
                        disabled={proposalPdfLoading}
                        onClick={() => exportAudit()}
                    >
                        Export Internal Audit (XLSX)
                    </BaseButton>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ProposalExportModal;
