"use client";

import React, { useState, useRef, useEffect } from "react";

interface ToolDescriptionProps {
    label: string;
    description: string;
    whenToUse: string;
    benefit: string;
    children: React.ReactNode;
}

/**
 * Rich hover tooltip for estimator toolbar buttons.
 * Shows: what the tool does, when to use it, and the key benefit.
 * Positioned above the button, auto-adjusts to stay on screen.
 */
export default function ToolDescription({
    label,
    description,
    whenToUse,
    benefit,
    children,
}: ToolDescriptionProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<"above" | "below">("above");
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            // Check if tooltip would overflow top of viewport
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPosition(rect.top < 180 ? "below" : "above");
            }
            setVisible(true);
        }, 400);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setVisible(false), 150);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative inline-flex"
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            {children}

            {visible && (
                <div
                    className={`absolute z-50 w-64 bg-white border border-[#E8E8E8] rounded shadow-lg p-3 text-left ${
                        position === "above"
                            ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
                            : "top-full mt-2 left-1/2 -translate-x-1/2"
                    }`}
                    onMouseEnter={() => {
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    }}
                    onMouseLeave={hide}
                >
                    <div className="text-xs font-semibold text-[#1C1C1C] mb-1.5">
                        {label}
                    </div>
                    <p className="text-[11px] text-[#616161] leading-relaxed mb-2">
                        {description}
                    </p>
                    <div className="space-y-1.5">
                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#878787]">
                                When to use
                            </span>
                            <p className="text-[11px] text-[#616161] leading-relaxed">
                                {whenToUse}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#878787]">
                                Benefit
                            </span>
                            <p className="text-[11px] text-[#0A52EF] font-medium leading-relaxed">
                                {benefit}
                            </p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-[#E8E8E8] rotate-45 ${
                            position === "above"
                                ? "bottom-[-5px] border-r border-b"
                                : "top-[-5px] border-l border-t"
                        }`}
                    />
                </div>
            )}
        </div>
    );
}
