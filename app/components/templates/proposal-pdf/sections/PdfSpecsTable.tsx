import React from "react";
import ExhibitA_TechnicalSpecs from "@/app/components/templates/proposal-pdf/exhibits/ExhibitA_TechnicalSpecs";

interface PdfSpecsTableProps {
    data: any;
    showSOW: boolean;
    headingMode: "exhibit" | "plain";
}

const PdfSpecsTable = ({ data, showSOW, headingMode }: PdfSpecsTableProps) => (
    <div data-preview-section="exhibit-a" className="px-6">
        <ExhibitA_TechnicalSpecs data={data} showSOW={showSOW} headingMode={headingMode} />
    </div>
);

export default PdfSpecsTable;
