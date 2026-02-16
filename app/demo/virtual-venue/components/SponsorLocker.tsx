"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSponsorLogos } from "../hooks/useSponsorLogos";
import type { ZoneState } from "../hooks/useVenueState";

interface SponsorLockerProps {
  activeZones: ZoneState[];
}

export default function SponsorLocker({ activeZones }: SponsorLockerProps) {
  const { logos, addLogo, removeLogo, assignToZone, unassignFromZone, getLogoForZone } =
    useSponsorLogos();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(addLogo);
    e.target.value = "";
  };

  const handleDragStart = (logoId: string) => {
    setDraggingLogoId(logoId);
  };

  const handleDragOver = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(zoneId);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(null);
    if (draggingLogoId) {
      assignToZone(draggingLogoId, zoneId);
      setDraggingLogoId(null);
    }
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Sponsor Locker
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Upload logos and drag them onto active zones
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Logo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Logo gallery */}
        {logos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {logos.map((logo) => (
              <div
                key={logo.id}
                draggable
                onDragStart={() => handleDragStart(logo.id)}
                className={cn(
                  "relative group w-20 h-14 rounded-lg border border-border bg-white flex items-center justify-center p-1.5 cursor-grab active:cursor-grabbing transition-all",
                  logo.assignedZone && "ring-2 ring-primary ring-offset-1",
                  draggingLogoId === logo.id && "opacity-50"
                )}
              >
                <img
                  src={logo.dataUrl}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
                <button
                  onClick={() => removeLogo(logo.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {logo.assignedZone && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-primary text-[8px] text-white font-medium whitespace-nowrap">
                    {logo.assignedZone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {logos.length === 0 && (
          <div
            className="border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Drop sponsor logos here or click to upload
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, SVG, WebP</p>
          </div>
        )}

        {/* Drop targets for active zones */}
        {logos.length > 0 && activeZones.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3" />
              Drag logos to active zones:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {activeZones.map((zone) => {
                const assigned = getLogoForZone(zone.id);
                return (
                  <div
                    key={zone.id}
                    onDragOver={(e) => handleDragOver(e, zone.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, zone.id)}
                    className={cn(
                      "relative rounded-lg border border-dashed p-2 text-center transition-all min-h-[60px] flex flex-col items-center justify-center",
                      dragOverZone === zone.id
                        ? "border-primary bg-primary/10 scale-105"
                        : assigned
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/20"
                    )}
                  >
                    {assigned ? (
                      <div className="relative w-full h-10 flex items-center justify-center">
                        <img
                          src={assigned.dataUrl}
                          alt={assigned.name}
                          className="max-w-full max-h-full object-contain"
                          style={{
                            // Mild perspective warp to simulate screen angle
                            transform: zone.id === "scoreboard"
                              ? "perspective(200px) rotateX(5deg)"
                              : zone.id.includes("ribbon")
                                ? "perspective(300px) rotateY(3deg) scaleX(1.2)"
                                : "perspective(200px) rotateY(2deg)",
                          }}
                        />
                        <button
                          onClick={() => unassignFromZone(zone.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center text-[10px]"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Drop here</span>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-full">
                      {zone.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
