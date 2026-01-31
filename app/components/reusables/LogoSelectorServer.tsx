import React from "react";

type LogoSelectorServerProps = {
    theme?: "light" | "dark";
    width?: number;
    height?: number;
    className?: string;
};

/**
 * LogoSelectorServer
 * Server-compatible version for PDF templates (no "use client", no next/image)
 * Returns the correct ANC logo based on the background context.
 * - Light theme (white background) -> Blue Logo
 * - Dark theme (blue/dark background) -> White Logo
 */
const LogoSelectorServer = ({ theme = "light", width = 160, height = 80, className = "" }: LogoSelectorServerProps) => {
    // Use absolute URLs for PDF rendering
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://basheer-natalia.prd42b.easypanel.host";
    const logoSrc = theme === "light" 
        ? `${baseUrl}/ANC_Logo_2023_blue.png` 
        : `${baseUrl}/ANC_Logo_2023_white.png`;

    return (
        <div className={`p-4 inline-flex items-center justify-center ${className}`}>
            <img
                src={logoSrc}
                width={width}
                height={height}
                style={{ objectFit: "contain" }}
                alt="ANC Sports Enterprises Logo"
            />
        </div>
    );
};

export default LogoSelectorServer;
