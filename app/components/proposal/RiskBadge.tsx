"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  HardHat, 
  Sun, 
  Clock, 
  Shield, 
  AlertTriangle,
  FileWarning,
  Scale,
  type LucideIcon
} from "lucide-react";

export type RiskType = 
  | "union" 
  | "outdoor" 
  | "liquidatedDamages" 
  | "performanceBond"
  | "spareParts"
  | "wtc"
  | "prevailingWage"
  | "dimensionalTolerance";

interface RiskConfig {
  type: RiskType;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  impact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
}

export const RISK_CONFIGS: Record<RiskType, RiskConfig> = {
  union: {
    type: "union",
    label: "Union Labor",
    icon: HardHat,
    color: "text-amber-600",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-200",
    description: "IBEW-certified labor required",
    impact: "Labor costs may be 2-3x higher than standard",
    priority: "CRITICAL"
  },
  outdoor: {
    type: "outdoor",
    label: "Outdoor/IP65",
    icon: Sun,
    color: "text-[#0A52EF]",
    bgColor: "bg-[#0A52EF]",
    borderColor: "border-[#0A52EF]/20",
    description: "IP65 weatherproofing required",
    impact: "Adds HVAC, surge protection, and weather sealing costs",
    priority: "HIGH"
  },
  liquidatedDamages: {
    type: "liquidatedDamages",
    label: "Liquidated Damages",
    icon: Clock,
    color: "text-red-600",
    bgColor: "bg-red-500",
    borderColor: "border-red-200",
    description: "Schedule penalties apply",
    impact: "Financial penalties for late completion",
    priority: "CRITICAL"
  },
  performanceBond: {
    type: "performanceBond",
    label: "Performance Bond",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-200",
    description: "1.5% bond required",
    impact: "Adds 1.5% to total project cost",
    priority: "HIGH"
  },
  spareParts: {
    type: "spareParts",
    label: "Spare Parts",
    icon: FileWarning,
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    borderColor: "border-orange-200",
    description: "5% attic stock required",
    impact: "Bid will be non-compliant without spare parts",
    priority: "HIGH"
  },
  wtc: {
    type: "wtc",
    label: "WTC / High Security",
    icon: Shield,
    color: "text-red-700",
    bgColor: "bg-red-600",
    borderColor: "border-red-300",
    description: "High-security site requirements",
    impact: "Requires SWAC badges, night-only work, strict delivery windows",
    priority: "CRITICAL"
  },
  prevailingWage: {
    type: "prevailingWage",
    label: "Prevailing Wage",
    icon: Scale,
    color: "text-amber-700",
    bgColor: "bg-amber-600",
    borderColor: "border-amber-300",
    description: "Davis-Bacon Act requirements",
    impact: "Certified payroll documentation required",
    priority: "HIGH"
  },
  dimensionalTolerance: {
    type: "dimensionalTolerance",
    label: "Tolerance Violation",
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    borderColor: "border-yellow-200",
    description: "Display dimensions exceed tolerance",
    impact: "Display may not fit structural opening",
    priority: "MEDIUM"
  }
};

interface RiskBadgeProps {
  riskType: RiskType;
  variant?: "badge" | "card" | "minimal";
  showTooltip?: boolean;
  className?: string;
  customLabel?: string;
  onClick?: () => void;
}

export function RiskBadge({ 
  riskType, 
  variant = "badge", 
  showTooltip = true,
  className,
  customLabel,
  onClick
}: RiskBadgeProps) {
  const config = RISK_CONFIGS[riskType];
  const Icon = config.icon;

  const badgeContent = (
    <Badge
      className={cn(
        "text-[10px] border-0 font-medium transition-all",
        variant === "badge" && [
          "text-white hover:opacity-90",
          config.bgColor
        ],
        variant === "minimal" && [
          "bg-transparent border",
          config.borderColor,
          config.color
        ],
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {customLabel || config.label}
      </span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", config.color)} />
              <span className="font-semibold text-xs">{config.label}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[9px] ml-auto",
                  config.priority === "CRITICAL" && "border-red-300 text-red-600",
                  config.priority === "HIGH" && "border-amber-300 text-amber-600",
                  config.priority === "MEDIUM" && "border-[#0A52EF]/30 text-[#0A52EF]"
                )}
              >
                {config.priority}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{config.description}</p>
            <div className="pt-1 border-t border-border">
              <p className="text-[10px]">
                <span className="font-medium">Impact:</span> {config.impact}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RiskBadgeGroupProps {
  riskTypes: RiskType[];
  variant?: "badge" | "card" | "minimal";
  showTooltip?: boolean;
  className?: string;
  maxVisible?: number;
}

export function RiskBadgeGroup({
  riskTypes,
  variant = "badge",
  showTooltip = true,
  className,
  maxVisible = 3
}: RiskBadgeGroupProps) {
  const visibleRisks = riskTypes.slice(0, maxVisible);
  const remainingCount = riskTypes.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleRisks.map((riskType) => (
        <RiskBadge
          key={riskType}
          riskType={riskType}
          variant={variant}
          showTooltip={showTooltip}
        />
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] border-muted-foreground/30 text-muted-foreground"
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}

interface RiskCardProps {
  riskType: RiskType;
  className?: string;
}

export function RiskCard({ riskType, className }: RiskCardProps) {
  const config = RISK_CONFIGS[riskType];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border bg-card",
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-md text-white shrink-0", config.bgColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{config.label}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[9px]",
                config.priority === "CRITICAL" && "border-red-300 text-red-600",
                config.priority === "HIGH" && "border-amber-300 text-amber-600",
                config.priority === "MEDIUM" && "border-blue-300 text-blue-600"
              )}
            >
              {config.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          <p className="text-[11px] mt-2">
            <span className="font-medium">Impact:</span> {config.impact}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RiskBadge;
