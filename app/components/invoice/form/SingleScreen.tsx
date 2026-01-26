"use client";

import { useEffect } from "react";

// RHF
import { FieldArrayWithId, useFormContext, useWatch } from "react-hook-form";

// ShadCn
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Components
import { BaseButton, FormInput } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

type SingleScreenProps = {
    name: string;
    index: number;
    fields: any[];
    field: FieldArrayWithId<any, any>;
    moveFieldUp: (index: number) => void;
    moveFieldDown: (index: number) => void;
    removeField: (index: number) => void;
};

const SingleScreen = ({
    name,
    index,
    fields,
    field,
    moveFieldUp,
    moveFieldDown,
    removeField,
}: SingleScreenProps) => {
    const { control, setValue, register } = useFormContext();
    const { _t } = useTranslationContext();

    const screenName = useWatch({ name: `${name}[${index}].name`, control });
    const width = useWatch({ name: `${name}[${index}].widthFt`, control });
    const height = useWatch({ name: `${name}[${index}].heightFt`, control });
    const quantity = useWatch({ name: `${name}[${index}].quantity`, control });
    const pitch = useWatch({ name: `${name}[${index}].pitchMm`, control });

    useEffect(() => {
        // Could compute area or resolution here and set derived fields if desired
        if (width != undefined && height != undefined) {
            const area = (Number(width) * Number(height)).toFixed(2);
            setValue(`${name}[${index}].areaSqFt`, area);
        }
        if (width != undefined && height != undefined && pitch != undefined) {
            const pitchFeet = Number(pitch) / 304.8;
            const pixelsHeight = Number(height) / pitchFeet;
            const pixelsWidth = Number(width) / pitchFeet;
            const pixelResolution = Math.round(pixelsHeight * pixelsWidth);
            setValue(`${name}[${index}].pixelResolution`, pixelResolution);
        }
    }, [width, height, pitch]);

    return (
        <div className="border rounded-xl p-3 bg-gray-50 dark:bg-slate-800">
            <div className="flex justify-between items-center">
                <p className="font-medium">
                    #{index + 1} - {screenName ? screenName : "Untitled Screen"}
                </p>

                <div className="flex gap-2">
                    <BaseButton size={"icon"} onClick={() => moveFieldUp(index)} disabled={index === 0}>
                        <ChevronUp />
                    </BaseButton>
                    <BaseButton size={"icon"} onClick={() => moveFieldDown(index)} disabled={index === fields.length - 1}>
                        <ChevronDown />
                    </BaseButton>
                    <BaseButton variant="destructive" onClick={() => removeField(index)}>
                        <Trash2 />
                        {_t("form.steps.screens.removeScreen")}
                    </BaseButton>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
                <FormInput name={`${name}[${index}].name`} label={_t("form.steps.screens.name")} placeholder="Screen name" vertical />

                <FormInput name={`${name}[${index}].productType`} label={_t("form.steps.screens.productType")} placeholder="Product type" vertical />

                <FormInput name={`${name}[${index}].widthFt`} label={_t("form.steps.screens.width")} type="number" className="w-[10rem]" vertical />

                <FormInput name={`${name}[${index}].heightFt`} label={_t("form.steps.screens.height")} type="number" className="w-[10rem]" vertical />

                <FormInput name={`${name}[${index}].quantity`} label={_t("form.steps.screens.quantity")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].pitchMm`} label={_t("form.steps.screens.pitch")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].costPerSqFt`} label={_t("form.steps.screens.costPerSqFt")} type="number" className="w-[8rem]" vertical />

                <FormInput name={`${name}[${index}].desiredMargin`} label={_t("form.steps.screens.desiredMargin")} type="number" className="w-[8rem]" vertical />

                <div className="flex flex-col gap-1">
                    <Label>Service Type</Label>
                    <select
                        {...register(`${name}[${index}].serviceType`)}
                        className="h-9 px-3 text-sm border border-input rounded-md bg-transparent w-[8rem]"
                    >
                        <option value="Front/Rear">Front/Rear</option>
                        <option value="Top">Top (Ribbons)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <Label>Form Factor</Label>
                    <select
                        {...register(`${name}[${index}].formFactor`)}
                        className="h-9 px-3 text-sm border border-input rounded-md bg-transparent w-[8rem]"
                    >
                        <option value="Straight">Straight</option>
                        <option value="Curved">Curved</option>
                    </select>
                </div>

                <FormInput name={`${name}[${index}].outletDistance`} label="Outlet Distance (ft)" type="number" className="w-[10rem]" vertical />

                <div className="flex gap-3 items-center">
                    <div>
                        <Label>Area (sq ft)</Label>
                        <Input value={`${(Number(width || 0) * Number(height || 0)).toFixed(2)}`} readOnly className="bg-transparent border-none" />
                    </div>

                    <div>
                        <Label>Pixel Resolution</Label>
                        <Input value={`${Number((screenName && pitch) ? (Math.round((Number(height || 0) / (Number(pitch || 10)/304.8)) * (Number(width || 0) / (Number(pitch || 10)/304.8)))) : 0)}` } readOnly className="bg-transparent border-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SingleScreen;
