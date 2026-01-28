"use client";

import React from "react";
import { Check, Copy, Brain } from "lucide-react";
import { useState } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { CalculationMode } from "@/types";
import ModeSwitchWarning from "./ModeSwitchWarning";

interface CalculationModePathCardsProps {
  className?: string;
}

const CalculationModePathCards = ({ className }: CalculationModePathCardsProps) => {
  const { calculationMode, setCalculationMode } = useProposalContext();
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<CalculationMode | null>(null);

  const handleModeClick = (mode: CalculationMode) => {
    // If switching from INTELLIGENCE to MIRROR, show warning
    if (calculationMode === CalculationMode.INTELLIGENCE && mode === CalculationMode.MIRROR) {
      setPendingMode(mode);
      setWarningOpen(true);
    } else {
      // Direct switch for other cases
      setCalculationMode(mode);
    }
  };

  const handleConfirmSwitch = () => {
    if (pendingMode) {
      setCalculationMode(pendingMode);
      setPendingMode(null);
    }
    setWarningOpen(false);
  };

  const modes = [
    {
      value: CalculationMode.INTELLIGENCE,
      title: "Intelligence Mode",
      subtitle: "Natalia Math Engine",
      description: "Activate full commercial optimization with automatic margin calculations, profitability analysis, and intelligent pricing recommendations.",
      icon: Brain,
      color: "blue",
      gradient: "from-blue-600/20 to-purple-600/20",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/50",
      buttonLabel: "Define Specs",
      workflow: ["Define Specs", "Optimize Pricing", "Generate LOI"]
    },
    {
      value: CalculationMode.MIRROR,
      title: "Mirror Mode",
      subtitle: "Excel Pass-Through",
      description: "Direct replication of your imported Excel pricing. Bypasses internal calculations for precise 1:1 PDF generation.",
      icon: Copy,
      color: "emerald",
      gradient: "from-emerald-600/20 to-teal-600/20",
      iconColor: "text-emerald-500",
      borderColor: "border-emerald-500/50",
      buttonLabel: "Verify Specs",
      workflow: ["Verify Specs", "Verify P&L", "Generate LOI"]
    }
  ];

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-zinc-100">Calculation Mode</h3>
        <span className="text-xs text-zinc-500 font-bold">Primary Branch Decision Gate</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const isSelected = calculationMode === mode.value;
          const Icon = mode.icon;

          return (
            <div
              key={mode.value}
              onClick={() => handleModeClick(mode.value)}
              className={`
                relative cursor-pointer rounded-xl border-2 transition-all duration-300
                ${isSelected
                  ? `${mode.borderColor} ${mode.gradient} bg-gradient-to-br`
                  : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-${mode.color}-500 flex items-center justify-center`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="p-6">
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${isSelected ? `bg-${mode.color}-500/20` : "bg-zinc-800/50"}`}>
                    <Icon className={`w-6 h-6 ${mode.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-base font-bold ${isSelected ? "text-zinc-100" : "text-zinc-400"}`}>
                      {mode.title}
                    </h4>
                    <p className="text-sm text-zinc-500 mt-0.5">{mode.subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-sm ${isSelected ? "text-zinc-300" : "text-zinc-500"} mb-4 leading-relaxed`}>
                  {mode.description}
                </p>

                {/* Workflow Steps */}
                <div className="flex items-center gap-2 text-xs">
                  {mode.workflow.map((step, idx) => (
                    <React.Fragment key={step}>
                      <span className={`${isSelected ? "text-zinc-400" : "text-zinc-600"}`}>{step}</span>
                      {idx < mode.workflow.length - 1 && (
                        <span className="text-zinc-700">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mode Switch Warning Dialog */}
      <ModeSwitchWarning
        open={warningOpen}
        onOpenChange={setWarningOpen}
        onConfirm={handleConfirmSwitch}
        fromMode={calculationMode}
        toMode={pendingMode || calculationMode}
      />
    </div>
  );
};

export default CalculationModePathCards;
