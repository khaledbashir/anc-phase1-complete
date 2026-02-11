import React from "react";
import { ProposalType } from "@/types";
import { formatNumberWithCommas, sanitizeNitsForDisplay, normalizePitch } from "@/lib/helpers";

type ExhibitATechnicalSpecsProps = {
    data: ProposalType;
    showSOW?: boolean;
    headingMode?: "exhibit" | "plain";
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

/** Strip parser/debug metadata and redundant technical suffix from display names. */
const cleanDisplayName = (value: any, fallbackIndex?: number): string => {
    const raw = (value ?? "").toString().trim();
    let sanitized = sanitizeNitsForDisplay(raw);
    // Remove debug wrappers like "-- ... ---"
    sanitized = sanitized.replace(/^\s*-+\s*/g, "").replace(/\s*-+\s*$/g, "").trim();
    // Remove parser metadata like "(Page 95, Score 10)"
    sanitized = sanitized.replace(/\(\s*Page\s*\d+\s*,\s*Score\s*[\d.]+\s*\)/gi, "").trim();
    sanitized = sanitized.replace(/\s{2,}/g, " ").trim();
    if (!sanitized || /^unnamed\s+screen$/i.test(sanitized)) {
        return `Display ${fallbackIndex ? fallbackIndex + 1 : 1}`;
    }
    return sanitized;
};

/** Strip redundant technical suffix from display name (dimensions, pitch, brightness are in their own columns). */
const getShortDisplayName = (screen: any, fallbackIndex?: number): string => {
    const sanitized = cleanDisplayName(screen?.customDisplayName || screen?.externalName || screen?.name || "Display", fallbackIndex);
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

export default function ExhibitA_TechnicalSpecs({ data, showSOW = false, headingMode = "exhibit" }: ExhibitATechnicalSpecsProps) {
    const { details } = data;
    const screens = (details?.screens || []).filter((s: any) => !s?.hiddenFromSpecs);
    const sowText = (details as any)?.scopeOfWorkText;
    const hasSOWContent = showSOW && sowText && sowText.trim().length > 0;
    const specsDisplayMode: "condensed" | "extended" = (details as any)?.specsDisplayMode || "extended";
    const isCondensed = specsDisplayMode === "condensed";

    const headerText = headingMode === "exhibit"
        ? (hasSOWContent
            ? "EXHIBIT A: STATEMENT OF WORK & TECHNICAL SPECIFICATIONS"
            : "EXHIBIT A: TECHNICAL SPECIFICATIONS")
        : "TECHNICAL SPECIFICATIONS";

    const normalizedScreenRows = screens.map((screen: any, idx: number) => {
        const h = screen?.heightFt ?? screen?.height ?? 0;
        const w = screen?.widthFt ?? screen?.width ?? 0;
        const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
        const pixelsH = screen?.pixelsH || computePixels(h, pitch);
        const pixelsW = screen?.pixelsW || computePixels(w, pitch);
        const cleanName = getShortDisplayName(screen, idx);
        return {
            ...screen,
            __cleanName: cleanName,
            __key: `${cleanName.toLowerCase()}|${Number(h) || 0}|${Number(w) || 0}|${normalizePitch(pitch) || 0}|${pixelsH}|${pixelsW}`,
        };
    });

    // Remove exact duplicates (same name + dimensions + pitch + resolution)
    const dedupedScreens = normalizedScreenRows.filter((screen: any, idx: number, arr: any[]) =>
        arr.findIndex((s: any) => s.__key === screen.__key) === idx
    );

    // Name collision handling: same name with different specs -> append numbering
    const nameCounts: Record<string, number> = {};
    const normalizedNames = dedupedScreens.map((screen: any) => {
        const base = screen.__cleanName;
        nameCounts[base] = (nameCounts[base] || 0) + 1;
        return base;
    });
    const duplicates = new Set(Object.entries(nameCounts).filter(([, count]) => count > 1).map(([name]) => name));
    const duplicateSeen: Record<string, number> = {};

    const numberedScreens = dedupedScreens.map((screen: any) => {
        const base = screen.__cleanName;
        if (!duplicates.has(base)) return { ...screen, __displayName: base };
        duplicateSeen[base] = (duplicateSeen[base] || 0) + 1;
        return { ...screen, __displayName: `${base} (${duplicateSeen[base]})` };
    });

    // Only show real screens with actual spec data — synthesized rows from pricing
    // tables have no dimensions/pitch/resolution and add noise to a specs table.
    const specRows = numberedScreens;

    // Prompt 46: Hide BRIGHTNESS column if all values are null/empty/dash
    const hasAnyBrightness = specRows.some((screen: any) => {
        const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
        const brightnessNumber = Number(rawBrightness);
        return rawBrightness != null && rawBrightness !== "" && rawBrightness !== 0 && isFinite(brightnessNumber) && brightnessNumber > 0;
    });

    return (
        <div className="pt-4 break-inside-avoid">
            <div className="mb-3 mt-4 break-inside-avoid">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '3px', height: '16px', borderRadius: '1px', background: '#0A52EF', flexShrink: 0 }} />
                    <h2 className="text-[11px] font-semibold text-[#002C73] uppercase tracking-[0.15em]" style={{ margin: 0 }}>
                        {headerText}
                    </h2>
                </div>
            </div>

            <div className="border border-gray-300 break-inside-avoid overflow-hidden">
                {/* Use HTML table for reliable PDF column separation (avoids merged headers in Puppeteer) */}
                <table className="w-full text-[8px] border-collapse" style={{ tableLayout: "fixed", pageBreakInside: 'auto' }}>
                    <colgroup>
                        {isCondensed ? (
                            <>
                                <col style={{ width: "55%" }} />
                                <col style={{ width: "30%" }} />
                                <col style={{ width: "15%" }} />
                            </>
                        ) : (
                            <>
                                <col style={{ width: "28%" }} />
                                <col style={{ width: "18%" }} />
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "18%" }} />
                                {hasAnyBrightness && <col style={{ width: "14%" }} />}
                                <col style={{ width: hasAnyBrightness ? "10%" : "12%" }} />
                            </>
                        )}
                    </colgroup>
                    <thead>
                        <tr className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#002C73", borderBottom: "2px solid #0A52EF", background: "transparent", pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <th className="text-left py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>DISPLAY NAME</th>
                            <th className="text-left py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>DIMENSIONS</th>
                            {!isCondensed && <th className="text-right py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>PITCH</th>}
                            {!isCondensed && <th className="text-right py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>RESOLUTION</th>}
                            {!isCondensed && hasAnyBrightness && <th className="text-right py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>BRIGHTNESS</th>}
                            <th className="text-right py-1.5 px-2" style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>QTY</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-900">
                        {specRows.length > 0 ? (
                            specRows.map((screen: any, idx: number) => {
                                const name = screen.__displayName || getShortDisplayName(screen, idx);
                                const h = screen?.heightFt ?? screen?.height ?? 0;
                                const w = screen?.widthFt ?? screen?.width ?? 0;
                                const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
                                const qty = Number(screen?.quantity || 1);
                                const pixelsH = screen?.pixelsH || computePixels(h, pitch);
                                const pixelsW = screen?.pixelsW || computePixels(w, pitch);
                                const resolution = pixelsH && pixelsW ? `${pixelsH} x ${pixelsW}` : "—";
                                const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
                                const brightnessNumber = Number(rawBrightness);
                                const brightnessText =
                                    rawBrightness == null || rawBrightness === "" || rawBrightness === 0
                                        ? "—"
                                        : isFinite(brightnessNumber) && brightnessNumber > 0
                                            ? formatNumberWithCommas(brightnessNumber)
                                            : "—";

                                const colCount = isCondensed ? 3 : (hasAnyBrightness ? 6 : 5);

                                return (
                                    <tr
                                        key={screen?.id || `${name}-${idx}`}
                                        className="border-b border-gray-200 last:border-b-0 break-inside-avoid"
                                        style={{ minHeight: 28, pageBreakInside: 'avoid', breakInside: 'avoid' }}
                                    >
                                        <td className="py-1 px-2 font-semibold text-[8px] break-words align-top" style={{ wordBreak: "break-word" }}>
                                            {name}
                                        </td>
                                        <td className="py-1 px-2 text-gray-800 text-[8px] align-top" style={{ overflow: 'hidden' }}>
                                            {formatFeet(h)} x {formatFeet(w)}
                                        </td>
                                        {!isCondensed && (
                                            <td className="py-1 px-2 text-right tabular-nums text-[8px] align-top" style={{ overflow: 'hidden' }}>
                                                {pitch ? `${formatPitchMm(pitch)}mm` : "—"}
                                            </td>
                                        )}
                                        {!isCondensed && (
                                            <td className="py-1 px-2 text-right tabular-nums text-[8px] align-top" style={{ overflow: 'hidden' }}>
                                                {resolution}
                                            </td>
                                        )}
                                        {!isCondensed && hasAnyBrightness && (
                                            <td className="py-1 px-2 text-right tabular-nums text-[8px] whitespace-nowrap align-top">
                                                {brightnessText}
                                            </td>
                                        )}
                                        <td className="py-1 px-2 text-right tabular-nums text-[8px] align-top">
                                            {isFinite(qty) ? qty : "—"}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={isCondensed ? 3 : (hasAnyBrightness ? 6 : 5)} className="px-3 py-6 text-center text-gray-400 italic">
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
