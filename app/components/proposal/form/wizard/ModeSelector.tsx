"use client";

import { useFormContext } from "react-hook-form";
import { FileSpreadsheet, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeSelectorProps {
  onSelect: (mirror: boolean) => void;
}

/**
 * ModeSelector — Full-screen gate shown before Step 1 on new projects.
 * Two large cards: "Upload Excel → PDF" (mirror) vs "Build Quote from Scratch" (intelligence).
 */
const ModeSelector = ({ onSelect }: ModeSelectorProps) => {
  const { setValue } = useFormContext();

  const handleSelect = (mirror: boolean) => {
    setValue("details.mirrorMode", mirror, { shouldDirty: true });
    setValue("details.calculationMode", mirror ? "MIRROR" : "INTELLIGENCE", {
      shouldDirty: true,
    });
    onSelect(mirror);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-12 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          How would you like to start?
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Choose your workflow. You can switch modes later if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* Option A: Upload Excel → PDF */}
        <button
          type="button"
          onClick={() => handleSelect(true)}
          className={cn(
            "group relative flex flex-col items-center text-center p-10 rounded-2xl border-2 border-border bg-card",
            "hover:border-[#0A52EF]/50 hover:bg-[#0A52EF]/5 hover:shadow-[0_0_30px_rgba(10,82,239,0.1)]",
            "transition-all duration-300 cursor-pointer"
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#0A52EF]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <FileSpreadsheet className="w-8 h-8 text-[#0A52EF]" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Upload Excel → PDF
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            I have a completed Excel with pricing. Just make it a branded PDF.
          </p>
          <div className="mt-6 px-5 py-2 rounded-lg bg-[#0A52EF]/10 text-[#0A52EF] text-xs font-semibold uppercase tracking-wider group-hover:bg-[#0A52EF] group-hover:text-white transition-all duration-300">
            Select
          </div>
        </button>

        {/* Option B: Build Quote from Scratch */}
        <button
          type="button"
          onClick={() => handleSelect(false)}
          className={cn(
            "group relative flex flex-col items-center text-center p-10 rounded-2xl border-2 border-border bg-card",
            "hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
            "transition-all duration-300 cursor-pointer"
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Calculator className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Build Quote from Scratch
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            I need to create a proposal by entering items, setting margins, and
            calculating pricing.
          </p>
          <div className="mt-6 px-5 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-semibold uppercase tracking-wider group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
            Select
          </div>
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
