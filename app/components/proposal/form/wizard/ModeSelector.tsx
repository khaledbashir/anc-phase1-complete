"use client";

import { useFormContext } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, PenTool, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowMode = "mirror" | "intelligence";

interface ModeSelectorProps {
  onSelect: (mirror: boolean, mode?: WorkflowMode) => void;
}

/**
 * ModeSelector — Full-screen gate shown before Step 1 on new projects.
 * Two options: Upload Excel (Mirror) or Build a Proposal (Intelligence).
 */
const ModeSelector = ({ onSelect }: ModeSelectorProps) => {
  const { setValue } = useFormContext();
  const router = useRouter();

  const handleSelect = (mode: WorkflowMode) => {
    if (mode === "mirror") {
      setValue("details.mirrorMode", true, { shouldDirty: true });
      setValue("details.calculationMode", "MIRROR", { shouldDirty: true });
      onSelect(true, "mirror");
    } else {
      setValue("details.mirrorMode", false, { shouldDirty: true });
      setValue("details.calculationMode", "INTELLIGENCE", { shouldDirty: true });
      onSelect(false, "intelligence");
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
      icon: PenTool,
      title: "Build from Scratch",
      description: "Start a new proposal without an RFP. Add screens and configure pricing manually.",
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
        {/* RFP Filter — primary path */}
        <button
          type="button"
          onClick={() => router.push("/tools/pdf-filter")}
          className={cn(
            "group relative flex flex-col items-center text-center p-8 rounded-xl border-2 border-brand-blue/30 bg-brand-blue/5",
            "hover:border-brand-blue/50 hover:bg-brand-blue/10",
            "transition-all duration-200 cursor-pointer"
          )}
        >
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand-blue text-white text-[10px] font-bold uppercase tracking-wider">
            Recommended
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-5 group-hover:bg-brand-blue/20 transition-colors duration-200">
            <FileSearch className="w-6 h-6 text-brand-blue" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            I Have an RFP
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Got a large RFP PDF? Filter it down to only the relevant pages first, then build your proposal from the clean version.
          </p>
          <div className="mt-5 px-4 py-1.5 rounded-md border border-brand-blue/30 text-xs font-medium text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all duration-200">
            Filter RFP
          </div>
        </button>

        {/* Existing modes */}
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
