"use client";

/**
 * QuestionFlow — Typeform-style one-question-at-a-time questionnaire.
 *
 * Features:
 * - Smooth vertical transitions between questions
 * - Progress bar at top
 * - Keyboard navigation (Enter to advance, Shift+Enter to go back)
 * - Display loop: "Add another display?" creates repeating sections
 * - Live callback on every answer change for real-time preview
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, Check, ArrowRight, Package, Loader2, Building2, Monitor, DollarSign, Sparkles, Ruler, ArrowUpDown, Wand2 } from "lucide-react";
import {
    PROJECT_QUESTIONS,
    DISPLAY_QUESTIONS,
    FINANCIAL_QUESTIONS,
    DISPLAY_TYPE_PRESETS,
    type Question,
    type EstimatorAnswers,
    type DisplayAnswers,
    getDefaultAnswers,
    getDefaultDisplayAnswers,
} from "./questions";
import { calculateCabinetLayout, type ProductSpec } from "./EstimatorBridge";
import { feetToFeetInches, formatDeltaInches, mmToFeet } from "@/lib/imperialFormat";

interface QuestionFlowProps {
    answers: EstimatorAnswers;
    onChange: (answers: EstimatorAnswers) => void;
    onComplete?: () => void;
    productSpecs?: Record<string, ProductSpec>;
}

export default function QuestionFlow({ answers, onChange, onComplete, productSpecs }: QuestionFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [phase, setPhase] = useState<"project" | "display" | "financial" | "complete">("project");
    const [displayIndex, setDisplayIndex] = useState(0);
    const [aiMode, setAiMode] = useState(false);
    const [aiDescription, setAiDescription] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // AI Quick Estimate — describe your project, AI fills the form
    const handleAiQuickEstimate = useCallback(async () => {
        if (!aiDescription.trim() || aiDescription.trim().length < 10) {
            setAiError("Please describe the project in at least 10 characters.");
            return;
        }
        setAiLoading(true);
        setAiError("");
        try {
            const res = await fetch("/api/estimator/ai-quick", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: aiDescription.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "AI extraction failed");
            }
            // Merge AI-extracted answers into current state
            const next = { ...answers };
            if (data.answers.clientName) next.clientName = data.answers.clientName;
            if (data.answers.projectName) next.projectName = data.answers.projectName;
            if (data.answers.location) next.location = data.answers.location;
            if (data.answers.docType) next.docType = data.answers.docType;
            if (data.answers.currency) next.currency = data.answers.currency;
            if (typeof data.answers.isIndoor === "boolean") next.isIndoor = data.answers.isIndoor;
            if (typeof data.answers.isNewInstall === "boolean") next.isNewInstall = data.answers.isNewInstall;
            if (typeof data.answers.isUnion === "boolean") next.isUnion = data.answers.isUnion;
            // Merge displays
            if (Array.isArray(data.displays) && data.displays.length > 0) {
                next.displays = data.displays.map((d: any) => ({
                    ...getDefaultDisplayAnswers(),
                    displayName: d.displayName || "",
                    displayType: d.displayType || "custom",
                    locationType: d.locationType || "wall",
                    widthFt: d.widthFt || 0,
                    heightFt: d.heightFt || 0,
                    pixelPitch: String(d.pixelPitch || "4"),
                    installComplexity: d.installComplexity || "standard",
                    serviceType: d.serviceType || "Front/Rear",
                    isReplacement: Boolean(d.isReplacement),
                }));
            }
            onChange(next);
            // Jump to financial phase (project + displays filled)
            setAiMode(false);
            setPhase("financial");
            setCurrentStep(0);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : "AI extraction failed");
        } finally {
            setAiLoading(false);
        }
    }, [aiDescription, answers, onChange]);

    // Build the flat question list for current state
    const questions = getQuestionList(phase, displayIndex);
    const currentQ = questions[currentStep];

    const totalSteps = PROJECT_QUESTIONS.length
        + (DISPLAY_QUESTIONS.length * Math.max(answers.displays.length, 1))
        + FINANCIAL_QUESTIONS.length;
    const globalStep = phase === "project"
        ? currentStep
        : phase === "display"
            ? PROJECT_QUESTIONS.length + (displayIndex * DISPLAY_QUESTIONS.length) + currentStep
            : PROJECT_QUESTIONS.length + (answers.displays.length * DISPLAY_QUESTIONS.length) + currentStep;
    const progress = Math.min((globalStep / totalSteps) * 100, 100);

    // Get current answer value
    const getValue = useCallback(() => {
        if (!currentQ) return "";
        if (phase === "project" || phase === "financial") {
            return (answers as any)[currentQ.id] ?? currentQ.defaultValue ?? "";
        }
        if (phase === "display") {
            const d = answers.displays[displayIndex];
            if (!d) return currentQ.defaultValue ?? "";
            if (currentQ.id === "dimensions") {
                return { widthFt: d.widthFt, heightFt: d.heightFt };
            }
            return (d as any)[currentQ.id] ?? currentQ.defaultValue ?? "";
        }
        return "";
    }, [currentQ, phase, answers, displayIndex]);

    // Set answer value
    const setValue = useCallback((val: any) => {
        const next = { ...answers };
        if (phase === "project" || phase === "financial") {
            (next as any)[currentQ.id] = val;
        } else if (phase === "display") {
            // Ensure display exists
            while (next.displays.length <= displayIndex) {
                next.displays.push(getDefaultDisplayAnswers());
            }
            const d = { ...next.displays[displayIndex] };
            if (currentQ.id === "dimensions") {
                d.widthFt = val.widthFt;
                d.heightFt = val.heightFt;
            } else {
                (d as any)[currentQ.id] = val;
            }
            next.displays[displayIndex] = d;
        }
        onChange(next);
    }, [answers, phase, currentQ, displayIndex, onChange]);

    // Set multiple display fields at once (used by display-type presets)
    const setDisplayFields = useCallback((fields: Partial<DisplayAnswers>) => {
        const next = { ...answers };
        while (next.displays.length <= displayIndex) {
            next.displays.push(getDefaultDisplayAnswers());
        }
        next.displays[displayIndex] = { ...next.displays[displayIndex], ...fields };
        onChange(next);
    }, [answers, displayIndex, onChange]);

    // Navigation
    const goNext = useCallback(() => {
        // Check if current question should be skipped forward
        if (currentStep < questions.length - 1) {
            // Special: display-loop question
            if (currentQ?.type === "display-loop") {
                return; // Handled by addDisplay / finishDisplays buttons
            }
            setCurrentStep((s) => s + 1);
        } else {
            // End of phase
            if (phase === "project") {
                // Ensure at least one display
                if (answers.displays.length === 0) {
                    const next = { ...answers, displays: [getDefaultDisplayAnswers()] };
                    onChange(next);
                }
                setPhase("display");
                setDisplayIndex(0);
                setCurrentStep(0);
            } else if (phase === "display") {
                // This shouldn't happen normally (display-loop handles it)
                setPhase("financial");
                setCurrentStep(0);
            } else if (phase === "financial") {
                setPhase("complete");
                onComplete?.();
            }
        }
    }, [currentStep, questions.length, phase, currentQ, answers, onChange, onComplete]);

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        } else if (phase === "financial") {
            setPhase("display");
            setDisplayIndex(Math.max(answers.displays.length - 1, 0));
            setCurrentStep(DISPLAY_QUESTIONS.length - 1);
        } else if (phase === "display" && displayIndex > 0) {
            setDisplayIndex((i) => i - 1);
            setCurrentStep(DISPLAY_QUESTIONS.length - 1);
        } else if (phase === "display" && displayIndex === 0) {
            setPhase("project");
            setCurrentStep(PROJECT_QUESTIONS.length - 1);
        }
    }, [currentStep, phase, displayIndex, answers.displays.length]);

    const addDisplay = useCallback(() => {
        const next = { ...answers };
        next.displays = [...next.displays, getDefaultDisplayAnswers()];
        onChange(next);
        setDisplayIndex(next.displays.length - 1);
        setCurrentStep(0);
    }, [answers, onChange]);

    const finishDisplays = useCallback(() => {
        setPhase("financial");
        setCurrentStep(0);
    }, []);

    // Skip questions with showIf that returns false
    useEffect(() => {
        if (!currentQ) return;
        if (currentQ.showIf) {
            const displayAnswers = answers.displays[displayIndex] || getDefaultDisplayAnswers();
            if (!currentQ.showIf(displayAnswers as any, displayIndex)) {
                // Skip this question
                if (currentStep < questions.length - 1) {
                    setCurrentStep((s) => s + 1);
                }
            }
        }
    }, [currentStep, currentQ, answers, displayIndex, questions.length]);

    // Keyboard nav
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                goNext();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goNext]);

    if (phase === "complete") {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Estimate Complete</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-md">
                    Your cost analysis is ready. Review the Excel preview on the right,
                    then export the workbook.
                </p>
                <button
                    onClick={() => { setPhase("project"); setCurrentStep(0); }}
                    className="text-sm text-[#0A52EF] hover:underline"
                >
                    Edit answers
                </button>
            </div>
        );
    }

    if (!currentQ) return null;

    return (
        <div ref={containerRef} className="h-full flex flex-col">
            {/* Stage indicator */}
            <div className="shrink-0 px-6 pt-4 pb-2">
                <StageIndicator
                    phase={phase}
                    displayIndex={displayIndex}
                    displayCount={Math.max(answers.displays.length, 1)}
                    progress={progress}
                />
            </div>

            {/* Question area */}
            <div className="flex-1 flex flex-col items-center justify-start px-8 py-12 overflow-y-auto">
                {/* AI Quick Estimate mode */}
                {aiMode ? (
                    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <Wand2 className="w-4 h-4 text-[#0A52EF]" />
                            <span className="text-xs font-bold text-[#0A52EF]">AI Quick Estimate</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground mb-1 leading-tight">
                            Describe your project
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Tell us about the venue, displays, and requirements. AI will fill in the form for you.
                        </p>
                        <textarea
                            value={aiDescription}
                            onChange={(e) => setAiDescription(e.target.value)}
                            placeholder="e.g., Indiana Fever at Gainbridge Fieldhouse needs a new 20x12 main scoreboard at 4mm, two 100x3 ribbon boards at 6mm around the concourse, and a 30x6 marquee at 10mm for the entrance. Indoor, new install, union labor required."
                            rows={5}
                            autoFocus
                            disabled={aiLoading}
                            className="w-full bg-transparent border-2 border-border focus:border-[#0A52EF] rounded-lg outline-none text-sm py-3 px-4 transition-colors placeholder:text-muted-foreground/40 resize-none disabled:opacity-50"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleAiQuickEstimate();
                                }
                            }}
                        />
                        {aiError && (
                            <p className="text-xs text-destructive mt-2">{aiError}</p>
                        )}
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                onClick={handleAiQuickEstimate}
                                disabled={aiLoading || aiDescription.trim().length < 10}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {aiLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Fill Form with AI
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => { setAiMode(false); setAiError(""); }}
                                disabled={aiLoading}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                                Fill manually instead
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3">
                            <kbd className="px-1 py-0.5 bg-accent rounded text-[10px]">Ctrl+Enter</kbd> to submit
                        </p>
                    </div>
                ) : (
                <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300" key={`${phase}-${displayIndex}-${currentStep}`}>
                    {/* AI Quick button — show on first project question */}
                    {phase === "project" && currentStep === 0 && (
                        <button
                            onClick={() => setAiMode(true)}
                            className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[#0A52EF]/30 hover:border-[#0A52EF]/60 hover:bg-[#0A52EF]/5 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#0A52EF]/10 group-hover:bg-[#0A52EF]/20 flex items-center justify-center transition-colors">
                                <Wand2 className="w-4 h-4 text-[#0A52EF]" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-foreground">Describe your project</div>
                                <div className="text-xs text-muted-foreground">Let AI fill in the form from a plain-English description</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-[#0A52EF] transition-colors" />
                        </button>
                    )}

                    {/* Question number */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-[#0A52EF]">
                            {globalStep + 1}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#0A52EF]" />
                    </div>

                    {/* Question label */}
                    <h2 className="text-2xl font-semibold text-foreground mb-1 leading-tight">
                        {currentQ.label}
                    </h2>
                    {currentQ.subtitle && (
                        <p className="text-sm text-muted-foreground mb-6">{currentQ.subtitle}</p>
                    )}

                    {/* Input */}
                    <QuestionInput
                        question={currentQ}
                        value={getValue()}
                        onChange={setValue}
                        onNext={goNext}
                        setDisplayFields={setDisplayFields}
                        answers={answers}
                        displayIndex={displayIndex}
                        productSpecs={productSpecs}
                        phase={phase}
                    />

                    {/* Display loop buttons */}
                    {currentQ.type === "display-loop" && (
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={addDisplay}
                                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/80 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Display
                            </button>
                            <button
                                onClick={finishDisplays}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90 rounded-lg text-sm font-medium transition-colors"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Next button (for non-loop questions) */}
                    {currentQ.type !== "display-loop" && (
                        <div className="mt-6 flex items-center gap-3">
                            <button
                                onClick={goNext}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90 rounded-lg text-sm font-medium transition-colors"
                            >
                                OK
                                <Check className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] text-muted-foreground">
                                press <kbd className="px-1 py-0.5 bg-accent rounded text-[10px]">Enter ↵</kbd>
                            </span>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Bottom nav */}
            <div className="shrink-0 px-6 py-3 border-t border-border flex items-center justify-between">
                <button
                    onClick={goBack}
                    disabled={phase === "project" && currentStep === 0}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Back
                </button>
                <button
                    onClick={goNext}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Skip
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// STAGE INDICATOR — Visual phase stepper
// ============================================================================

const STAGES = [
    { key: "project", label: "Project", icon: Building2 },
    { key: "display", label: "Displays", icon: Monitor },
    { key: "financial", label: "Financial", icon: DollarSign },
    { key: "complete", label: "Done", icon: Sparkles },
] as const;

function StageIndicator({
    phase,
    displayIndex,
    displayCount,
    progress,
}: {
    phase: string;
    displayIndex: number;
    displayCount: number;
    progress: number;
}) {
    const currentIdx = STAGES.findIndex((s) => s.key === phase);

    return (
        <div className="space-y-3">
            {/* Stage pills */}
            <div className="flex items-center gap-1">
                {STAGES.map((stage, i) => {
                    const isActive = stage.key === phase;
                    const isDone = i < currentIdx;
                    const Icon = stage.icon;

                    return (
                        <React.Fragment key={stage.key}>
                            {i > 0 && (
                                <div className={cn(
                                    "flex-1 h-0.5 rounded-full transition-all duration-500",
                                    isDone ? "bg-[#0A52EF]" : isActive ? "bg-[#0A52EF]/30" : "bg-border"
                                )} />
                            )}
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 whitespace-nowrap",
                                isActive && "bg-[#0A52EF] text-white shadow-sm shadow-[#0A52EF]/25",
                                isDone && "bg-[#0A52EF]/10 text-[#0A52EF]",
                                !isActive && !isDone && "text-muted-foreground/50"
                            )}>
                                {isDone ? (
                                    <Check className="w-3 h-3" />
                                ) : (
                                    <Icon className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">{stage.label}</span>
                                {isActive && phase === "display" && (
                                    <span className="text-[9px] opacity-80">
                                        {displayIndex + 1}/{displayCount}
                                    </span>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Thin progress bar */}
            <div className="h-0.5 bg-border rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#0A52EF] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

// ============================================================================
// QUESTION INPUT RENDERER
// ============================================================================

function QuestionInput({
    question,
    value,
    onChange,
    onNext,
    setDisplayFields,
    answers,
    displayIndex,
    productSpecs,
    phase,
}: {
    question: Question;
    value: any;
    onChange: (val: any) => void;
    onNext: () => void;
    setDisplayFields?: (fields: Partial<DisplayAnswers>) => void;
    answers?: EstimatorAnswers;
    displayIndex?: number;
    productSpecs?: Record<string, ProductSpec>;
    phase?: string;
}) {
    switch (question.type) {
        case "text":
            return (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={question.placeholder}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-border focus:border-[#0A52EF] outline-none text-lg py-2 transition-colors placeholder:text-muted-foreground/40"
                />
            );

        case "number":
            return (
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        value={value ?? question.defaultValue ?? ""}
                        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                        min={question.min}
                        max={question.max}
                        step={question.step}
                        autoFocus
                        className="w-32 bg-transparent border-b-2 border-border focus:border-[#0A52EF] outline-none text-lg py-2 transition-colors text-right"
                    />
                    {question.unit && (
                        <span className="text-sm text-muted-foreground font-medium">{question.unit}</span>
                    )}
                </div>
            );

        case "select":
            return (
                <div className="space-y-2 mt-2">
                    {question.options?.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setTimeout(onNext, 200); }}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                                value === opt.value
                                    ? "border-[#0A52EF] bg-[#0A52EF]/5"
                                    : "border-border hover:border-[#0A52EF]/40 hover:bg-accent/20"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                    value === opt.value ? "border-[#0A52EF] bg-[#0A52EF]" : "border-border"
                                )}>
                                    {value === opt.value && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{opt.label}</div>
                                    {opt.description && (
                                        <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            );

        case "dimensions": {
            const currentDisplay = (phase === "display" && answers?.displays) ? answers.displays[displayIndex ?? 0] : null;
            const currentProductId = currentDisplay?.productId;
            const currentProductSpec = currentProductId && productSpecs ? productSpecs[currentProductId] : null;
            const snapLayout = (value?.widthFt > 0 && value?.heightFt > 0 && currentProductSpec)
                ? calculateCabinetLayout(value.widthFt, value.heightFt, currentProductSpec, currentDisplay?.productName)
                : null;

            return (
                <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1 block">Width (ft)</label>
                            <input
                                type="number"
                                value={value?.widthFt || ""}
                                onChange={(e) => onChange({ ...value, widthFt: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.5}
                                autoFocus
                                className="w-28 bg-transparent border-b-2 border-border focus:border-[#0A52EF] outline-none text-lg py-2 transition-colors text-center"
                            />
                        </div>
                        <span className="text-2xl text-muted-foreground mt-5">×</span>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1 block">Height (ft)</label>
                            <input
                                type="number"
                                value={value?.heightFt || ""}
                                onChange={(e) => onChange({ ...value, heightFt: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.5}
                                className="w-28 bg-transparent border-b-2 border-border focus:border-[#0A52EF] outline-none text-lg py-2 transition-colors text-center"
                            />
                        </div>
                        {value?.widthFt > 0 && value?.heightFt > 0 && (
                            <div className="ml-2 mt-5 text-sm text-muted-foreground">
                                = <span className="font-semibold text-foreground">{(value.widthFt * value.heightFt).toFixed(1)}</span> sqft
                            </div>
                        )}
                    </div>

                    {/* Metric Mirror — Snap Result Card */}
                    {snapLayout && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                                <Ruler className="w-3 h-3" />
                                Metric Mirror — Snap to {snapLayout.cabinetWidthMm}×{snapLayout.cabinetHeightMm}mm
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <div className="text-muted-foreground">Actual Width</div>
                                    <div className="font-semibold text-foreground">
                                        {feetToFeetInches(snapLayout.actualWidthFt)}
                                        <span className="text-muted-foreground font-normal ml-1">({snapLayout.actualWidthFt.toFixed(2)} ft)</span>
                                    </div>
                                    <div className={cn(
                                        "text-[10px] font-medium",
                                        Math.abs(snapLayout.deltaWidthInches) < 0.5 ? "text-emerald-600" :
                                        Math.abs(snapLayout.deltaWidthInches) <= 2 ? "text-amber-600" : "text-red-600"
                                    )}>
                                        {formatDeltaInches(snapLayout.deltaWidthFt).text}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Actual Height</div>
                                    <div className="font-semibold text-foreground">
                                        {feetToFeetInches(snapLayout.actualHeightFt)}
                                        <span className="text-muted-foreground font-normal ml-1">({snapLayout.actualHeightFt.toFixed(2)} ft)</span>
                                    </div>
                                    <div className={cn(
                                        "text-[10px] font-medium",
                                        Math.abs(snapLayout.deltaHeightInches) < 0.5 ? "text-emerald-600" :
                                        Math.abs(snapLayout.deltaHeightInches) <= 2 ? "text-amber-600" : "text-red-600"
                                    )}>
                                        {formatDeltaInches(snapLayout.deltaHeightFt).text}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Module Grid</div>
                                    <div className="font-semibold text-foreground">
                                        {snapLayout.columnsCount} × {snapLayout.rowsCount}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {snapLayout.totalCabinets} cabinets · {snapLayout.actualAreaSqFt} sqft
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                <span>{snapLayout.actualResolutionW} × {snapLayout.actualResolutionH} px</span>
                                <span>·</span>
                                <span>{snapLayout.totalWeightLbs.toLocaleString()} lbs</span>
                                <span>·</span>
                                <span>{snapLayout.totalMaxPowerW.toLocaleString()} W</span>
                            </div>
                        </div>
                    )}

                    {/* Hint when no product selected */}
                    {value?.widthFt > 0 && value?.heightFt > 0 && !currentProductSpec && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3" />
                            Select an LED product to see snap-to-grid dimensions
                        </div>
                    )}
                </div>
            );
        }

        case "yes-no":
            return (
                <div className="flex gap-3 mt-2">
                    {[
                        { val: true, label: "Yes" },
                        { val: false, label: "No" },
                    ].map((opt) => (
                        <button
                            key={String(opt.val)}
                            onClick={() => { onChange(opt.val); setTimeout(onNext, 200); }}
                            className={cn(
                                "px-6 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                                value === opt.val
                                    ? "border-[#0A52EF] bg-[#0A52EF]/5"
                                    : "border-border hover:border-[#0A52EF]/40"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            );

        case "display-type":
            return (
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {DISPLAY_TYPE_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => {
                                if (setDisplayFields) {
                                    setDisplayFields({
                                        displayType: preset.value,
                                        displayName: preset.value === "custom" ? "" : preset.label,
                                        ...preset.defaults,
                                    });
                                } else {
                                    onChange(preset.value);
                                }
                                setTimeout(onNext, 200);
                            }}
                            className={cn(
                                "text-left px-4 py-3 rounded-lg border-2 transition-all",
                                value === preset.value
                                    ? "border-[#0A52EF] bg-[#0A52EF]/5"
                                    : "border-border hover:border-[#0A52EF]/40 hover:bg-accent/20"
                            )}
                        >
                            <div className="text-sm font-medium">{preset.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
                        </button>
                    ))}
                </div>
            );

        case "product-select":
            return (
                <ProductSelectInput
                    value={value}
                    answers={answers}
                    displayIndex={displayIndex}
                    setDisplayFields={setDisplayFields}
                    onNext={onNext}
                />
            );

        case "display-loop":
            return null; // Buttons handled in parent

        default:
            return null;
    }
}

// ============================================================================
// PRODUCT SELECTOR — Fetches from /api/products, filtered by pitch + environment
// ============================================================================

function ProductSelectInput({
    value,
    answers,
    displayIndex,
    setDisplayFields,
    onNext,
}: {
    value: string;
    answers?: EstimatorAnswers;
    displayIndex?: number;
    setDisplayFields?: (fields: Partial<DisplayAnswers>) => void;
    onNext: () => void;
}) {
    const [products, setProducts] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Current display's pitch for filtering
    const currentDisplay = answers?.displays[(displayIndex ?? 0)] || getDefaultDisplayAnswers();
    const pitch = parseFloat(currentDisplay.pixelPitch) || 4;
    const env = answers?.isIndoor ? "indoor" : "outdoor";

    React.useEffect(() => {
        let cancelled = false;
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Filter by environment + pitch (±0.5mm tolerance for variations)
                const params = new URLSearchParams({
                    environment: env,
                    pitchMin: String(Math.max(0, pitch - 0.5)),
                    pitchMax: String(pitch + 0.5),
                });
                const res = await fetch(`/api/products?${params.toString()}`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setProducts(data.products || []);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchProducts();
        return () => { cancelled = true; };
    }, [pitch, env]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading catalog...
            </div>
        );
    }

    return (
        <div className="space-y-2 mt-2">
            {products.length === 0 && (
                <p className="text-sm text-muted-foreground mb-3">
                    No {env} products found at {pitch}mm pitch. You can skip this step.
                </p>
            )}
            {products.map((p: any) => (
                <button
                    key={p.id}
                    onClick={() => {
                        if (setDisplayFields) {
                            setDisplayFields({ productId: p.id, productName: p.displayName });
                        }
                        setTimeout(onNext, 200);
                    }}
                    className={cn(
                        "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                        value === p.id
                            ? "border-[#0A52EF] bg-[#0A52EF]/5"
                            : "border-border hover:border-[#0A52EF]/40 hover:bg-accent/20"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.displayName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                                <span>{p.manufacturer}</span>
                                <span>{p.pixelPitch}mm</span>
                                {p.maxNits && <span>{p.maxNits} nits</span>}
                                {p.costPerSqFt && <span>${p.costPerSqFt}/sqft</span>}
                            </div>
                        </div>
                        {value === p.id && <Check className="w-4 h-4 text-[#0A52EF] shrink-0" />}
                    </div>
                </button>
            ))}
            <button
                onClick={() => {
                    if (setDisplayFields) {
                        setDisplayFields({ productId: "", productName: "" });
                    }
                    onNext();
                }}
                className="w-full text-left px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-[#0A52EF]/40 hover:bg-accent/20 transition-all"
            >
                <div className="text-sm text-muted-foreground">Skip — use rate card pricing instead</div>
            </button>
        </div>
    );
}

// ============================================================================
// HELPERS
// ============================================================================

function getQuestionList(phase: string, displayIndex: number): Question[] {
    switch (phase) {
        case "project":
            return PROJECT_QUESTIONS;
        case "display":
            return DISPLAY_QUESTIONS;
        case "financial":
            return FINANCIAL_QUESTIONS;
        default:
            return [];
    }
}
