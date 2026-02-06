import React from "react";
import { ProposalType } from "@/types";
import { formatNumberWithCommas, sanitizeNitsForDisplay } from "@/lib/helpers";

type ExhibitATechnicalSpecsProps = {
    data: ProposalType;
    showSOW?: boolean;
};

const formatFeet = (value: any) => {
    const n = Number(value);
    if (!isFinite(n)) return "";
    return `${n.toFixed(2)}'`;
};

/**
 * Format pixel pitch with proper decimal preservation
 * Handles edge case where "1.25" might be stored as "125" (decimal stripped)
 */
const formatPitchMm = (value: any): string => {
    if (!value) return "";
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return "";
    // If pitch > 50, it's likely a decimal-stripped value (e.g., 125 = 1.25)
    // Normal LED pitches range from 0.7mm to 25mm
    const corrected = num > 50 ? num / 100 : num;
    // Preserve decimals for sub-2mm pitches
    return corrected < 2 ? corrected.toFixed(2) : corrected.toFixed(corrected % 1 === 0 ? 0 : 2);
};

const computePixels = (feetValue: any, pitchMm: any) => {
    const ft = Number(feetValue);
    let pitch = Number(pitchMm);
    if (!isFinite(ft) || ft <= 0) return 0;
    if (!isFinite(pitch) || pitch <= 0) return 0;
    // Auto-correct decimal-stripped pitch (e.g., 125 -> 1.25)
    if (pitch > 50) pitch = pitch / 100;
    return Math.round((ft * 304.8) / pitch);
};

export default function ExhibitA_TechnicalSpecs({ data, showSOW = false }: ExhibitATechnicalSpecsProps) {
    const { details } = data;
    const screens = details?.screens || [];
    const sowText = (details as any)?.scopeOfWorkText;
    const hasSOWContent = showSOW && sowText && sowText.trim().length > 0;
    
    const headerText = hasSOWContent 
        ? "EXHIBIT A: STATEMENT OF WORK & TECHNICAL SPECIFICATIONS"
        : "EXHIBIT A: TECHNICAL SPECIFICATIONS";

    return (
        <div className="pt-8 break-inside-avoid">
            <div className="text-center mb-8 break-inside-avoid">
                <h2 className="text-[12px] font-bold text-[#0A52EF] uppercase tracking-[0.2em]">
                    {headerText}
                </h2>
            </div>

            <div className="border border-gray-300 break-inside-avoid">
                {/* Table Header - adjusted column widths for tight single-line rows */}
                <div className="grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 break-inside-avoid">
                    <div className="col-span-3 px-2 py-2">Display Name</div>
                    <div className="col-span-2 px-2 py-2">Dimensions</div>
                    <div className="col-span-2 px-2 py-2 text-right whitespace-nowrap">Pitch</div>
                    <div className="col-span-2 px-2 py-2 text-right whitespace-nowrap">Resolution</div>
                    <div className="col-span-2 px-2 py-2 text-right whitespace-nowrap">Brightness</div>
                    <div className="col-span-1 px-2 py-2 text-right">Qty</div>
                </div>

                {/* Table Body */}
                <div className="text-[10px] text-gray-900">
                    {screens.length > 0 ? (
                        screens.map((screen: any, idx: number) => {
                            const rawName = (screen?.externalName || screen?.name || "Display").toString().trim() || "Display";
                            const name = sanitizeNitsForDisplay(rawName);
                            const h = screen?.heightFt ?? screen?.height ?? 0;
                            const w = screen?.widthFt ?? screen?.width ?? 0;
                            const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
                            const qty = Number(screen?.quantity || 1);
                            const pixelsH = screen?.pixelsH || computePixels(h, pitch);
                            const pixelsW = screen?.pixelsW || computePixels(w, pitch);
                            const resolution = pixelsH && pixelsW ? `${pixelsH} x ${pixelsW}` : "";
                            const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
                            const brightnessNumber = Number(rawBrightness);
                            // FR-2.2 FIX: Never default to "Standard" - show actual value or leave blank.
                            // Compact format for tight rows: just the number (no "Brightness" suffix)
                            const brightnessText =
                                rawBrightness == null || rawBrightness === "" || rawBrightness === 0
                                    ? "" // Was "Standard" - now blank if no value
                                    : isFinite(brightnessNumber) && brightnessNumber > 0
                                        ? formatNumberWithCommas(brightnessNumber)
                                        : sanitizeNitsForDisplay(rawBrightness.toString()).replace(/\s*Brightness$/i, "");

                            return (
                                <div
                                    key={screen?.id || `${name}-${idx}`}
                                    className="grid grid-cols-12 border-b border-gray-200 last:border-b-0 break-inside-avoid"
                                    style={{ minHeight: '28px' }}
                                >
                                    <div className="col-span-3 px-2 py-1.5 font-semibold text-[9px] break-inside-avoid truncate">{name}</div>
                                    <div className="col-span-2 px-2 py-1.5 text-gray-800 text-[9px] whitespace-nowrap break-inside-avoid">
                                        {formatFeet(h)} x {formatFeet(w)}
                                    </div>
                                    <div className="col-span-2 px-2 py-1.5 text-right tabular-nums text-[9px] whitespace-nowrap break-inside-avoid">
                                        {pitch ? `${formatPitchMm(pitch)}mm` : ""}
                                    </div>
                                    <div className="col-span-2 px-2 py-1.5 text-right tabular-nums text-[9px] whitespace-nowrap break-inside-avoid">
                                        {resolution}
                                    </div>
                                    <div className="col-span-2 px-2 py-1.5 text-right tabular-nums text-[9px] whitespace-nowrap break-inside-avoid">
                                        {brightnessText}
                                    </div>
                                    <div className="col-span-1 px-2 py-1.5 text-right tabular-nums text-[9px] break-inside-avoid">
                                        {isFinite(qty) ? qty : ""}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-3 py-6 text-center text-gray-400 italic break-inside-avoid">
                            No screens configured.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
