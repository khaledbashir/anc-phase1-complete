"use client";

/**
 * SpecSheetCard — Renders product match results from a SPEC_QUERY action.
 * Displays all of Matt's required parameters: cabinet dims (imperial+metric),
 * layout, resolution, weight, power, brightness, etc.
 */

import { cn } from "@/lib/utils";
import { Monitor, Zap, Scale, Grid3X3, Ruler, Sun, Wrench } from "lucide-react";

interface SpecResult {
  product: {
    id: string;
    manufacturer: string;
    productFamily: string;
    modelNumber: string;
    displayName: string;
    pixelPitch: number;
    environment: string;
    serviceType: string;
    ipRating: string | null;
    supportsHalfModule: boolean;
    isCurved: boolean;
  };
  cabinet: {
    widthMm: number;
    heightMm: number;
    depthMm: number | null;
    widthInches: number;
    heightInches: number;
    weightKg: number;
    weightLbs: number;
  };
  layout: {
    modulesWide: number;
    modulesHigh: number;
    totalModules: number;
    rows: number;
    cabinetsPerRow: number;
  };
  screenDimensions: {
    widthMm: number;
    heightMm: number;
    widthFt: number;
    heightFt: number;
    widthInches: number;
    heightInches: number;
    fitPercentage: number;
  };
  resolution: {
    horizontal: number;
    vertical: number;
    total: string;
  };
  weight: {
    perScreenKg: number;
    perScreenLbs: number;
    totalKg: number;
    totalLbs: number;
  };
  power: {
    maxPerScreenWatts: number;
    typicalPerScreenWatts: number | null;
    maxTotalWatts: number;
    typicalTotalWatts: number | null;
    maxPerScreenKW: number;
    maxTotalKW: number;
  };
  brightness: {
    maxNits: number;
    typicalNits: number | null;
  };
  quantity: number;
}

interface SpecSheetCardProps {
  results: SpecResult[];
  query: Record<string, unknown>;
  onAddScreen?: (result: SpecResult) => void;
}

export function SpecSheetCard({ results, query, onAddScreen }: SpecSheetCardProps) {
  if (!results || results.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        No products match your criteria. Try adjusting pixel pitch, brightness, or environment.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {results.length} product{results.length > 1 ? "s" : ""} found
      </div>
      {results.slice(0, 3).map((result, i) => (
        <SingleSpecCard key={result.product.id} result={result} rank={i + 1} onAddScreen={onAddScreen} />
      ))}
    </div>
  );
}

function SingleSpecCard({
  result,
  rank,
  onAddScreen,
}: {
  result: SpecResult;
  rank: number;
  onAddScreen?: (result: SpecResult) => void;
}) {
  const { product, cabinet, layout, screenDimensions, resolution, weight, power, brightness, quantity } = result;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0A52EF]/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-[#0A52EF]" />
          <span className="font-semibold text-foreground">{product.displayName}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{product.modelNumber}</span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Quick badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge>{product.pixelPitch}mm</Badge>
          <Badge>{product.environment}</Badge>
          <Badge>{product.serviceType.replace("_", "/")}</Badge>
          {product.ipRating && <Badge>{product.ipRating}</Badge>}
          {product.isCurved && <Badge>curved</Badge>}
        </div>

        {/* Cabinet Dimensions */}
        <Section icon={<Ruler className="h-3 w-3" />} title="Cabinet">
          <Row label="Size" value={`${cabinet.widthMm} x ${cabinet.heightMm} mm (${cabinet.widthInches}" x ${cabinet.heightInches}")`} />
          {cabinet.depthMm && <Row label="Depth" value={`${cabinet.depthMm} mm`} />}
          <Row label="Weight" value={`${cabinet.weightKg} kg (${cabinet.weightLbs} lbs)`} />
        </Section>

        {/* Screen Layout */}
        <Section icon={<Grid3X3 className="h-3 w-3" />} title="Layout">
          <Row label="Panels" value={`${layout.cabinetsPerRow} wide x ${layout.rows} high = ${layout.totalModules} total`} />
          <Row label="Screen Size" value={`${screenDimensions.widthFt}' x ${screenDimensions.heightFt}' (${screenDimensions.widthMm} x ${screenDimensions.heightMm} mm)`} />
          {screenDimensions.fitPercentage < 100 && (
            <Row label="Fit" value={`${screenDimensions.fitPercentage}% of target`} />
          )}
        </Section>

        {/* Resolution */}
        <Section icon={<Monitor className="h-3 w-3" />} title="Resolution">
          <Row label="Per Screen" value={resolution.total} />
        </Section>

        {/* Weight */}
        <Section icon={<Scale className="h-3 w-3" />} title="Weight">
          <Row label="Per Screen" value={`${weight.perScreenKg} kg (${weight.perScreenLbs} lbs)`} />
          {quantity > 1 && (
            <Row label={`Total (${quantity} screens)`} value={`${weight.totalKg} kg (${weight.totalLbs} lbs)`} highlight />
          )}
        </Section>

        {/* Power */}
        <Section icon={<Zap className="h-3 w-3" />} title="Power">
          <Row label="Max/Screen" value={`${power.maxPerScreenWatts}W (${power.maxPerScreenKW} kW)`} />
          {power.typicalPerScreenWatts && (
            <Row label="Typical/Screen" value={`${power.typicalPerScreenWatts}W`} />
          )}
          {quantity > 1 && (
            <Row label={`Max Total (${quantity})`} value={`${power.maxTotalWatts}W (${power.maxTotalKW} kW)`} highlight />
          )}
        </Section>

        {/* Brightness */}
        <Section icon={<Sun className="h-3 w-3" />} title="Brightness">
          <Row label="Max" value={`${brightness.maxNits} nits`} />
          {brightness.typicalNits && <Row label="Typical" value={`${brightness.typicalNits} nits`} />}
        </Section>
      </div>

      {/* Footer: Add to proposal */}
      {onAddScreen && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <button
            onClick={() => onAddScreen(result)}
            className="w-full text-center text-[10px] font-medium text-[#0A52EF] hover:text-[#0A52EF]/80 transition-colors"
          >
            + Add to proposal
          </button>
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {icon}
        {title}
      </div>
      <div className="space-y-0.5 pl-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-2", highlight && "font-semibold text-foreground")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-mono", highlight ? "text-[#0A52EF]" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export default SpecSheetCard;
