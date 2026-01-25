"use client";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import { Form } from "@/components/ui/form";

// Components
import { InvoiceActions, InvoiceForm } from "@/app/components";

// Context
import { useInvoiceContext } from "@/contexts/InvoiceContext";

// Types
import { InvoiceType } from "@/types";

const InvoiceMain = () => {
    const { handleSubmit } = useFormContext<InvoiceType>();

    // Get the needed values from invoice context
    const { onFormSubmit } = useInvoiceContext();

    return (
        <>
            <Form {...useFormContext<InvoiceType>()}>
                <form
                    onSubmit={handleSubmit(onFormSubmit, (err) => {
                        console.log(err);
                    })}
                >
                    <div className="flex flex-wrap gap-6">
                        <div className="flex-1 min-w-[300px]">
                            <InvoiceForm />
                        </div>
                        <div className="w-full xl:w-auto">
                            <InvoiceActions />
                        </div>
                    </div>
                </form>
            </Form>
        </>
    );
};

export default InvoiceMain;
