"use client";

import { useMemo } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { FileDown, Printer, Eye } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BaseButton, PdfViewer, FinalPdf } from "@/app/components";

const Step4Export = () => {
    const { pdfUrl, downloadPdf, printPdf, previewPdfInTab } = useProposalContext();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Actions Toolbar */}
                <div className="xl:col-span-1 space-y-4">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader>
                            <CardTitle className="text-base text-zinc-100">Actions</CardTitle>
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
                </div>

                {/* Live Preview */}
                <div className="xl:col-span-3">
                    <Card className="bg-zinc-800/50 border-zinc-700/50 overflow-hidden">
                        <div className="h-[800px] w-full bg-zinc-900/50 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                            {/* Live PDF Preview */}
                            <PdfViewer />
                        </div>
                    </Card>

                    {/* Hidden helper for generating the final file */}
                    <FinalPdf />
                </div>
            </div>
        </div>
    );
};

export default Step4Export;
