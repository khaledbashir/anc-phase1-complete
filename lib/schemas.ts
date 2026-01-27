import { z } from "zod";

// Helpers
import { formatNumberWithCommas } from "@/lib/helpers";

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// TODO: Refactor some of the validators. Ex: name and zipCode or address and country have same rules
// Field Validators
const fieldValidators = {
    name: z
        .string()
        .min(2, { message: "Must be at least 2 characters" })
        .max(50, { message: "Must be at most 50 characters" }),
    address: z
        .string()
        .min(2, { message: "Must be at least 2 characters" })
        .max(70, { message: "Must be between 2 and 70 characters" }),
    zipCode: z
        .string()
        .min(2, { message: "Must be between 2 and 20 characters" })
        .max(20, { message: "Must be between 2 and 20 characters" }),
    city: z
        .string()
        .min(1, { message: "Must be between 1 and 50 characters" })
        .max(50, { message: "Must be between 1 and 50 characters" }),
    country: z
        .string()
        .min(1, { message: "Must be between 1 and 70 characters" })
        .max(70, { message: "Must be between 1 and 70 characters" }),
    email: z
        .string()
        .email({ message: "Email must be a valid email" })
        .min(5, { message: "Must be between 5 and 30 characters" })
        .max(30, { message: "Must be between 5 and 30 characters" }),
    phone: z
        .string()
        .min(1, { message: "Must be between 1 and 50 characters" })
        .max(50, {
            message: "Must be between 1 and 50 characters",
        }),

    // Dates
    date: z
        .date()
        .transform((date) =>
            new Date(date).toLocaleDateString("en-US", DATE_OPTIONS)
        ),

    // Items
    quantity: z.coerce
        .number()
        .gt(0, { message: "Must be a number greater than 0" }),
    unitPrice: z.coerce
        .number()
        .gt(0, { message: "Must be a number greater than 0" })
        .lte(Number.MAX_SAFE_INTEGER, { message: `Must be ≤ ${Number.MAX_SAFE_INTEGER}` }),

    // Strings
    string: z.string(),
    stringMin1: z.string().min(1, { message: "Must be at least 1 character" }),
    stringToNumber: z.coerce.number(),

    // Charges
    stringToNumberWithMax: z.coerce.number().max(1000000),

    stringOptional: z.string().optional(),

    nonNegativeNumber: z.coerce.number().nonnegative({
        message: "Must be a positive number",
    }),
    // ! This is unused
    numWithCommas: z.coerce
        .number()
        .nonnegative({
            message: "Must be a positive number",
        })
        .transform((value) => {
            return formatNumberWithCommas(value);
        }),
};

const CustomInputSchema = z.object({
    key: z.string(),
    value: z.string(),
});

const InvoiceSenderSchema = z.object({
    name: fieldValidators.name,
    address: fieldValidators.address,
    zipCode: fieldValidators.zipCode,
    city: fieldValidators.city,
    country: fieldValidators.country,
    email: fieldValidators.email,
    phone: fieldValidators.phone,
    customInputs: z.array(CustomInputSchema).optional(),
});

const InvoiceReceiverSchema = z.object({
    name: fieldValidators.name,
    address: fieldValidators.address,
    zipCode: fieldValidators.zipCode,
    city: fieldValidators.city,
    country: fieldValidators.country,
    email: fieldValidators.email,
    phone: fieldValidators.phone,
    customInputs: z.array(CustomInputSchema).optional(),
});

const ItemSchema = z.object({
    name: fieldValidators.stringMin1,
    description: fieldValidators.stringOptional,
    quantity: fieldValidators.quantity,
    unitPrice: fieldValidators.unitPrice,
    total: fieldValidators.stringToNumber,
});

const PaymentInformationSchema = z.object({
    bankName: fieldValidators.stringMin1,
    accountName: fieldValidators.stringMin1,
    accountNumber: fieldValidators.stringMin1,
});

const DiscountDetailsSchema = z.object({
    amount: fieldValidators.stringToNumberWithMax,
    amountType: fieldValidators.string,
});

const TaxDetailsSchema = z.object({
    amount: fieldValidators.stringToNumberWithMax,
    taxID: fieldValidators.string,
    amountType: fieldValidators.string,
});

const ShippingDetailsSchema = z.object({
    cost: fieldValidators.stringToNumberWithMax,
    costType: fieldValidators.string,
});

const SignatureSchema = z.object({
    data: fieldValidators.string,
    fontFamily: fieldValidators.string.optional(),
});

// Audit schemas
const ClientSummarySchema = z.object({
    subtotal: z.number(),
    total: z.number(),
    breakdown: z.object({
        hardware: z.number(),
        structure: z.number(),
        install: z.number(),
        others: z.number(),
    }),
});

const ScreenAuditSchema = z.object({
    name: fieldValidators.stringMin1,
    productType: fieldValidators.string.optional(),
    quantity: z.coerce.number().nonnegative().optional(),
    areaSqFt: z.coerce.number().nonnegative(),
    pixelResolution: z.coerce.number().nonnegative(),
    pixelMatrix: z.string().optional(),
    serviceType: z.string().optional(),
    breakdown: z.object({
        hardware: z.number(),
        structure: z.number(),
        install: z.number(),
        labor: z.number(),
        demolition: z.number().optional(),
        power: z.number(),
        shipping: z.number(),
        pm: z.number(),
        generalConditions: z.number(),
        travel: z.number(),
        submittals: z.number(),
        engineering: z.number(),
        permits: z.number(),
        cms: z.number(),
        ancMargin: z.number(),
        sellPrice: z.number(),
        bondCost: z.number(),
        marginAmount: z.number(),
        totalCost: z.number(),
        finalClientTotal: z.number(),
        sellingPricePerSqFt: z.number(),
    }),
});

const InternalAuditSchema = z.object({
    perScreen: z.array(ScreenAuditSchema),
    totals: z.object({
        hardware: z.number(),
        structure: z.number(),
        install: z.number(),
        labor: z.number(),
        demolition: z.number().optional(),
        power: z.number(),
        shipping: z.number(),
        pm: z.number(),
        generalConditions: z.number(),
        travel: z.number(),
        submittals: z.number(),
        engineering: z.number(),
        permits: z.number(),
        cms: z.number(),
        ancMargin: z.number(),
        sellPrice: z.number(),
        bondCost: z.number(),
        margin: z.number(),
        totalCost: z.number(),
        finalClientTotal: z.number(),
        sellingPricePerSqFt: z.number(),
    }),
});

const InvoiceDetailsSchema = z.object({
    invoiceLogo: fieldValidators.stringOptional,
    // Proposal-specific aliases (backwards compatible with invoice fields)
    proposalLogo: fieldValidators.stringOptional,
    proposalId: fieldValidators.stringOptional,
    proposalName: fieldValidators.stringOptional, // Professional project name
    proposalDate: fieldValidators.date.optional(),
    aiWorkspaceSlug: fieldValidators.stringOptional, // Dedicated Project Room
    invoiceNumber: fieldValidators.stringMin1,
    invoiceDate: fieldValidators.date,
    dueDate: fieldValidators.date,
    purchaseOrderNumber: fieldValidators.stringOptional,
    currency: fieldValidators.string,
    language: fieldValidators.string,
    items: z.array(ItemSchema),
    // Screens (ANC-specific estimator inputs)
    screens: z.array(z.object({
        name: fieldValidators.stringMin1, // Changed to "Internal Shorthand"
        externalName: fieldValidators.stringOptional, // Professional Client Name
        productType: fieldValidators.string.optional(),
        widthFt: z.coerce.number().nonnegative().optional(),
        heightFt: z.coerce.number().nonnegative().optional(),
        quantity: z.coerce.number().nonnegative().optional(),
        pitchMm: z.coerce.number().nonnegative().optional(),
        pixelsH: z.coerce.number().nonnegative().optional(),
        pixelsW: z.coerce.number().nonnegative().optional(),
        brightness: z.string().optional(),
        costPerSqFt: z.coerce.number().nonnegative().optional(),
        desiredMargin: z.coerce.number().min(0).max(1).optional(),
        serviceType: z.string().optional(), // "Top" or "Front/Rear"
        formFactor: z.string().optional(), // "Straight" or "Curved"
        outletDistance: z.coerce.number().nonnegative().optional(),
        isReplacement: z.boolean().default(false),
        useExistingStructure: z.boolean().default(false),
        includeSpareParts: z.boolean().default(true),
        aiSource: z.record(z.object({
            page: z.number().optional(),
            text: z.string().optional(),
            confidence: z.number().optional(),
        })).optional(),
    })).optional(),
    // Audit snapshots
    internalAudit: InternalAuditSchema.optional(),
    clientSummary: ClientSummarySchema.optional(),
    paymentInformation: PaymentInformationSchema.optional(),
    taxDetails: TaxDetailsSchema.optional(),
    discountDetails: DiscountDetailsSchema.optional(),
    shippingDetails: ShippingDetailsSchema.optional(),
    subTotal: fieldValidators.nonNegativeNumber,
    totalAmount: fieldValidators.nonNegativeNumber,
    totalAmountInWords: fieldValidators.string,
    additionalNotes: fieldValidators.stringOptional,
    paymentTerms: fieldValidators.stringMin1,
    signature: SignatureSchema.optional(),
    updatedAt: fieldValidators.stringOptional,
    documentType: z.enum(["LOI", "First Round"]).default("First Round"),
    pricingType: z.enum(["Hard Quoted", "Budget"]).default("Budget"),
    pdfTemplate: z.number(),
});

const ProposalSchema = z.object({
    sender: InvoiceSenderSchema,
    receiver: InvoiceReceiverSchema,
    details: InvoiceDetailsSchema,
});

export { ProposalSchema, ItemSchema };
