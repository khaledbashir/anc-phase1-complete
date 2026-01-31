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
const LogoSelector = ({ theme = "light", width = 160, height = 80, className = "", clickable = true }: LogoSelectorProps) => {
    const logoSrc = theme === "light" ? "/ANC_Logo_2023_blue.png" : "/ANC_Logo_2023_white.png";

    const logoElement = (
        <div className={cn("p-4 inline-flex items-center justify-center", clickable && "cursor-pointer hover:opacity-80 transition-opacity", className)}>
            <Image
                src={logoSrc}
                width={width}
                height={height}
                className="object-contain"
                alt="ANC Sports Enterprises Logo"
            />
        </div>
    );

    if (clickable) {
        return <Link href="/projects">{logoElement}</Link>;
    }

    return logoElement;
};

export default LogoSelector;
