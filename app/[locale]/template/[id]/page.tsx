"use client";
// Types
import { ProposalType } from "@/types";
// Next
import dynamic from "next/dynamic";
import { use } from "react";
// RHF
import { useFormContext } from "react-hook-form";

type ViewTemplatePageProps = {
    params: Promise<{ id: string }>;
};

const ViewTemplate = (props: ViewTemplatePageProps) => {
    const params = use(props.params);
    const templateNumber = params.id;

    const DynamicComponent = dynamic<ProposalType>(
        () =>
            import(
                `@/app/components/templates/proposal-pdf/ProposalTemplate${templateNumber}`
            )
    );

    const { getValues } = useFormContext();
    const formValues = getValues();

    return (
        <div className="container">
            <DynamicComponent
                sender={formValues.sender}
                receiver={formValues.receiver}
                details={formValues.details}
            />
        </div>
    );
};

export default ViewTemplate;
