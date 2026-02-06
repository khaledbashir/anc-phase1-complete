import React from "react";
import { ProposalType } from "@/types";
import { formatNumberWithCommas, sanitizeNitsForDisplay, normalizePitch } from "@/lib/helpers";

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
 * Format pixel pitch with proper decimal preservation.
 * Uses normalizePitch to guard against decimal-stripped values (125 → 1.25).
 */
const formatPitchMm = (value: any): string => {
    const corrected = normalizePitch(value);
    if (corrected <= 0) return "";
    return corrected < 2 ? corrected.toFixed(2) : corrected.toFixed(corrected % 1 === 0 ? 0 : 2);
};

/** Strip redundant technical suffix from display name (dimensions, pitch, brightness are in their own columns). */
const getShortDisplayName = (screen: any): string => {
    const raw = (screen?.externalName || screen?.name || "Display").toString().trim() || "Display";
    const sanitized = sanitizeNitsForDisplay(raw);
    // Truncate at " : " followed by a dimension pattern (digits + apostrophe/feet or "Diameter")
    const colonDimMatch = sanitized.match(/^(.+?)\s*:\s*\d+(\.\d+)?[''′]?\s*(h\b|x\b|Diameter)/i);
    if (colonDimMatch) return colonDimMatch[1].replace(/[\s\-–—:]+$/, "").trim();
    // Truncate at " - " followed by digits (catches "1.875mm SMD" suffixes)
    const dashDigitMatch = sanitized.match(/^(.+?)\s+-\s+\d+(\.\d+)?\s*mm\b/i);
    if (dashDigitMatch) return dashDigitMatch[1].replace(/[\s\-–—:]+$/, "").trim();
    return sanitized;
};

const computePixels = (feetValue: any, pitchMm: any) => {
    const ft = Number(feetValue);
    const pitch = normalizePitch(pitchMm);
    if (!isFinite(ft) || ft <= 0) return 0;
    if (pitch <= 0) return 0;
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

            <div className="border border-gray-300 break-inside-avoid overflow-hidden">
                {/* Use HTML table for reliable PDF column separation (avoids merged headers in Puppeteer) */}
                <table className="w-full text-[9px] border-collapse" style={{ tableLayout: "fixed", pageBreakInside: 'auto' }}>
                    <thead>
                        <tr className="text-[9px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <th className="text-left py-2 px-2 w-[30%]">Display Name</th>
                            <th className="text-left py-2 px-2 w-[15%]">Dimensions</th>
                            <th className="text-right py-2 px-2 w-[12%]">Pitch</th>
                            <th className="text-right py-2 px-2 w-[18%]">Resolution</th>
                            <th className="text-right py-2 px-2 w-[13%]">Brightness</th>
                            <th className="text-right py-2 px-2 w-[12%]">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-900">
                        {screens.length > 0 ? (
                            screens.map((screen: any, idx: number) => {
                                const name = getShortDisplayName(screen);
                                const h = screen?.heightFt ?? screen?.height ?? 0;
                                const w = screen?.widthFt ?? screen?.width ?? 0;
                                const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
                                const qty = Number(screen?.quantity || 1);
                                const pixelsH = screen?.pixelsH || computePixels(h, pitch);
                                const pixelsW = screen?.pixelsW || computePixels(w, pitch);
                                const resolution = pixelsH && pixelsW ? `${pixelsH} x ${pixelsW}` : "—";
                                const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
                                const brightnessNumber = Number(rawBrightness);
                                // Validate that brightness is a valid number, not a hex color or other string
                                const brightnessText =
                                    rawBrightness == null || rawBrightness === "" || rawBrightness === 0
                                        ? "—"
                                        : isFinite(brightnessNumber) && brightnessNumber > 0
                                            ? formatNumberWithCommas(brightnessNumber)
                                            : "—";

                                return (
                                    <tr
                                        key={screen?.id || `${name}-${idx}`}
                                        className="border-b border-gray-200 last:border-b-0 break-inside-avoid"
                                        style={{ minHeight: 28, pageBreakInside: 'avoid', breakInside: 'avoid' }}
                                    >
                                        <td className="py-1.5 px-2 font-semibold text-[9px] break-words align-top" style={{ wordBreak: "break-word" }}>
                                            {name}
                                        </td>
                                        <td className="py-1.5 px-2 text-gray-800 text-[9px] whitespace-nowrap align-top">
                                            {formatFeet(h)} x {formatFeet(w)}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-[9px] whitespace-nowrap align-top">
                                            {pitch ? `${formatPitchMm(pitch)}mm` : "—"}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-[9px] whitespace-nowrap align-top">
                                            {resolution}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-[9px] whitespace-nowrap align-top">
                                            {brightnessText}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-[9px] align-top">
                                            {isFinite(qty) ? qty : "—"}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-gray-400 italic">
                                    No screens configured.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
