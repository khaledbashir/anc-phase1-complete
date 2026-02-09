import { FORM_DEFAULT_VALUES } from "@/lib/variables";

/**
 * Map DB Proposal schema to Form schema (ProposalType-like shape)
 * DB stores flat structure; Form expects nested structure.
 */
export function mapDbProposalToFormSchema(dbProject: any) {
    const cfg = (dbProject.documentConfig || {}) as any;
    const documentMode = (dbProject.documentMode || "BUDGET") as "BUDGET" | "PROPOSAL" | "LOI";
    const documentType = documentMode === "LOI" ? "LOI" : "First Round";
    const pricingType = documentMode === "PROPOSAL" ? "Hard Quoted" : "Budget";

    return {
        sender: FORM_DEFAULT_VALUES.sender,
        receiver: {
            name: dbProject.clientName || "",
            address: dbProject.clientAddress || "",
            zipCode: dbProject.clientZip || "",
            city: dbProject.clientCity || "",
            country: "",
            email: "",
            phone: "",
            customInputs: [],
        },
        details: {
            proposalLogo: "",
            proposalId: dbProject.id,
            proposalName: dbProject.clientName,
            proposalNumber: dbProject.id.slice(-8).toUpperCase(),
            proposalDate: dbProject.createdAt ? new Date(dbProject.createdAt).toISOString().split("T")[0] : "",
            dueDate: "",
            items: [],
            currency: "USD",
            language: "English",
            taxDetails: { amount: 0, amountType: "amount", taxID: "" },
            discountDetails: { amount: 0, amountType: "amount" },
            shippingDetails: { cost: 0, costType: "amount" },
            paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
            additionalNotes: dbProject.additionalNotes || "",
            paymentTerms: dbProject.paymentTerms || "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion",
            totalAmountInWords: "",
            documentType: documentType as any,
            pricingType: pricingType as any,
            documentMode: documentMode as any,
            pdfTemplate: 5,
            subTotal: 0,
            totalAmount: 0,
            overheadRate: Number(dbProject.overheadRate) || 0.10,
            profitRate: Number(dbProject.profitRate) || 0.05,
            screens: (dbProject.screens || []).map((s: any) => ({
                id: s.id,
                name: s.name || "Display",
                externalName: s.externalName || "",
                customDisplayName: s.customDisplayName || "",
                group: s.group || "",
                pitchMm: Number(s.pixelPitch) || 0,
                widthFt: Number(s.width) || 0,
                heightFt: Number(s.height) || 0,
                brightness: s.brightness != null ? Number(s.brightness) : "",
                quantity: s.quantity ?? 1,
                serviceType: s.serviceType || "",
                formFactor: s.formFactor || "",
                lineItems: (s.lineItems || []).map((li: any) => ({
                    category: li.category,
                    cost: Number(li.cost) || 0,
                    margin: Number(li.margin) || 0,
                    price: Number(li.price) || 0,
                })),
            })),
            internalAudit: dbProject.internalAudit ? JSON.parse(dbProject.internalAudit) : {},
            clientSummary: dbProject.clientSummary ? JSON.parse(dbProject.clientSummary) : {},
            mirrorMode: typeof dbProject.mirrorMode === "boolean"
                ? dbProject.mirrorMode
                : (dbProject.calculationMode === "MIRROR" || (dbProject.pricingDocument as any)?.tables?.length > 0 ? true : undefined),
            calculationMode: dbProject.calculationMode || "INTELLIGENCE",
            taxRateOverride: Number(dbProject.taxRateOverride) || 0,
            bondRateOverride: Number(dbProject.bondRateOverride) || 0,
            aiWorkspaceSlug: dbProject.aiWorkspaceSlug || null,
            venue: (dbProject.venue || "Generic") as "Milan Puskar Stadium" | "WVU Coliseum" | "Generic",
            quoteItems: (dbProject.quoteItems || []) as any,
            includePricingBreakdown: cfg.includePricingBreakdown ?? false,
            showPricingTables: cfg.showPricingTables ?? true,
            showIntroText: cfg.showIntroText ?? true,
            showBaseBidTable: cfg.showBaseBidTable ?? false,
            showSpecifications: cfg.showSpecifications ?? true,
            showCompanyFooter: cfg.showCompanyFooter ?? true,
            showPaymentTerms: cfg.showPaymentTerms ?? false,
            showSignatureBlock: cfg.showSignatureBlock ?? false,
            showAssumptions: false,
            showExhibitA: cfg.showExhibitA ?? false,
            showExhibitB: cfg.showExhibitB ?? false,
            showNotes: cfg.showNotes ?? true,
            showScopeOfWork: cfg.showScopeOfWork ?? false,
            tableHeaderOverrides: dbProject.tableHeaderOverrides || {},
            customProposalNotes: dbProject.customProposalNotes || "",
            loiHeaderText: dbProject.loiHeaderText || "",
            signatureBlockText: dbProject.signatureBlockText || "",
            purchaserLegalName: dbProject.purchaserLegalName || "",
            pricingDocument: dbProject.pricingDocument || undefined,
            pricingMode: dbProject.pricingMode || "STANDARD",
            masterTableIndex: dbProject.masterTableIndex ?? null,
            status: dbProject.status || "DRAFT",
        },
        marginAnalysis: dbProject.marginAnalysis || undefined,
    };
}

