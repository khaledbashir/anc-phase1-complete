"use client";

import React from "react";
import { cn } from "@/lib/utils";

type LogoSelectorProps = {
    theme?: "light" | "dark";
    width?: number;
    height?: number;
    className?: string;
};

/**
 * LogoSelector
 * Returns the correct ANC logo based on the background context.
 * - Light theme (white background) -> Blue Logo
 * - Dark theme (blue/dark background) -> White Logo
 */
const LogoSelector = ({ theme = "light", width = 160, height = 80, className = "" }: LogoSelectorProps) => {
    const logoSrc = theme === "light" ? "/ANC_Logo_2023_blue.png" : "/ANC_Logo_2023_white.png";

    return (
        <div className={cn("p-4 inline-flex items-center justify-center", className)}>
            <img
                src={logoSrc}
                width={width}
                height={height}
                className="object-contain"
                alt="ANC Sports Enterprises Logo"
            />
        </div>
    );
};

export default LogoSelector;
