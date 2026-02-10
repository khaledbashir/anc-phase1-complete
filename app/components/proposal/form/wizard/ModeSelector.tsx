"use client";

import { useFormContext } from "react-hook-form";
import { FileSpreadsheet, Calculator, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowMode = "mirror" | "intelligence" | "rfp";

interface ModeSelectorProps {
  onSelect: (mirror: boolean, mode?: WorkflowMode) => void;
}

/**
 * ModeSelector — Full-screen gate shown before Step 1 on new projects.
 * Three options: Upload Excel, Build from Scratch, or Start from RFP.
 */
const ModeSelector = ({ onSelect }: ModeSelectorProps) => {
  const { setValue } = useFormContext();

  const handleSelect = (mode: WorkflowMode) => {
    if (mode === "mirror") {
      setValue("details.mirrorMode", true, { shouldDirty: true });
      setValue("details.calculationMode", "MIRROR", { shouldDirty: true });
      onSelect(true, "mirror");
    } else if (mode === "intelligence") {
      setValue("details.mirrorMode", false, { shouldDirty: true });
      setValue("details.calculationMode", "INTELLIGENCE", { shouldDirty: true });
      onSelect(false, "intelligence");
    } else {
      setValue("details.mirrorMode", false, { shouldDirty: true });
      setValue("details.calculationMode", "INTELLIGENCE", { shouldDirty: true });
      onSelect(false, "rfp");
    }
  };

  const modes = [
    {
      id: "mirror" as WorkflowMode,
      icon: FileSpreadsheet,
      title: "Upload Excel → PDF",
      description: "I have a completed Excel with pricing. Convert it to a branded proposal PDF.",
      label: "Select",
    },
    {
      id: "intelligence" as WorkflowMode,
      icon: Calculator,
      title: "Build Quote from Scratch",
      description: "Create a proposal by entering line items, setting margins, and calculating pricing.",
      label: "Select",
    },
    {
      id: "rfp" as WorkflowMode,
      icon: FileSearch,
      title: "Start from RFP",
      description: "Upload a client RFP or bid document. Specs, pricing, and schedule are extracted and pre-filled.",
      label: "Select",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-12 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          How would you like to start?
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Choose your workflow. You can switch modes later if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleSelect(mode.id)}
            className={cn(
              "group relative flex flex-col items-center text-center p-8 rounded-xl border border-border bg-card",
              "hover:border-foreground/20 hover:bg-muted/30",
              "transition-all duration-200 cursor-pointer"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-5 group-hover:bg-muted transition-colors duration-200">
              <mode.icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {mode.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mode.description}
            </p>
            <div className="mt-5 px-4 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground group-hover:border-foreground/30 group-hover:text-foreground transition-all duration-200">
              {mode.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
