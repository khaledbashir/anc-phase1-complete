"use client";

import React from "react";
import { Sparkles } from "lucide-react";

/**
 * TemplateSelector - Hybrid only (Budget, Proposal, LOI).
 * Mirror template removed; single Hybrid template for all three modes.
 */
const TemplateSelector = () => {
    return (
        <div className="flex items-center gap-2 h-8 px-3 border border-border/50 rounded-md bg-muted/30">
            <div
                className="w-3 h-3 rounded-sm"
                style={{ background: "#002C73" }}
            />
            <span className="text-xs font-medium text-foreground">Hybrid</span>
            <Sparkles className="w-3 h-3 text-muted-foreground" />
        </div>
    );
};

export default TemplateSelector;
