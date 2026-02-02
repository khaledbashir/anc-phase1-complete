// Types
import { SignatureColor, SignatureFont } from "@/types";

/**
 * Environment
 */
export const ENV = process.env.NODE_ENV;

/**
 * Websites
 */
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://basheer-natalia.prd42b.easypanel.host";
export const ANC_WEBSITE = "https://ancsports.com";

/**
 * API endpoints
 */
export const GENERATE_PDF_API = "/api/proposal/generate";
export const SEND_PDF_API = "/api/proposals/send";
export const EXPORT_PROPOSAL_API = "/api/proposals/export";

/**
 * External API endpoints
 */
export const CURRENCIES_API =
  "https://openexchangerates.org/api/currencies.json";

/**
 * AnythingLLM - The "Brain" API
 * Centralized hardcoded base URL with strict /api/v1 versioning
 * All AnythingLLM calls MUST use this constant - Lead Protocol
 */
const rawUrl = process.env.ANYTHING_LLM_URL || 'https://basheer-anything-llm.c9tnyg.easypanel.host';
export const ANYTHING_LLM_BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;
export const ANYTHING_LLM_KEY = process.env.ANYTHING_LLM_KEY;

/**
 * Local storage
 */
export const LOCAL_STORAGE_PROPOSAL_DRAFT_KEY = "anc:proposalDraft";

/**
 * Tailwind
 */
export const TAILWIND_CDN =
  "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";

/**
 * Google
 */
export const GOOGLE_SC_VERIFICATION = process.env.GOOGLE_SC_VERIFICATION;

/**
 * Nodemailer
 */
export const NODEMAILER_EMAIL = process.env.NODEMAILER_EMAIL;
export const NODEMAILER_PW = process.env.NODEMAILER_PW;

/**
 * I18N
 */
export const LOCALES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "ca", name: "Català" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
  { code: "pl", name: "Polish" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "tr", name: "Türkçe" },
  { code: "zh-CN", name: "简体中文" },
  { code: "ja", name: "日本語" },
  { code: "nb-NO", name: "Norwegian (bokmål)" },
  { code: "nn-NO", name: "Norwegian (nynorsk)" },
];
export const DEFAULT_LOCALE = LOCALES[0].code;

/**
 * Signature variables
 */
export const SIGNATURE_COLORS: SignatureColor[] = [
  { name: "black", label: "Black", color: "rgb(0, 0, 0)" },
  { name: "dark blue", label: "Dark Blue", color: "rgb(0, 0, 128)" },
  {
    name: "crimson",
    label: "Crimson",
    color: "#DC143C",
  },
];

export const SIGNATURE_FONTS: SignatureFont[] = [
  {
    name: "Dancing Script",
    variable: "var(--font-dancing-script)",
  },
  { name: "Parisienne", variable: "var(--font-parisienne)" },
  {
    name: "Great Vibes",
    variable: "var(--font-great-vibes)",
  },
  {
    name: "Alex Brush",
    variable: "var(--font-alex-brush)",
  },
];

/**
 * Form date options
 */
export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Form defaults
 */
export const FORM_DEFAULT_VALUES = {
  sender: {
    name: "ANC Sports Enterprises",
    address: "2 Manhattanville Road, Suite 402",
    zipCode: "10577",
    city: "Purchase, NY",
    country: "United States",
    email: "info@ancsports.com",
    phone: "(914) 696-2100",
    customInputs: [],
  },
  receiver: {
    name: "Client Name",
    address: "",
    zipCode: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    customInputs: [],
  },
  details: {
    proposalLogo: "",
    proposalId: "",
    proposalDate: "",
    dueDate: "",
    items: [
      {
        name: "",
        description: "",
        quantity: 0,
        unitPrice: 0,
        total: 0,
      },
    ],
    currency: "USD",
    language: "English",
    taxDetails: {
      amount: 0,
      amountType: "amount",
      taxID: "",
    },
    discountDetails: {
      amount: 0,
      amountType: "amount",
    },
    shippingDetails: {
      cost: 0,
      costType: "amount",
    },
    paymentInformation: {
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
    additionalNotes: "",
    paymentTerms: "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion",
    totalAmountInWords: "",
    documentType: "First Round" as "LOI" | "First Round",
    pricingType: "Budget" as "Hard Quoted" | "Budget",
    documentMode: "BUDGET" as "BUDGET" | "PROPOSAL" | "LOI",
    pdfTemplate: 1,
    screens: [],
    internalAudit: {},
    clientSummary: {},
    mirrorMode: true,
    calculationMode: "MIRROR" as "MIRROR" | "INTELLIGENCE",
    taxRateOverride: 0,
    bondRateOverride: 0,
    venue: "Generic" as "Milan Puskar Stadium" | "WVU Coliseum" | "Generic",
    includePricingBreakdown: true,
    showPricingTables: true,
    showIntroText: true,
    showBaseBidTable: true,
    showSpecifications: true,
    showCompanyFooter: true,
    showPaymentTerms: false,
    showSignatureBlock: false,
    showAssumptions: false,
    showExhibitA: false,
    showExhibitB: false,
  },
};

/**
 * ? DEV Only
 * Form auto fill values for testing
 */
export const FORM_FILL_VALUES = {
  sender: {
    name: "John Doe",
    address: "123 Main St",
    zipCode: "12345",
    city: "Anytown",
    country: "USA",
    email: "johndoe@example.com",
    phone: "123-456-7890",
  },
  receiver: {
    name: "Jane Smith",
    address: "456 Elm St",
    zipCode: "54321",
    city: "Other Town",
    country: "Canada",
    email: "janesmith@example.com",
    phone: "987-654-3210",
  },
  details: {
    proposalLogo: "",
    proposalId: "INV0001",
    proposalDate: new Date(),
    dueDate: new Date(),
    items: [
      {
        name: "Product 1",
        description: "Description of Product 1",
        quantity: 4,
        unitPrice: 50,
        total: 200,
      },
      {
        name: "Product 2",
        description: "Description of Product 2",
        quantity: 5,
        unitPrice: 50,
        total: 250,
      },
      {
        name: "Product 3",
        description: "Description of Product 3",
        quantity: 5,
        unitPrice: 80,
        total: 400,
      },
    ],
    currency: "USD",
    language: "English",
    taxDetails: {
      amount: 15,
      amountType: "percentage",
      taxID: "987654321",
    },
    discountDetails: {
      amount: 5,
      amountType: "percentage",
    },
    shippingDetails: {
      cost: 5,
      costType: "percentage",
    },
    paymentInformation: {
      bankName: "Bank Inc.",
      accountName: "John Doe",
      accountNumber: "445566998877",
    },
    additionalNotes: "Thank you for your business",
    paymentTerms: "Net 30",
    signature: {
      data: "",
    },
    subTotal: "850",
    totalAmount: "850",
    totalAmountInWords: "Eight Hundred Fifty",
    documentType: "First Round" as "LOI" | "First Round",
    pricingType: "Hard Quoted" as "Hard Quoted" | "Budget",
    documentMode: "PROPOSAL" as "BUDGET" | "PROPOSAL" | "LOI",
    pdfTemplate: 1,
    venue: "Generic" as "Milan Puskar Stadium" | "WVU Coliseum" | "Generic",
  },
};
