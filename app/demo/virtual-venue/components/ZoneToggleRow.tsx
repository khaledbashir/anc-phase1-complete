"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { VenueZone } from "../data/venueZones";

interface ZoneToggleRowProps {
  zone: VenueZone;
  isActive: boolean;
  sellPrice: number;
  onToggle: (id: string) => void;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ZoneToggleRow({ zone, isActive, sellPrice, onToggle }: ZoneToggleRowProps) {
  const area = zone.defaultWidthFt * zone.defaultHeightFt * zone.quantity;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
        isActive ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <Switch
        checked={isActive}
        onCheckedChange={() => onToggle(zone.id)}
        className="shrink-0"
      />
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-colors shrink-0",
            isActive ? "bg-primary/10" : "bg-muted"
          )}
        >
          <zone.icon
            className={cn(
              "w-4 h-4 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className={cn(
            "text-sm font-medium leading-tight truncate transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}>
            {zone.name}
            {zone.quantity > 1 && (
              <span className="text-xs text-muted-foreground ml-1">x{zone.quantity}</span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {zone.defaultWidthFt}×{zone.defaultHeightFt}ft · {zone.pixelPitch} · {area.toLocaleString()} sqft
          </p>
        </div>
      </div>
      <span
        className={cn(
          "text-sm font-mono tabular-nums shrink-0 transition-colors",
          isActive ? "text-foreground font-medium" : "text-muted-foreground/50"
        )}
      >
        {isActive ? formatPrice(sellPrice) : "$0"}
      </span>
    </div>
  );
}
