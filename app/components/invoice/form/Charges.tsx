"use client";

// RHF
import { useFormContext } from "react-hook-form";

// Contexts
import { useChargesContext } from "@/contexts/ChargesContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Helpers
import { formatNumberWithCommas } from "@/lib/helpers";

// Types
import { ProposalType } from "@/types";

/**
 * Charges (De-Shit-ified)
 * 
 * Removed: Discount, Tax, Shipping, Total in Words toggles.
 * These are invoice-centric features that are antithetical to a $20M stadium bid tool.
 */
const Charges = () => {
    const {
        formState: { errors },
    } = useFormContext<ProposalType>();

    const { _t } = useTranslationContext();

    const {
        currency,
        subTotal,
        totalAmount,
    } = useChargesContext();

    return (
        <div className="flex flex-col gap-4 min-w-[20rem] p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-medium">Subtotal</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatNumberWithCommas(subTotal)} {currency}
                </span>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    Total Amount
                </span>
                <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                        {formatNumberWithCommas(totalAmount)} {currency}
                    </p>
                    {errors.details?.totalAmount?.message && (
                        <small className="text-sm font-medium text-destructive">
                            {errors.details?.totalAmount?.message}
                        </small>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Charges;
