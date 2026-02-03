import React from "react";
import { ProposalType } from "@/types";
import { formatNumberWithCommas } from "@/lib/helpers";

type ExhibitATechnicalSpecsProps = {
    data: ProposalType;
};

const formatFeet = (value: any) => {
    const n = Number(value);
    if (!isFinite(n)) return "";
    return `${n.toFixed(2)}'`;
};

const computePixels = (feetValue: any, pitchMm: any) => {
    const ft = Number(feetValue);
    const pitch = Number(pitchMm);
    if (!isFinite(ft) || ft <= 0) return 0;
    if (!isFinite(pitch) || pitch <= 0) return 0;
    return Math.round((ft * 304.8) / pitch);
};

export default function ExhibitA_TechnicalSpecs({ data }: ExhibitATechnicalSpecsProps) {
    const { details } = data;
    const screens = details?.screens || [];

    return (
        <div className="pt-8">
            <div className="text-center mb-8">
                <h2 className="text-[12px] font-bold text-[#0A52EF] uppercase tracking-[0.2em]">
                    EXHIBIT A: STATEMENT OF WORK &amp; TECHNICAL SPECIFICATIONS
                </h2>
            </div>

            <div className="border border-gray-300 break-inside-avoid">
                <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300">
                    <div className="col-span-4 px-3 py-2">Display Name</div>
                    <div className="col-span-3 px-3 py-2">Dimensions</div>
                    <div className="col-span-1 px-3 py-2 text-right">Pitch</div>
                    <div className="col-span-2 px-3 py-2 text-right">Resolution</div>
                    <div className="col-span-1 px-3 py-2 text-right">Brightness</div>
                    <div className="col-span-1 px-3 py-2 text-right">Qty</div>
                </div>

                <div className="text-[10px] text-gray-900">
                    {screens.length > 0 ? (
                        screens.map((screen: any, idx: number) => {
                            const name = (screen?.externalName || screen?.name || "Display").toString().trim() || "Display";
                            const h = screen?.heightFt ?? screen?.height ?? 0;
                            const w = screen?.widthFt ?? screen?.width ?? 0;
                            const pitch = screen?.pitchMm ?? screen?.pixelPitch ?? 0;
                            const qty = Number(screen?.quantity || 1);
                            const pixelsH = screen?.pixelsH || computePixels(h, pitch);
                            const pixelsW = screen?.pixelsW || computePixels(w, pitch);
                            const resolution = pixelsH && pixelsW ? `${pixelsH} x ${pixelsW}` : "";
                            const rawBrightness = screen?.brightness ?? screen?.brightnessNits ?? screen?.nits;
                            const brightnessNumber = Number(rawBrightness);
                            const brightnessText =
                                rawBrightness == null || rawBrightness === ""
                                    ? "Standard"
                                    : isFinite(brightnessNumber) && brightnessNumber > 0
                                        ? `${formatNumberWithCommas(brightnessNumber)} nits`
                                        : rawBrightness.toString();

                            return (
                                <div key={screen?.id || `${name}-${idx}`} className="grid grid-cols-12 border-b border-gray-200 last:border-b-0 break-inside-avoid">
                                    <div className="col-span-4 px-3 py-2 font-semibold">{name}</div>
                                    <div className="col-span-3 px-3 py-2 text-gray-800">
                                        {formatFeet(h)} x {formatFeet(w)}
                                    </div>
                                    <div className="col-span-1 px-3 py-2 text-right tabular-nums">{pitch ? `${Number(pitch).toFixed(0)}mm` : ""}</div>
                                    <div className="col-span-2 px-3 py-2 text-right tabular-nums">{resolution}</div>
                                    <div className="col-span-1 px-3 py-2 text-right tabular-nums">{brightnessText}</div>
                                    <div className="col-span-1 px-3 py-2 text-right tabular-nums">{isFinite(qty) ? qty : ""}</div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-3 py-6 text-center text-gray-400 italic">No screens configured.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
