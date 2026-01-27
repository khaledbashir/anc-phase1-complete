"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface AIFieldWrapperProps {
    children: React.ReactNode;
    isAIFilled: boolean;
    fieldName?: string;
    onVerify?: (fieldName: string) => void;
    className?: string;
}

/**
 * AIFieldWrapper - Blue Glow & Verification Component
 * 
 * Wraps form fields that were filled by AI (AnythingLLM).
 * Shows a 2px French Blue (#0A52EF) outer glow to indicate AI origin.
 * Provides a "Checkmark" icon that removes the glow when clicked.
 * 
 * Usage:
 * <AIFieldWrapper isAIFilled={aiFields.includes('pitch')} fieldName="pitch" onVerify={handleVerify}>
 *   <Input ... />
 * </AIFieldWrapper>
 */
export function AIFieldWrapper({
    children,
    isAIFilled,
    fieldName,
    onVerify,
    className = "",
}: AIFieldWrapperProps) {
    const [isVerified, setIsVerified] = useState(false);

    const handleVerify = () => {
        setIsVerified(true);
        if (fieldName && onVerify) {
            onVerify(fieldName);
        }
    };

    // Don't show glow if not AI-filled or already verified
    const showGlow = isAIFilled && !isVerified;

    return (
        <div className={`relative ${className}`}>
            {/* The wrapped field with conditional glow */}
            <div
                className={`transition-all duration-300 ${showGlow
                        ? "ring-2 ring-[#0A52EF] ring-offset-1 rounded-lg shadow-[0_0_12px_rgba(10,82,239,0.3)]"
                        : ""
                    }`}
            >
                {children}
            </div>

            {/* Verification checkmark button */}
            {showGlow && (
                <button
                    type="button"
                    onClick={handleVerify}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#0A52EF] rounded-full flex items-center justify-center text-white hover:bg-[#0A52EF]/90 transition-colors shadow-md z-10"
                    title="Mark as verified"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
            )}

            {/* AI indicator label (optional) */}
            {showGlow && (
                <div className="absolute -bottom-5 left-0 text-[10px] font-medium text-[#0A52EF] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#0A52EF] rounded-full animate-pulse" />
                    AI-Extracted
                </div>
            )}
        </div>
    );
}

/**
 * Hook to track verified fields
 */
export function useAIFieldVerification(initialAIFields: string[] = []) {
    const [aiFields, setAIFields] = useState<string[]>(initialAIFields);
    const [verifiedFields, setVerifiedFields] = useState<string[]>([]);

    const markAsVerified = (fieldName: string) => {
        setVerifiedFields(prev => [...prev, fieldName]);
    };

    const isAIFilled = (fieldName: string) => aiFields.includes(fieldName);
    const isVerified = (fieldName: string) => verifiedFields.includes(fieldName);
    const showGlow = (fieldName: string) => isAIFilled(fieldName) && !isVerified(fieldName);

    return {
        aiFields,
        verifiedFields,
        markAsVerified,
        isAIFilled,
        isVerified,
        showGlow,
        setAIFields,
    };
}

export default AIFieldWrapper;
