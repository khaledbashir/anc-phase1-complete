"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Palette, Sparkles, Zap } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Template {
    id: number;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    preview?: string;
}

const templates: Template[] = [
    {
        id: 2,
        name: "ANC Classic",
        description: "The original approved design",
        icon: <Palette className="w-4 h-4" />,
        color: "#0A52EF",
    },
    {
        id: 3,
        name: "ANC Modern",
        description: "Clean, minimalist design",
        icon: <Sparkles className="w-4 h-4" />,
        color: "#6366F1",
    },
    {
        id: 4,
        name: "ANC Bold",
        description: "Dramatic high-impact design",
        icon: <Zap className="w-4 h-4" />,
        color: "#0A52EF",
    },
];

const TemplateSelector = () => {
    const { setValue, control } = useFormContext();
    const currentTemplate = useWatch({ control, name: "details.pdfTemplate" }) || 2;
    const [open, setOpen] = React.useState(false);

    const selected = templates.find((t) => t.id === currentTemplate) || templates[0];

    const handleSelect = (templateId: number) => {
        setValue("details.pdfTemplate", templateId, { shouldDirty: true });
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "gap-2 h-8 px-3 border-border/50 hover:bg-muted/50",
                        "transition-all duration-200"
                    )}
                >
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ background: selected.color }}
                    />
                    <span className="text-xs font-medium">{selected.name}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mb-1">
                    PDF Template Style
                </div>
                <div className="space-y-1">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleSelect(template.id)}
                            className={cn(
                                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                                currentTemplate === template.id
                                    ? "bg-primary/10 ring-1 ring-primary/30"
                                    : "hover:bg-muted/50"
                            )}
                        >
                            <div
                                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                                style={{
                                    background: template.color,
                                    color: template.id === 4 ? "#fff" : "#fff",
                                }}
                            >
                                {template.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">
                                        {template.name}
                                    </span>
                                    {currentTemplate === template.id && (
                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                                            Active
                                        </span>
                                    )}
                                    {template.id === 2 && (
                                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {template.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground px-2">
                        Template affects PDF export only. Live preview updates automatically.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default TemplateSelector;
