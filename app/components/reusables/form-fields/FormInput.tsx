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
    const { aiFields, isFieldGhostActive } = useProposalContext();
    const isAiFilled = aiFields?.includes(name);
    const isGhostActive = isFieldGhostActive?.(name) || false;

    // AI Ghost Effect Classes - French Blue (#0A52EF) flicker
    const ghostClasses = isGhostActive 
        ? "border-[#0A52EF] ring-2 ring-[#0A52EF] ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(10,82,239,0.6)] bg-[#0A52EF]/10 animate-pulse"
        : isAiFilled 
            ? "border-blue-500/50 ring-1 ring-blue-500/30" 
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
                                        "w-full bg-zinc-950/50 border-zinc-800 transition-all duration-300",
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
