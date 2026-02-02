"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSelectorProps = {
    theme?: "light" | "dark";
    width?: number;
    height?: number;
    className?: string;
    clickable?: boolean;
};

/**
 * LogoSelector
 * Returns the correct ANC logo based on the background context.
 * - Light theme (white background) -> Blue Logo
 * - Dark theme (blue/dark background) -> White Logo
 * - Clicking navigates to /projects (the vault)
 */
const LogoSelector = ({ theme, width = 160, height = 80, className = "", clickable = true }: LogoSelectorProps) => {
    // If theme is explicitly provided, respect it.
    // If not, use CSS to auto-switch.

    const blueLogo = (
        <Image
            src="/ANC_Logo_2023_blue.png"
            width={width}
            height={height}
            className={cn("object-contain", theme === "dark" ? "hidden" : (theme === "light" ? "block" : "block dark:hidden"))}
            alt="ANC Sports Enterprises Logo"
        />
    );

    const whiteLogo = (
        <Image
            src="/ANC_Logo_2023_white.png"
            width={width}
            height={height}
            className={cn("object-contain absolute inset-0", theme === "light" ? "hidden" : (theme === "dark" ? "block" : "hidden dark:block"))}
            alt="ANC Sports Enterprises Logo"
        />
    );

    const logoElement = (
        <div className={cn("relative p-4 inline-flex items-center justify-center", clickable && "cursor-pointer hover:opacity-80 transition-opacity", className)} style={{ width: width + 32, height: height + 32 }}>
            {blueLogo}
            {whiteLogo}
        </div>
    );

    if (clickable) {
        return <Link href="/projects">{logoElement}</Link>;
    }

    return logoElement;
};

export default LogoSelector;
