"use client";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input, InputProps } from "@/components/ui/input";
import { useProposalContext } from "@/contexts/ProposalContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, ShieldCheck, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FormInputProps = {
    name: string;
    label?: string;
    labelHelper?: string;
    placeholder?: string;
    vertical?: boolean;
    rightElement?: React.ReactNode;
} & InputProps;

const FormInput = ({
    name,
    label,
    labelHelper,
    placeholder,
    vertical = false,
    rightElement,
    ...props
}: FormInputProps) => {
    const { control } = useFormContext();
    const { aiFields, aiCitations, isFieldGhostActive, verifiedFields, setFieldVerified } = useProposalContext();
    const isAiFilled = aiFields?.includes(name);
    const citation = aiCitations?.[name];
    const isGhostActive = isFieldGhostActive?.(name) || false;
    const verificationInfo = verifiedFields?.[name];
    const isVerified = !!verificationInfo;

    // AI Ghost Effect Classes - French Blue (#0A52EF) flicker
    const ghostClasses = isGhostActive
        ? "border-[#0A52EF] ring-2 ring-[#0A52EF] ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(10,82,239,0.6)] bg-[#0A52EF]/10 animate-pulse"
        : isAiFilled
            ? isVerified
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "border-[#0A52EF]/50 ring-1 ring-[#0A52EF]/30 shadow-[0_0_15px_rgba(10,82,239,0.2)]"
            : "";

    const verticalInput = (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    {label && <FormLabel>{`${label}:`}</FormLabel>}

                    {labelHelper && (
                        <span className="text-xs"> {labelHelper}</span>
                    )}

                    <div className="relative flex items-center gap-2">
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder={placeholder}
                                className={cn(
                                    "w-full bg-zinc-950/50 border-zinc-800 transition-all duration-300",
                                    ghostClasses,
                                    props.className
                                )}
                                {...props}
                            />
                        </FormControl>
                        {isAiFilled && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                "p-1.5 rounded-md border transition-all cursor-help",
                                                isVerified
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                    : "bg-[#0A52EF]/10 border-[#0A52EF]/20 text-[#0A52EF]"
                                            )}>
                                                {isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs bg-card border-border text-foreground p-3 shadow-2xl">
                                            <p className="text-xs leading-relaxed">
                                                {isVerified ? (
                                                    <>
                                                        <strong className="text-emerald-500">Verified by:</strong> {verificationInfo.verifiedBy}<br />
                                                        <strong className="text-emerald-500">Timestamp:</strong> {new Date(verificationInfo.verifiedAt).toLocaleString()}
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong className="text-[#0A52EF]">AI Extracted:</strong> This value was pulled from the RFP. Please verify and lock this data.
                                                        {citation && (
                                                            <>
                                                                <br /><span className="text-muted-foreground mt-1 block font-mono text-[10px]">{citation}</span>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {!isVerified && (
                                    <button
                                        type="button"
                                        onClick={() => setFieldVerified(name, "Natalia AI")}
                                        className="p-1.5 hover:bg-emerald-500/20 rounded-md text-emerald-500 transition-colors border border-transparent hover:border-emerald-500/30"
                                        title="Verify Field"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                        {rightElement}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    const horizontalInput = (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <div className="flex w-full gap-5 items-center text-sm">
                        {label && <FormLabel className="flex-1">{`${label}:`}</FormLabel>}
                        {labelHelper && (
                            <span className="text-xs"> {labelHelper}</span>
                        )}

                        <div className="flex-[2] relative flex items-center gap-2">
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder={placeholder}
                                    className={cn(
                                        "w-full bg-background/50 border-border transition-all duration-300",
                                        ghostClasses,
                                        props.className
                                    )}
                                    {...props}
                                />
                            </FormControl>
                            {rightElement}
                        </div>
                    </div>
                    <FormMessage className="text-right" />
                </FormItem>
            )}
        />
    );
    return vertical ? verticalInput : horizontalInput;
};

export default FormInput;
