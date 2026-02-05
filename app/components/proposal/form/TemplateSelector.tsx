"use client";

import React from "react";
import { Sparkles } from "lucide-react";

/**
 * TemplateSelector - Enterprise Standard: ANC Hybrid Template (ID 5)
 * 
 * As of February 2026, Template 5 (ANC Hybrid) is the enterprise standard.
 * Templates 1, 2 (Classic), and 4 (Premium/Bold) are deprecated.
 * 
 * In Mirror Mode, NataliaMirrorTemplate is always used regardless of this setting.
 * This component displays the active enterprise-standard template.
 */
const TemplateSelector = () => {
    return (
        <div className="flex items-center gap-2 h-8 px-3 border border-border/50 rounded-md bg-muted/30">
            <div
                className="w-3 h-3 rounded-sm"
                style={{ background: "#002C73" }}
            />
            <span className="text-xs font-medium text-foreground">ANC Standard</span>
            <Sparkles className="w-3 h-3 text-muted-foreground" />
        </div>
    );
};

export default TemplateSelector;
