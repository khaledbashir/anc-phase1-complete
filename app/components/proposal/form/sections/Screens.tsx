"use client";

import React, { useCallback, useState } from "react";

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

const Screens = () => {
    const { control } = useFormContext();
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
        });
    };

    const removeScreen = (index: number) => {
        remove(index);
    };

    const moveScreenUp = (index: number) => {
        if (index > 0) move(index, index - 1);
    };

    const moveScreenDown = (index: number) => {
        if (index < fields.length - 1) move(index, index + 1);
    };

    const { duplicateScreen } = useProposalContext();

    return (
        <section className="flex flex-col gap-2 w-full">
            <Subheading>{_t("form.steps.screens.heading")}:</Subheading>

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
