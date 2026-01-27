"use client";

import { useProposalContext } from "@/contexts/ProposalContext";
import { FileDown, Printer, Eye, CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BaseButton, FinalPdf } from "@/app/components";

const Step4Export = () => {
    const { downloadPdf, printPdf, previewPdfInTab } = useProposalContext();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 max-w-2xl mx-auto">
            <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <CardTitle className="text-base text-zinc-100">Export Actions</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <BaseButton onClick={downloadPdf} className="w-full justify-start" variant="default">
                        <FileDown className="w-4 h-4 mr-2" />
                        Download PDF
                    </BaseButton>
                    <BaseButton onClick={printPdf} className="w-full justify-start" variant="secondary">
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </BaseButton>
                    <BaseButton onClick={previewPdfInTab} className="w-full justify-start" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Open in New Tab
                    </BaseButton>
                </CardContent>
            </Card>

            {/* Hidden helper for generating the final file */}
            <FinalPdf />
        </div>
    );
};

export default Step4Export;
