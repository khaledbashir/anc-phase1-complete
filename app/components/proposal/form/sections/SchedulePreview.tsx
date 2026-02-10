"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { generateSchedule, type ScheduleLocation } from "@/services/rfp/scheduleGenerator";
import type { ProposalType } from "@/types";

const phaseClasses: Record<string, string> = {
    design: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    manufacturing: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    shipping: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    install: "bg-green-500/10 text-green-300 border-green-500/20",
};

const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const toIsoDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export default function SchedulePreview() {
    const { control, setValue } = useFormContext<ProposalType>();
    const details = useWatch({ name: "details", control }) as any;

    const ntpDate = (details?.ntpDate || "").toString().trim();
    const screens = Array.isArray(details?.screens) ? details.screens : [];
    const mirrorMode =
        details?.mirrorMode === true || ((details?.pricingDocument?.tables || []).length ?? 0) > 0;

    const locations = useMemo<ScheduleLocation[]>(() => {
        return screens
            .map((screen: any, idx: number) => {
                const widthFt = Number(screen?.widthFt ?? screen?.width ?? 0) || 0;
                const heightFt = Number(screen?.heightFt ?? screen?.height ?? 0) || 0;
                const exhibitArea = Number(screen?.calculatedExhibitG?.activeAreaM2 || 0) || 0;
                const areaM2 = exhibitArea > 0 ? exhibitArea : widthFt * heightFt * 0.092903;
                if (areaM2 <= 0) return null;

                const panelCountEstimate = Math.max(1, Math.round(areaM2));
                const name =
                    (screen?.externalName || screen?.name || `Location ${idx + 1}`).toString().trim() ||
                    `Location ${idx + 1}`;

                return {
                    name,
                    panelCount: panelCountEstimate,
                    installationType: screen?.zoneComplexity === "complex" ? "complex_hanging" : "standard_wall",
                } as ScheduleLocation;
            })
            .filter(Boolean) as ScheduleLocation[];
    }, [screens]);

    const generated = useMemo(() => {
        if (!ntpDate || locations.length === 0 || mirrorMode) return null;
        const parsed = new Date(`${ntpDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return null;
        return generateSchedule(parsed, locations);
    }, [locations, mirrorMode, ntpDate]);

    const serializedSchedule = useMemo(() => {
        if (!generated) return undefined;
        return {
            tasks: generated.tasks.map((task) => ({
                taskName: task.taskName,
                locationName: task.locationName,
                startDate: toIsoDateString(task.startDate),
                endDate: toIsoDateString(task.endDate),
                durationDays: task.durationDays,
                isParallel: task.isParallel,
                phase: task.phase,
            })),
            totalDurationDays: generated.totalDurationDays,
            completionDate: toIsoDateString(generated.completionDate),
        };
    }, [generated]);

    useEffect(() => {
        const current = details?.generatedSchedule;
        const currentSerialized = current ? JSON.stringify(current) : "";
        const nextSerialized = serializedSchedule ? JSON.stringify(serializedSchedule) : "";

        if (currentSerialized === nextSerialized) return;
        setValue("details.generatedSchedule" as any, serializedSchedule, {
            shouldDirty: Boolean(serializedSchedule),
            shouldValidate: false,
        });
    }, [details?.generatedSchedule, serializedSchedule, setValue]);

    if (mirrorMode) return null;

    if (!ntpDate) {
        return (
            <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Set a Notice to Proceed date to generate a project schedule.</p>
            </div>
        );
    }

    if (locations.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Add at least one screen with dimensions to generate a schedule.</p>
            </div>
        );
    }

    if (!serializedSchedule || serializedSchedule.tasks.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Unable to generate schedule from current inputs.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Project Schedule</h4>
                <div className="text-[11px] text-muted-foreground">
                    NTP {formatDate(ntpDate)} • Complete {formatDate(serializedSchedule.completionDate)}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-muted/30 text-muted-foreground text-left">
                            <th className="px-3 py-2 font-medium">#</th>
                            <th className="px-3 py-2 font-medium">Task</th>
                            <th className="px-3 py-2 font-medium">Location</th>
                            <th className="px-3 py-2 font-medium">Start</th>
                            <th className="px-3 py-2 font-medium">End</th>
                            <th className="px-3 py-2 font-medium">Duration (days)</th>
                            <th className="px-3 py-2 font-medium">Phase</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {serializedSchedule.tasks.map((task, idx) => (
                            <tr key={`${task.taskName}-${task.locationName || "global"}-${idx}`} className="text-foreground">
                                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium">
                                    {task.isParallel ? "↳ " : ""}
                                    {task.taskName}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{task.locationName || "Global"}</td>
                                <td className="px-3 py-2">{formatDate(task.startDate)}</td>
                                <td className="px-3 py-2">{formatDate(task.endDate)}</td>
                                <td className="px-3 py-2">{task.durationDays}</td>
                                <td className="px-3 py-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-medium ${phaseClasses[task.phase] || "bg-muted text-foreground border-border"}`}>
                                        {task.phase}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="font-semibold text-foreground">{serializedSchedule.totalDurationDays} business days</span>
            </div>
        </div>
    );
}
