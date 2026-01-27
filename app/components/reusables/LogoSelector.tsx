"use client";

import React from "react";

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
        <img
            src={logoSrc}
            width={width}
            height={height}
            className={`object-contain ${className}`}
            alt="ANC Sports Enterprises Logo"
        />
    );
};

export default LogoSelector;
