"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BrandSlashesProps {
    className?: string;
    count?: number;
    width?: number;
    height?: number;
    opacity?: number;
}

/**
 * BrandSlashes - Signature ANC 55° Slash Graphic Treatment
 * 
 * Guidelines:
 * - Angle MUST be 55°
 * - Colors from secondary palette (Splash, Malibu, Opal)
 * - Used as background/decorative accents
 */
export function BrandSlashes({
    className,
    count = 5,
    width = 200,
    height = 200,
    opacity = 0.5,
}: BrandSlashesProps) {
    return (
        <div
            className={cn("relative overflow-hidden pointer-events-none select-none", className)}
            style={{ width, height, opacity }}
        >
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/*
          Tan(55°) ≈ 1.428
          For a 100x100 box, a line at 55° from vertical:
          If we want 55° from horizontal (standard slash):
          y = -tan(55) * x + b
        */}
                {[...Array(count)].map((_, i) => {
                    const spacing = 25;
                    const xStart = -50 + i * spacing;
                    const yStart = 150;
                    // For 55 degrees from horizontal: deltaX = deltaY / tan(55)
                    // deltaY = 200 (from 150 to -50)
                    // deltaX = 200 / 1.4281 = 140.04
                    const xEnd = xStart + 140;
                    const yEnd = -50;

                    return (
                        <line
                            key={i}
                            x1={xStart}
                            y1={yStart}
                            x2={xEnd}
                            y2={yEnd}
                            stroke={
                                i % 3 === 0 ? "#03B8FF" : // Splish Splash
                                    i % 3 === 1 ? "#0385DD" : // Malibu Blue
                                        "#002C73"                 // Blue Opal
                            }
                            strokeWidth="6"
                            strokeLinecap="butt"
                        />
                    );
                })}
            </svg>

            {/* 
        Alternative CSS implementation for pattern backgrounds 
        conic-gradient(from 145deg at 50% 50%, ...) might be more performant 
        but SVG gives exact control over colors and 55° angle.
      */}
        </div>
    );
}

/**
 * SlashBox - A container with the signature slashes positioned in the corner
 */
export function SlashBox({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            <BrandSlashes
                className="absolute -top-10 -right-10 rotate-[0deg]"
                width={150}
                height={150}
                opacity={0.15}
                count={8}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

export default BrandSlashes;
