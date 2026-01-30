"use client";

import React from "react";

// RHF
import { useFieldArray, useFormContext } from "react-hook-form";

// Components
import { BaseButton, Subheading } from "@/app/components";
import SingleScreen from "../SingleScreen";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Plus } from "lucide-react";

// Toast
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ProposalType } from "@/types";

const Screens = () => {
    const { control, getValues } = useFormContext<ProposalType>();
    const { _t } = useTranslationContext();

    const SCREENS_NAME = "details.screens";
    const { fields, append, remove, move } = useFieldArray({
        control: control,
        name: SCREENS_NAME,
    });

    const addNewScreen = () => {
        append({
            name: "",
            productType: "",
            widthFt: 0,
            heightFt: 0,
            quantity: 1,
            pitchMm: 10,
            costPerSqFt: 120,
            desiredMargin: 0.25,
            isReplacement: false,
            useExistingStructure: false,
            includeSpareParts: false,
        });
    };

    const removeScreen = (index: number) => {
        // Store the screen data for potential undo
        const screens = getValues(SCREENS_NAME);
        if (!screens) return;
        
        const deletedScreen = screens[index];

        // Remove the screen
        remove(index);

        // Show toast with undo action
        toast({
            title: "Screen removed",
            description: `"${deletedScreen?.name || 'Untitled Screen'}" has been deleted.`,
            action: (
                <ToastAction 
                    altText="Undo"
                    onClick={() => {
                        // Restore the screen at the original index
                        append(deletedScreen, { shouldFocus: false });
                        // Move it back to the original position if needed
                        const currentScreens = getValues(SCREENS_NAME);
                        if (currentScreens && index < currentScreens.length - 1) {
                            move(currentScreens.length - 1, index);
                        }
                    }}
                >
                    Undo
                </ToastAction>
            ),
        });
    };

    const moveScreenUp = (index: number) => {
        if (index > 0) move(index, index - 1);
    };

    const moveScreenDown = (index: number) => {
        if (index < fields.length - 1) move(index, index + 1);
    };

    const { duplicateScreen } = useProposalContext();
    const screens = getValues(SCREENS_NAME) || [];
    const mirrorMode = !!getValues("details.mirrorMode");
    const optionIndices = screens
        .map((s: any, idx: number) => {
            const name = (s?.name ?? "").toString().trim().toUpperCase();
            const w = Number(s?.widthFt ?? s?.width ?? 0);
            const h = Number(s?.heightFt ?? s?.height ?? 0);
            const isOptionPlaceholder = name.includes("OPTION") && (w <= 0 || h <= 0);
            return isOptionPlaceholder ? idx : -1;
        })
        .filter((idx: number) => idx >= 0);

    return (
        <section className="flex flex-col gap-2 w-full">
            <Subheading>{_t("form.steps.screens.heading")}:</Subheading>

            {mirrorMode && optionIndices.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-200 uppercase tracking-widest">OPTION placeholder detected</div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                            This is a header/placeholder row from the estimator sheet, not a real screen.
                        </div>
                    </div>
                    <BaseButton tooltipLabel="Remove placeholder rows" onClick={() => remove(optionIndices)} className="shrink-0">
                        Remove
                    </BaseButton>
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <SingleScreen
                        key={field.id}
                        name={SCREENS_NAME}
                        index={index}
                        fields={fields as any}
                        field={field as any}
                        moveFieldUp={moveScreenUp}
                        moveFieldDown={moveScreenDown}
                        removeField={removeScreen}
                        duplicateField={duplicateScreen}
                    />
                ))}
            </div>

            <BaseButton tooltipLabel="Add a new screen" onClick={addNewScreen}>
                <Plus />
                {_t("form.steps.screens.addNewScreen")}
            </BaseButton>
        </section>
    );
};

export default Screens;
