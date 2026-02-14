import React from "react";
import type { PdfColors } from "./shared";
import { DEFAULT_SIGNATURE_BLOCK_TEXT } from "./shared";

interface PdfSignatureBlockProps {
    colors: PdfColors;
    receiverName: string;
    signatureBlockText?: string;
}

const PdfSignatureBlock = ({ colors, receiverName, signatureBlockText }: PdfSignatureBlockProps) => (
    <div data-preview-section="signature" className="mt-4 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div className="text-[10px] leading-snug text-justify mb-3 break-inside-avoid" style={{ color: colors.textMuted }}>
            {(signatureBlockText || "").trim() || DEFAULT_SIGNATURE_BLOCK_TEXT}
        </div>
        <h4 className="font-bold text-[10px] uppercase mb-3 border-b-2 pb-0.5 break-inside-avoid" style={{ borderColor: colors.text, color: colors.text }}>
            Agreed To And Accepted:
        </h4>
        <div className="grid grid-cols-2 gap-4 break-inside-avoid">
            {[
                { title: "ANC Sports Enterprises, LLC", subtitle: "Seller" },
                { title: receiverName || "Purchaser", subtitle: "Purchaser" }
            ].map((party, idx) => (
                <div key={idx} className="space-y-2 break-inside-avoid">
                    <div className="break-inside-avoid">
                        <div className="font-bold text-[10px]" style={{ color: colors.primary }}>{party.title}</div>
                        <div className="text-[9px]" style={{ color: colors.textMuted }}>{party.subtitle}</div>
                    </div>
                    <div className="break-inside-avoid">
                        <div className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: colors.textMuted }}>Signature</div>
                        <div className="h-6 border-b-2" style={{ borderColor: colors.border }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 break-inside-avoid">
                        <div className="break-inside-avoid">
                            <div className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: colors.textMuted }}>Name</div>
                            <div className="h-5 border-b" style={{ borderColor: colors.border }} />
                        </div>
                        <div className="break-inside-avoid">
                            <div className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: colors.textMuted }}>Date</div>
                            <div className="h-5 border-b" style={{ borderColor: colors.border }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default PdfSignatureBlock;
