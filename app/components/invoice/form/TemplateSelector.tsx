"use client";

import Image from "next/image";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Components
import {
    BaseButton,
    ProposalTemplate1,
    ProposalTemplate2,
    ProposalTemplate3,
} from "@/app/components";

// Template images
import template1 from "@/public/assets/img/invoice-1-example.png";
import template2 from "@/public/assets/img/invoice-2-example.png";

// Icons
import { Check } from "lucide-react";

// Types
import { ProposalType } from "@/types";

const TemplateSelector = () => {
    const { watch, setValue } = useFormContext<ProposalType>();
    const formValues = watch();
    const templates = [
        {
            id: 1,
            name: "Standard Proposal",
            description: "Professional format for most projects",
            img: template1,
            component: <ProposalTemplate1 {...formValues} />,
        },
        {
            id: 2,
            name: "Detailed Quote",
            description: "Comprehensive breakdown for complex projects",
            img: template2,
            component: <ProposalTemplate2 {...formValues} />,
        },
        {
            id: 3,
            name: "ANC LOI",
            description: "Letter of Intent for ANC-specific projects",
            img: template2,
            component: <ProposalTemplate3 {...formValues} />,
        },
    ];
    return (
        <>
            <div className="space-y-4">
                <Label className="text-base font-medium">Choose Proposal Template:</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map((template, idx) => (
                        <Card 
                            key={idx} 
                            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                                formValues.details.pdfTemplate === template.id 
                                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                                    : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                            {formValues.details.pdfTemplate === template.id && (
                                <div className="absolute top-4 right-4 z-10">
                                    <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                        <Check className="w-4 h-4" />
                                        Selected
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <CardDescription className="text-xs">
                                    {template.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center space-y-4">
                                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700">
                                    <Image
                                        src={template.img}
                                        alt={template.name}
                                        fill
                                        className="object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                                        onClick={() =>
                                            setValue("details.pdfTemplate", template.id)
                                        }
                                    />
                                </div>
                                <BaseButton
                                    onClick={() =>
                                        setValue("details.pdfTemplate", template.id)
                                    }
                                    className="w-full"
                                >
                                    Select Template
                                </BaseButton>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
};

export default TemplateSelector;
