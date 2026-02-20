import React from "react";
import { Loader2, Sparkles } from "lucide-react";

interface ExtractButtonProps {
    onExtract: () => void;
    isExtracting: boolean;
    keepPageCount: number;
    projectContext: string;
    onProjectContextChange: (val: string) => void;
}

export default function ExtractButton({
    onExtract,
    isExtracting,
    keepPageCount,
    projectContext,
    onProjectContextChange
}: ExtractButtonProps) {

    // Helper text depending on loading state
    const buttonText = isExtracting
        ? "Extracting Specs..."
        : `Extract Screen Specs from ${keepPageCount} Keep Pages`;

    return (
        <div className="mt-8 bg-zinc-900/40 border border-border p-6 rounded-2xl flex flex-col items-center justify-center space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Hardware Extraction
            </h3>

            <p className="text-sm text-muted-foreground text-center max-w-lg">
                Let AI automatically pull structured LED screen specifications (Dimensions, Pitch, Brightness, Location) directly from the text documentation and architectural drawings you've marked as "Keep".
            </p>

            <div className="w-full max-w-md pt-2">
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                    Project Context (Optional)
                </label>
                <input
                    type="text"
                    disabled={isExtracting}
                    placeholder="e.g. Acme Arena RFP, Stadium Renovation"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    value={projectContext}
                    onChange={(e) => onProjectContextChange(e.target.value)}
                />
            </div>

            <button
                onClick={onExtract}
                disabled={isExtracting || keepPageCount === 0}
                className="mt-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
                {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {buttonText}
            </button>

            {isExtracting && (
                <p className="text-xs text-muted-foreground animate-pulse pt-2">
                    This uses Vision and Text inference and may take 30-60 seconds...
                </p>
            )}

            {keepPageCount === 0 && !isExtracting && (
                <p className="text-xs text-destructive pt-2 text-center">
                    You must have at least one "Keep" page to run hardware extraction.
                </p>
            )}
        </div>
    );
}
