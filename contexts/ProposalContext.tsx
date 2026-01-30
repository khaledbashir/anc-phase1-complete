"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

// RHF
import { useFormContext } from "react-hook-form";

// Hooks
import useToasts from "@/hooks/useToasts";

// Services
import { exportProposal } from "@/services/proposal/client/exportProposal";

// Variables
import {
  FORM_DEFAULT_VALUES,
  GENERATE_PDF_API,
  SEND_PDF_API,
  SHORT_DATE_OPTIONS,
  LOCAL_STORAGE_PROPOSAL_DRAFT_KEY,
} from "@/lib/variables";

// Types
import { ExportTypes, ProposalType } from "@/types";

// Estimator / Audit
import { calculateProposalAudit } from "@/lib/estimator";

// Risk Detector
import { detectRisks, RiskItem } from "@/services/risk-detector";
import * as xlsx from "xlsx";

type ExcelPreviewMerge = { s: { r: number; c: number }; e: { r: number; c: number } };
export type ExcelPreviewSheet = {
  name: string;
  grid: string[][];
  merges: ExcelPreviewMerge[];
  hiddenRows: boolean[];
  colWidths: Array<number | null>;
  validationIssue: boolean;
  hasNumericDimensions: boolean;
};

export type ExcelPreview = {
  fileName: string;
  sheets: ExcelPreviewSheet[];
  loadedAt: number;
};

const defaultProposalContext = {
  proposalPdf: new Blob(),
  proposalPdfLoading: false,
  excelImportLoading: false,
  excelPreviewLoading: false,
  excelPreview: null as ExcelPreview | null,
  excelValidationOk: false,
  loadExcelPreview: (file: File) => Promise.resolve(),
  savedProposals: [] as ProposalType[],
  pdfUrl: null as string | null,
  activeTab: "client",
  setActiveTab: (tab: string) => { },
  onFormSubmit: (values: ProposalType) => { },
  newProposal: () => { },
  resetProposal: () => { },
  generatePdf: async (data: ProposalType) => new Blob(),
  removeFinalPdf: () => { },
  downloadPdf: async () => { },
  printPdf: () => { },
  previewPdfInTab: () => { },
  saveProposalData: () => { },
  deleteProposalData: (index: number) => { },
  // Backwards-compatible alias
  deleteProposal: (index: number) => { },
  sendPdfToMail: (email: string): Promise<void> => Promise.resolve(),
  exportProposalDataAs: (exportAs: ExportTypes) => { },
  // Backwards-compatible alias
  exportProposalAs: (exportAs: ExportTypes) => { },
  exportAudit: () => Promise.resolve(),
  importProposalData: (file: File) => { },
  importANCExcel: (file: File) => Promise.resolve(),
  // Diagnostic functions
  diagnosticOpen: false,
  diagnosticPayload: null,
  openDiagnostic: (payload: any) => { },
  closeDiagnostic: () => { },
  submitDiagnostic: (answers: any) => { },
  lowMarginAlerts: [] as any[],
  // RFP functions
  rfpDocumentUrl: null as string | null,
  aiWorkspaceSlug: null as string | null,
  rfpQuestions: [] as Array<{ id: string; question: string; answer: string | null; answered: boolean; order: number }>,
  uploadRfpDocument: (file: File) => Promise.resolve(),
  answerRfpQuestion: (questionId: string, answer: string) => Promise.resolve(),
  // Command execution
  applyCommand: (command: any) => { },
  executeAiCommand: async (message: string) => { },
  aiMessages: [] as any[],
  aiLoading: false,
  duplicateScreen: (index: number) => { },
  aiFields: [] as string[],
  aiFieldTimestamps: {} as Record<string, number>,
  trackAiFieldModification: (fieldNames: string[]) => { },
  isFieldGhostActive: (fieldName: string) => false,
  proposal: null as any,
  headerType: "PROPOSAL" as "LOI" | "PROPOSAL" | "BUDGET",
  setHeaderType: (type: "LOI" | "PROPOSAL" | "BUDGET") => { },
  // Calculation Mode
  calculationMode: "INTELLIGENCE" as "MIRROR" | "INTELLIGENCE",
  setCalculationMode: (mode: "MIRROR" | "INTELLIGENCE") => { },
  // Risk State
  risks: [] as RiskItem[],
  setRisks: (risks: RiskItem[]) => { },
  rulesDetected: null as any,
  setRulesDetected: (rules: any) => { },
};

export const ProposalContext = createContext(defaultProposalContext);

export const useProposalContext = () => {
  return useContext(ProposalContext);
};

type ProposalContextProviderProps = {
  children: React.ReactNode;
  initialData?: any; // Hydration data
  projectId?: string; // DB ID
};

export const ProposalContextProvider = ({
  children,
  initialData,
  projectId
}: ProposalContextProviderProps) => {
  const router = useRouter();

  // Toasts
  const {
    newProposalSuccess,
    pdfGenerationSuccess,
    saveProposalSuccess,
    modifiedProposalSuccess,
    sendPdfSuccess,
    sendPdfError,
    importProposalError,
    aiExtractionSuccess,
    aiExtractionError,
  } = useToasts();

  // Get form values and methods from form context
  const { getValues, reset, watch, setValue } = useFormContext<ProposalType>();

  // Variables
  const [proposalPdf, setProposalPdf] = useState<Blob>(new Blob());
  const [proposalPdfLoading, setProposalPdfLoading] = useState<boolean>(false);
  const [excelImportLoading, setExcelImportLoading] = useState<boolean>(false);
  const [excelPreviewLoading, setExcelPreviewLoading] = useState<boolean>(false);
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
  const [excelValidationOk, setExcelValidationOk] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("client");

  // Alerts
  const [lowMarginAlerts, setLowMarginAlerts] = useState<Array<{ name: string; marginPct: number }>>([]);

  // RFP state
  const [rfpDocumentUrl, setRfpDocumentUrl] = useState<string | null>(null);
  const [rfpQuestions, setRfpQuestions] = useState<Array<{ id: string; question: string; answer: string | null; answered: boolean; order: number }>>([]);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [aiFieldTimestamps, setAiFieldTimestamps] = useState<Record<string, number>>({});
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [rulesDetected, setRulesDetected] = useState<any>(null);

  // Calculation Mode - THE PRIMARY BRANCH DECISION GATE
  const [calculationMode, setCalculationMode] = useState<"MIRROR" | "INTELLIGENCE">("INTELLIGENCE");

  // AI Ghost Effect - Track recently modified fields with timestamps
  const trackAiFieldModification = useCallback((fieldNames: string[]) => {
    const now = Date.now();
    const timestamps: Record<string, number> = {};
    fieldNames.forEach(field => {
      timestamps[field] = now;
    });
    setAiFieldTimestamps(prev => ({ ...prev, ...timestamps }));
    setAiFields(prev => Array.from(new Set([...prev, ...fieldNames])));

    // Clear timestamps after 3 seconds (ghost effect duration)
    setTimeout(() => {
      setAiFieldTimestamps(prev => {
        const next = { ...prev };
        fieldNames.forEach(field => delete next[field]);
        return next;
      });
    }, 3000);
  }, []);

  // Check if field should show ghost effect (within 3 seconds of AI modification)
  const isFieldGhostActive = useCallback((fieldName: string): boolean => {
    const timestamp = aiFieldTimestamps[fieldName];
    if (!timestamp) return false;
    return Date.now() - timestamp < 3000;
  }, [aiFieldTimestamps]);

  // Sync isolated AI workspace from form state (set via reset(initialData))
  const aiWorkspaceSlug = watch("details.aiWorkspaceSlug") || null;

  const watchedDocumentType = watch("details.documentType");
  const watchedPricingType = watch("details.pricingType");
  const headerType = useMemo(() => {
    return watchedDocumentType === "LOI"
      ? "LOI"
      : watchedPricingType === "Hard Quoted"
        ? "PROPOSAL"
        : "BUDGET";
  }, [watchedDocumentType, watchedPricingType]);

  const setHeaderType = useCallback((next: "LOI" | "PROPOSAL" | "BUDGET") => {
    if (next === "LOI") {
      setValue("details.documentType", "LOI", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setValue("details.documentType", "First Round", { shouldValidate: true, shouldDirty: true });
    setValue("details.pricingType", next === "PROPOSAL" ? "Hard Quoted" : "Budget", { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  // Saved proposals
  const [savedProposals, setSavedProposals] = useState<ProposalType[]>([]);

  useEffect(() => {
    let savedProposalsDefault;
    if (typeof window !== "undefined") {
      // Saved proposals variables
      const savedProposalsJSON = window.localStorage.getItem("savedProposals");
      try {
        savedProposalsDefault = savedProposalsJSON && savedProposalsJSON.trim() !== ""
          ? JSON.parse(savedProposalsJSON)
          : [];
      } catch (e) {
        console.error("Error parsing savedProposals from localStorage:", e);
        savedProposalsDefault = [];
      }
      setSavedProposals(savedProposalsDefault);
    }
  }, []);

  // Persist full form state with debounce
  useEffect(() => {
    if (typeof window === "undefined") return;
    const subscription = watch((value: any) => {
      try {
        window.localStorage.setItem(
          LOCAL_STORAGE_PROPOSAL_DRAFT_KEY,
          JSON.stringify(value)
        );
      } catch { }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Hydrate from initialData if provided (Server Component support)
  useEffect(() => {
    // @ts-ignore
    if (initialData && typeof reset === 'function') {
      const d = initialData;
      console.log("Hydrating ProposalContext from Server Data:", d.id);

      // Map Prisma model to Form structure
      // Ensure we explicitly map JSON fields
      let details: any = {};
      let sender: any = {};
      let receiver: any = {};

      try {
        details = typeof d.detailsData === 'string' && d.detailsData.trim() !== "" ? JSON.parse(d.detailsData) : d.detailsData || {};
      } catch (e) {
        console.error("Error parsing detailsData:", e);
      }

      try {
        sender = typeof d.senderData === 'string' && d.senderData.trim() !== "" ? JSON.parse(d.senderData) : d.senderData || {};
      } catch (e) {
        console.error("Error parsing senderData:", e);
      }

      try {
        receiver = typeof d.receiverData === 'string' && d.receiverData.trim() !== "" ? JSON.parse(d.receiverData) : d.receiverData || {};
      } catch (e) {
        console.error("Error parsing receiverData:", e);
      }

      const mappedData: ProposalType = {
        sender: {
          name: sender.name || FORM_DEFAULT_VALUES.sender.name,
          address: sender.address || FORM_DEFAULT_VALUES.sender.address,
          zipCode: sender.zipCode || FORM_DEFAULT_VALUES.sender.zipCode,
          city: sender.city || FORM_DEFAULT_VALUES.sender.city,
          country: sender.country || FORM_DEFAULT_VALUES.sender.country,
          email: sender.email || FORM_DEFAULT_VALUES.sender.email,
          phone: sender.phone || FORM_DEFAULT_VALUES.sender.phone,
          customInputs: sender.customInputs || [],
        },
        receiver: {
          name: receiver.name || FORM_DEFAULT_VALUES.receiver.name,
          address: receiver.address || FORM_DEFAULT_VALUES.receiver.address,
          zipCode: receiver.zipCode || FORM_DEFAULT_VALUES.receiver.zipCode,
          city: receiver.city || FORM_DEFAULT_VALUES.receiver.city,
          country: receiver.country || FORM_DEFAULT_VALUES.receiver.country,
          email: receiver.email || FORM_DEFAULT_VALUES.receiver.email,
          phone: receiver.phone || FORM_DEFAULT_VALUES.receiver.phone,
          customInputs: receiver.customInputs || [],
        },
        details: {
          proposalId: d.id, // Use DB ID
          proposalNumber: d.id, // Legacy compat
          proposalName: details.proposalName || d.proposalName || "",
          proposalDate: details.proposalDate || new Date().toISOString(),
          dueDate: details.dueDate || new Date().toISOString(),
          items: details.items || [],
          currency: details.currency || "USD",
          language: "English",
          taxDetails: details.taxDetails || FORM_DEFAULT_VALUES.details.taxDetails,
          discountDetails: details.discountDetails || FORM_DEFAULT_VALUES.details.discountDetails,
          shippingDetails: details.shippingDetails || FORM_DEFAULT_VALUES.details.shippingDetails,
          paymentInformation: details.paymentInformation || FORM_DEFAULT_VALUES.details.paymentInformation,
          additionalNotes: details.additionalNotes || "",
          paymentTerms: details.paymentTerms || "Net 30", // Default if missing
          pdfTemplate: details.pdfTemplate || 1,
          venue: details.venue || "Generic",
          subTotal: details.subTotal || 0,
          totalAmount: details.totalAmount || 0,
          totalAmountInWords: details.totalAmountInWords || "",
          // Critical: Screens
          screens: d.screens ? d.screens.map((s: any) => ({
            ...s,
            pitchMm: Number(s.pitchMm || 0),
            widthFt: Number(s.widthFt || 0),
            heightFt: Number(s.heightFt || 0),
            quantity: Number(s.quantity || 1),
          })) : (details.screens || []),
          clientName: d.clientName || "",
          workspaceId: d.workspaceId || "",
          aiWorkspaceSlug: d.aiWorkspaceSlug || null, // Hydrate the workspace slug!
          internalAudit: details.internalAudit || FORM_DEFAULT_VALUES.details.internalAudit,
          clientSummary: details.clientSummary || FORM_DEFAULT_VALUES.details.clientSummary,
          documentType: d.documentType || "First Round",
          pricingType: d.pricingType || "Budget",
          mirrorMode: d.mirrorMode ?? FORM_DEFAULT_VALUES.details.mirrorMode,
          calculationMode: d.calculationMode || FORM_DEFAULT_VALUES.details.calculationMode, // Hydrate calculation mode
          taxRateOverride: d.taxRateOverride ?? details.taxRateOverride ?? FORM_DEFAULT_VALUES.details.taxRateOverride,
          bondRateOverride: d.bondRateOverride ?? details.bondRateOverride ?? FORM_DEFAULT_VALUES.details.bondRateOverride,
        },
      };

      reset(mappedData);
      // Force update the slug state if needed
      setValue("details.aiWorkspaceSlug", d.aiWorkspaceSlug);

      // Hydrate calculation mode from database
      setCalculationMode(d.calculationMode || "INTELLIGENCE");

      // Cleanup AI state on project switch
      setAiMessages([]);
      setAiFields(details.metadata?.filledByAI || []); // Hydrate AI fields from metadata
      setProposalPdf(new Blob());
    }
  }, [initialData, reset, setValue]);

  // SAVE CALCULATION MODE TO DATABASE
  useEffect(() => {
    if (!calculationMode || typeof window === 'undefined') return;

    const handler = setTimeout(async () => {
      const currentValues = getValues();
      const pid = currentValues.details?.proposalId;

      // Only save if we have a valid database ID (not "new")
      if (pid && pid !== 'new' && projectId) {
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ calculationMode })
          });
          console.log("✓ Calculation mode saved:", calculationMode);
        } catch (e) {
          console.warn("Failed to save calculation mode:", e);
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [calculationMode, getValues, projectId]);


  // Reactive Watcher for ANC Logic Brain (Real-time Math)
  const screens = watch("details.screens");
  const mirrorMode = watch("details.mirrorMode") || false;

  // AUTO-SAVE LOGIC (Debounced)
  useEffect(() => {
    if (!screens || typeof window === 'undefined') return;

    // Use a ref or simple timeout for debounce
    const handler = setTimeout(async () => {
      const currentValues = getValues();
      const pid = currentValues.details?.proposalId;

      // Only auto-save if we have a valid database ID (not "new")
      if (pid && pid !== 'new' && projectId) {
        try {
          // Construct payload matching Prisma schema requirements
          // We send partial JSON updates or full JSONs
          const payload = {
            clientName: currentValues.receiver.name || "Unnamed Client",
            senderData: currentValues.sender,
            receiverData: currentValues.receiver,
            detailsData: {
              ...currentValues.details,
              // Don't duplicate screens in detailsData if we use relations, 
              // but for now keeping it redundant for safety is fine or just minimal
            },
            screens: currentValues.details.screens, // This might need special handling endpoint side
            aiWorkspaceSlug: currentValues.details.aiWorkspaceSlug,
            calculationMode: calculationMode, // Sync calculation mode to database
            taxRateOverride: currentValues.details.taxRateOverride,
            bondRateOverride: currentValues.details.bondRateOverride,
            metadata: {
              filledByAI: aiFields, // Persist current AI fields
            }
          };

          // Using specific endpoint for auto-save
          /* 
             Note: The route /api/projects/[id] needs to handle PATCH.
          */
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          // Determine if we need to show a save indicator?
          // For now, silent save is "Enterprise" standard.
        } catch (e) {
          console.warn("Auto-save failed:", e);
        }
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(handler);
  }, [screens, projectId, getValues, watch]); // Re-run when screens change (primary driver of value)


  useEffect(() => {
    if (!screens || !Array.isArray(screens) || screens.length === 0) return;
    if (mirrorMode) return; // PROXIED DATA GUARD: Do not recalc if in Mirror Mode

    try {
      // Normalize for estimator
      const normalized = screens.map((s: any) => ({
        name: s.name || "Unnamed",
        productType: s.productType || "Unknown",
        widthFt: Number(s.widthFt ?? s.width ?? 0),
        heightFt: Number(s.heightFt ?? s.height ?? 0),
        quantity: Number(s.quantity ?? 1),
        pitchMm: Number(s.pitchMm ?? s.pixelPitch ?? 10),
        costPerSqFt: Number(s.costPerSqFt || 120),
        brightness: Number(s.brightness || 0),
        isHDR: !!s.isHDR,
        desiredMargin: s.desiredMargin,
        serviceType: s.serviceType,
        formFactor: s.formFactor,
        isReplacement: !!s.isReplacement,
        useExistingStructure: !!s.useExistingStructure,
        includeSpareParts: s.includeSpareParts !== false,
      }));

      const projectAddress = `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim();
      const venue = getValues("details.venue");
      const { clientSummary, internalAudit } = calculateProposalAudit(normalized, {
        taxRate: getValues("details.taxRateOverride"),
        bondPct: getValues("details.bondRateOverride"),
        structuralTonnage: getValues("details.metadata.structuralTonnage"),
        reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
        projectAddress,
        venue,
      });

      // Update internal state without triggering infinite loop (only if changed)
      const currentAudit = getValues("details.internalAudit");
      if (JSON.stringify(currentAudit?.totals) !== JSON.stringify(internalAudit.totals)) {
        setValue("details.internalAudit", internalAudit);
        setValue("details.clientSummary", clientSummary);

        // Sync line items for PDF template (Polished Mode)
        const screensWithLineItems = syncLineItemsFromAudit(screens, internalAudit);

        // Only setValue if lineItems actually differ to prevent flickering
        setValue("details.screens", screensWithLineItems, { shouldValidate: false });
      }
    } catch (e) {
      console.warn("Real-time calculation failed:", e);
    }
  }, [screens, setValue, getValues]);

  // AUTO-DETECT RISKS
  // Whenever the form values change (specifically location, screens, or if rules exist)
  // We re-run the risk detector.
  // We use the full form values for this.
  const formValues = watch(); // Watch everything for risk detection
  useEffect(() => {
    if (!formValues) return;
    // We only run this if we have some data
    const detected = detectRisks(formValues, rulesDetected);

    // Only update if changed to avoid loops
    if (JSON.stringify(detected) !== JSON.stringify(risks)) {
      setRisks(detected);
    }
  }, [formValues, rulesDetected]); // Dependencies: full form or new rules

  const duplicateScreen = useCallback((index: number) => {
    const values = getValues();
    const screens = values.details.screens ?? [];
    if (index >= 0 && index < screens.length) {
      const screenToCopy = screens[index];
      const newScreen = {
        ...screenToCopy,
        name: `${screenToCopy.name} (Copy)`,
      };
      const updatedScreens = [...screens, newScreen];
      setValue("details.screens", updatedScreens);

      // Recalculate audit
      try {
        const { clientSummary, internalAudit } = calculateProposalAudit(updatedScreens, {
          taxRate: getValues("details.taxRateOverride"),
          bondPct: getValues("details.bondRateOverride"),
          structuralTonnage: getValues("details.metadata.structuralTonnage"),
          reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
          projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
          venue: getValues("details.venue"),
        });
        setValue("details.internalAudit", internalAudit);
        setValue("details.clientSummary", clientSummary);
      } catch (e) { }
    }
  }, [getValues, setValue]);

  // Get pdf url from blob
  const pdfUrl = useMemo(() => {
    if (proposalPdf.size > 0) {
      return window.URL.createObjectURL(proposalPdf);
    }
    return null;
  }, [proposalPdf]);

  /**
   * Handles form submission.
   *
   * @param {ProposalType} data - The form values used to generate the PDF.
   */
  const onFormSubmit = (data: ProposalType) => {
    console.log("VALUE");
    console.log(data);

    // Call generate pdf method
    generatePdf(data);
  };

  /**
   * Clears state and redirects to start a fresh project.
   */
  const newProposal = () => {
    reset(FORM_DEFAULT_VALUES);
    setProposalPdf(new Blob());

    // Clear the draft
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_PROPOSAL_DRAFT_KEY);
      } catch { }
    }

    // Toast
    newProposalSuccess();

    // Force redirect to start fresh initialization
    window.location.href = "/projects/new";
  };

  /**
   * Resets the current form to the last saved state from the database.
   */
  const resetProposal = async () => {
    if (!projectId || projectId === 'new') {
      newProposal();
      return;
    }

    try {
      const resp = await fetch(`/api/projects/${projectId}`);
      const data = await resp.json();
      if (resp.ok && data) {
        // Hydrate logic is already in an useEffect, 
        // but we can trigger a manual reset here for immediate UI feedback
        // Re-using the logic from the hydration useEffect would be cleaner
        // but for now, let's just trigger a refresh or manual reset.
        window.location.reload();
      }
    } catch (e) {
      console.error("Reset failed:", e);
    }
  };

  /**
   * Generate a PDF document based on the provided data.
   *
   * @param {ProposalType} data - The data used to generate the PDF.
   * @returns {Promise<void>} - A promise that resolves when the PDF is successfully generated.
   * @throws {Error} - If an error occurs during the PDF generation process.
   */
  const generatePdf = useCallback(async (data: ProposalType) => {
    setProposalPdfLoading(true);
    let generated: Blob | null = null;

    try {
      // Sanitize screens into the estimator's expected shape
      const screens = (data?.details?.screens || []).map((s: any) => ({
        name: s.name,
        productType: s.productType ?? "",
        heightFt: s.heightFt ?? s.height ?? 0,
        widthFt: s.widthFt ?? s.width ?? 0,
        quantity: s.quantity ?? 1,
        pitchMm: s.pitchMm ?? s.pixelPitch ?? undefined,
        costPerSqFt: s.costPerSqFt,
        desiredMargin: s.desiredMargin,
      }));

      // Compute deterministic audit before generating PDF
      const audit = calculateProposalAudit(screens, {
        taxRate: getValues("details.taxRateOverride"),
        bondPct: getValues("details.bondRateOverride"),
        structuralTonnage: getValues("details.metadata.structuralTonnage"),
        reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
        projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
        venue: getValues("details.venue"),
      });

      const payload = {
        ...data,
        _audit: audit, // include both clientSummary and internalAudit for server-side rendering and archive
      };

      const response = await fetch(GENERATE_PDF_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.blob();
      generated = result;
      setProposalPdf(result);

      if (result.size > 0) {
        // Toast
        pdfGenerationSuccess();
      }
    } catch (err) {
      console.log(err);
    } finally {
      setProposalPdfLoading(false);
    }
    return generated;
  }, []);

  /**
   * Removes the final PDF file and switches to Live Preview
   */
  const removeFinalPdf = () => {
    setProposalPdf(new Blob());
  };

  /**
   * Generates a preview of a PDF file and opens it in a new browser tab.
   */
  const previewPdfInTab = () => {
    if (proposalPdf) {
      const url = window.URL.createObjectURL(proposalPdf);
      window.open(url, "_blank");
    }
  };

  /**
   * Downloads a PDF file.
   */
  const downloadPdf = async () => {
    let pdfBlob: Blob | null = proposalPdf;
    if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
      pdfBlob = await generatePdf(getValues());
    }

    if (pdfBlob instanceof Blob && pdfBlob.size > 0) {
      const url = window.URL.createObjectURL(pdfBlob);

      // Create an anchor element to initiate the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "proposal.pdf";
      document.body.appendChild(a);

      // Trigger the download
      a.click();

      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    }
  };

  /**
   * Prints a PDF file.
   */
  const printPdf = () => {
    if (proposalPdf) {
      const pdfUrl = URL.createObjectURL(proposalPdf);
      const printWindow = window.open(pdfUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  /**
   * Saves the proposal data to local storage.
   */
  const saveProposalData = () => {
    if (proposalPdf) {
      // If get values function is provided, allow to save the proposal
      if (getValues) {
        // Retrieve the existing array from local storage or initialize an empty array
        const savedProposalsJSON = localStorage.getItem("savedProposals");
        let savedProposals = [];
        try {
          savedProposals = savedProposalsJSON && savedProposalsJSON.trim() !== ""
            ? JSON.parse(savedProposalsJSON)
            : [];
        } catch (e) {
          console.error("Error parsing savedProposals from localStorage during save:", e);
          savedProposals = [];
        }

        const formValues = getValues();

        // Normalize IDs: use proposalId
        const id = formValues?.details?.proposalId || `prop-${Date.now()}`;
        formValues.details.proposalId = id;
        // Legacy support
        formValues.details.proposalNumber = id;

        const updatedDate = new Date().toLocaleDateString(
          "en-US",
          SHORT_DATE_OPTIONS
        );

        formValues.details.updatedAt = updatedDate;

        // Attach deterministic audit snapshot for saved proposals (internal audit + client summary)
        try {
          const screens = (formValues?.details?.screens || []).map((s: any) => ({
            name: s.name,
            productType: s.productType ?? "",
            heightFt: s.heightFt ?? s.height ?? 0,
            widthFt: s.widthFt ?? s.width ?? 0,
            quantity: s.quantity ?? 1,
            pitchMm: s.pitchMm ?? s.pixelPitch ?? undefined,
            costPerSqFt: s.costPerSqFt,
            desiredMargin: s.desiredMargin,
          }));

          const audit = calculateProposalAudit(screens, {
            taxRate: getValues("details.taxRateOverride"),
            bondPct: getValues("details.bondRateOverride"),
            structuralTonnage: getValues("details.metadata.structuralTonnage"),
            reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
            projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
            venue: getValues("details.venue"),
          });
          // store under a non-typed key to avoid type mismatch with Zod/ProposalType
          (formValues as any)._internalAudit = audit.internalAudit;
          (formValues as any)._clientSummary = audit.clientSummary;
        } catch (e) {
          console.warn("Failed to calculate audit for saved proposal:", e);
        }

        const existingIndex = savedProposals.findIndex(
          (p: ProposalType) => {
            return (
              p.details.proposalId === id ||
              p.details.proposalNumber === id
            );
          }
        );

        // If proposal already exists
        if (existingIndex !== -1) {
          savedProposals[existingIndex] = formValues;

          // Toast
          modifiedProposalSuccess();
        } else {
          // Add the form values to the array
          savedProposals.push(formValues);

          // Toast
          saveProposalSuccess();
        }

        localStorage.setItem("savedProposals", JSON.stringify(savedProposals));

        setSavedProposals(savedProposals);

        // Attempt to persist to server if workspaceId is available
        try {
          const workspaceId = (formValues as any)?.details?.workspaceId;
          if (workspaceId) {
            // Prepare minimal payload expected by server
            const screens = (formValues as any)?.details?.screens || [];
            fetch("/api/proposals/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workspaceId,
                clientName: (formValues as any)?.receiver?.name || (formValues as any)?.details?.clientName || "",
                screens,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  console.warn("Server save failed for proposal", res.statusText);
                }
              })
              .catch((err) => console.warn("Server save error:", err));
          }
        } catch (e) {
          console.warn("Failed to sync proposal to server:", e);
        }
      }
    }
  };

  /**
   * Delete a proposal from local storage based on the given index.
   *
   * @param {number} index - The index of the proposal to be deleted.
   */
  const deleteProposalData = (index: number) => {
    if (index >= 0 && index < savedProposals.length) {
      const updatedProposals = [...savedProposals];
      updatedProposals.splice(index, 1);
      setSavedProposals(updatedProposals);

      const updatedProposalsJSON = JSON.stringify(updatedProposals);

      localStorage.setItem("savedProposals", updatedProposalsJSON);
    }
  };

  /**
   * Send the proposal PDF to the specified email address.
   *
   * @param {string} email - The email address to which the Proposal PDF will be sent.
   * @returns {Promise<void>} A promise that resolves once the email is successfully sent.
   */
  const sendPdfToMail = (email: string) => {
    const fd = new FormData();
    const formValues = getValues();
    const id = formValues?.details?.proposalId ?? "";
    fd.append("email", email);
    fd.append("proposalPdf", proposalPdf, "proposal.pdf");
    // Keep proposalNumber for backwards-compatibility and include proposalId
    fd.append("proposalNumber", id);
    fd.append("proposalId", id);

    return fetch(SEND_PDF_API, {
      method: "POST",
      body: fd,
    })
      .then((res) => {
        if (res.ok) {
          // Successful toast msg
          sendPdfSuccess();
        } else {
          // Error toast msg
          sendPdfError({ email, sendPdfToMail });
        }
      })
      .catch((error) => {
        console.log(error);

        // Error toast msg
        sendPdfError({ email, sendPdfToMail });
      });
  };

  /**
   * Apply a JSON command returned by the controller LLM
   * Supported command types: ADD_SCREEN, UPDATE_CLIENT, SET_MARGIN, SYNC_CATALOG
   */
  // Diagnostic overlay state
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagnosticPayload, setDiagnosticPayload] = useState<any>(null);

  const openDiagnostic = (payload: any) => {
    setDiagnosticPayload(payload);
    setDiagnosticOpen(true);
  };

  const closeDiagnostic = () => {
    setDiagnosticPayload(null);
    setDiagnosticOpen(false);
  };

  const submitDiagnostic = (answers: any) => {
    // Merge answers with original payload and dispatch as ADD_SCREEN
    const merged = { ...(diagnosticPayload?.payload || {}), ...answers };
    applyCommand({ type: "ADD_SCREEN", payload: merged });
    closeDiagnostic();
  };

  /**
   * Syncs summarized line items to each screen based on current internalAudit
   */
  const syncLineItemsFromAudit = (screens: any[], internalAudit: any) => {
    if (!internalAudit?.perScreen) return screens;

    return screens.map((screen, idx) => {
      // If line items are already present (e.g. from Excel Mirroring), preserve them
      if (screen.lineItems && screen.lineItems.length > 0) {
        return screen;
      }

      const audit = internalAudit.perScreen[idx];
      if (!audit) return screen;

      const b = audit.breakdown;
      // Grouping logic for "Polished" client-facing PDF
      const hardwareSell = b.hardware + (b.ancMargin * (b.hardware / (b.totalCost || 1)));
      const structureSell = b.structure + (b.ancMargin * (b.structure / (b.totalCost || 1)));
      const laborSell = (b.labor + b.install) + (b.ancMargin * ((b.labor + b.install) / (b.totalCost || 1)));
      const otherSell = b.finalClientTotal - hardwareSell - structureSell - laborSell;

      return {
        ...screen,
        lineItems: [
          { id: `hw-${idx}`, category: 'LED Display System', price: hardwareSell },
          { id: `st-${idx}`, category: 'Structural Materials', price: structureSell },
          { id: `inst-${idx}`, category: 'Installation & Labor', price: laborSell },
          { id: `other-${idx}`, category: 'Electrical, Data & Conditions', price: otherSell },
        ]
      };
    });
  };

  const executeAiCommand = async (message: string) => {
    if (!message.trim()) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", content: message };
    setAiMessages((h) => [...h, userMsg]);
    setAiLoading(true);

    try {
      const formValues = getValues();
      const currentProposalId = formValues?.details?.proposalId || "new";

      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          history: aiMessages.map((m) => ({ role: m.role, content: m.content })),
          proposalId: currentProposalId,
          workspace: aiWorkspaceSlug || localStorage.getItem("aiWorkspaceSlug") || "anc-estimator",
        }),
      });

      const data = await res.json();
      let responseText = data?.data?.textResponse || data?.text || "";

      if (data?.data?.action) {
        applyCommand(data.data.action);
      }

      if (responseText) {
        setAiMessages((h) => [...h, { id: `a-${Date.now()}`, role: "assistant", content: responseText }]);
      }
    } catch (err) {
      console.error("AI Command error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const applyCommand = (command: any) => {
    try {
      const formValues = getValues();

      if (!command || !command.type) return;

      switch (command.type) {
        case "ADD_SCREEN": {
          const payload = command.payload || {};
          const screens = formValues.details.screens ?? [];

          const newScreen = {
            name: payload.name ?? "New Screen",
            productType: payload.productType ?? payload.type ?? "Unknown",
            widthFt: Number(payload.widthFt ?? payload.width ?? 0),
            heightFt: Number(payload.heightFt ?? payload.height ?? 0),
            quantity: payload.quantity ?? payload.qty ?? 1,
            pitchMm: Number(payload.pitch ?? payload.pitchMm ?? payload.pitchMm ?? 10),
            costPerSqFt: Number(payload.costPerSqFt ?? payload.cost_per_sqft ?? 120),
            desiredMargin: payload.desiredMargin ?? undefined,
            isReplacement: payload.isReplacement ?? false,
            useExistingStructure: payload.useExistingStructure ?? false,
            includeSpareParts: payload.includeSpareParts ?? true,
          };

          // Track which fields were AI-populated for the blue glow
          const aiPopulated = Object.keys(payload).map(k => `details.screens.${screens.length}.${k}`);
          setAiFields(prev => Array.from(new Set([...prev, ...aiPopulated])));

          // Push new screen
          const updatedScreens = [...screens, newScreen];

          // Calculate audit for the new screen set
          const audit = calculateProposalAudit(updatedScreens, {
            taxRate: getValues("details.taxRateOverride"),
            bondPct: getValues("details.bondRateOverride"),
            structuralTonnage: getValues("details.metadata.structuralTonnage"),
            reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
            projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
            venue: getValues("details.venue"),
          });
          const internalAudit = audit.internalAudit;

          // Sync line items for PDF template
          const screensWithLineItems = syncLineItemsFromAudit(updatedScreens, internalAudit);
          setValue("details.screens", screensWithLineItems);

          // CRITICAL: Flatten all screen-level lineItems into details.items for the PDF Template
          const allItems = screensWithLineItems.flatMap(s => s.lineItems || []).map((li: any) => {
            let desc = "Standard specification.";
            if (li.category.includes('LED')) desc = "Supply of LED Display System including spare parts, power/data cabling, and processing hardware.";
            if (li.category.includes('Structure')) desc = "Structural engineering, fabrication, and mounting hardware.";
            if (li.category.includes('Installation')) desc = "Union labor installation per IBEW jurisdiction. Includes prevailing wage, certified payroll, and final commissioning.";
            if (li.category.includes('Electrical')) desc = "Primary power tie-in and data conduit runs.";

            return {
              name: li.category,
              description: desc,
              quantity: 1,
              unitPrice: li.price,
              total: li.price
            };
          });
          setValue("details.items", allItems);

          // Normalize screens to ensure all have required fields for ScreenInput type
          const normalizedScreens = updatedScreens.map((s: any) => ({
            name: s.name || "Unnamed",
            productType: s.productType || "Unknown",
            widthFt: Number(s.widthFt || s.width || 0),
            heightFt: Number(s.heightFt || s.height || 0),
            quantity: Number(s.quantity || s.qty || 1),
            pitchMm: Number(s.pitchMm || s.pitch || 10),
            costPerSqFt: Number(s.costPerSqFt || s.cost_per_sqft || 120),
            desiredMargin: s.desiredMargin,
            isReplacement: !!s.isReplacement,
            useExistingStructure: !!s.useExistingStructure,
            includeSpareParts: s.includeSpareParts !== false,
          }));

          // Recalculate audit and persist into form for live audit view
          try {
            const { clientSummary, internalAudit } = calculateProposalAudit(normalizedScreens, {
              taxRate: getValues("details.taxRateOverride"),
              bondPct: getValues("details.bondRateOverride"),
              structuralTonnage: getValues("details.metadata.structuralTonnage"),
              reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
              projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
              venue: getValues("details.venue"),
            });
            setValue("details.internalAudit", internalAudit);
            setValue("details.clientSummary", clientSummary);

            // Sync line items for PDF template
            const screensWithLineItems = syncLineItemsFromAudit(normalizedScreens, internalAudit);
            setValue("details.screens", screensWithLineItems);

            // Flag low margins if any per-screen margin below threshold
            try {
              const threshold = parseFloat(process.env.NATALIA_MARGIN_THRESHOLD || "0.2");
              const alerts: Array<{ name: string; marginPct: number }> = [];
              for (const s of internalAudit.perScreen) {
                const ancMargin = s.breakdown.ancMargin;
                const finalClientTotal = s.breakdown.finalClientTotal || 1;
                const marginPct = finalClientTotal ? ancMargin / finalClientTotal : 0;
                if (marginPct < threshold) {
                  console.warn(`Low margin detected for screen ${s.name}: ${Number((marginPct * 100).toFixed(2))}% (< ${(threshold * 100)}%)`);
                  alerts.push({ name: s.name, marginPct });
                }
              }

              if (alerts.length > 0) {
                setLowMarginAlerts(alerts);
              }
            } catch (e) { }



            // Switch to audit tab so estimator changes are visible
            setActiveTab("audit");
          } catch (e) {
            console.warn("Failed to calculate audit after ADD_SCREEN", e);
          }

          break;
        }
        case "UPDATE_CLIENT": {
          const payload = command.payload || {};
          if (payload.name) {
            setValue("receiver.name", payload.name);
            setAiFields(prev => Array.from(new Set([...prev, "receiver.name"])));
          }
          if (payload.address) {
            setValue("receiver.address", payload.address);
            setAiFields(prev => Array.from(new Set([...prev, "receiver.address"])));
          }
          break;
        }
        case "SET_MARGIN":
        case "UPDATE_MARGIN": {
          const payload = command.payload || {};
          const value = Number(payload.value ?? payload.margin ?? payload.desiredMargin);
          if (isFinite(value)) {
            // Apply to all screens
            const screens = formValues.details.screens ?? [];
            const updated = screens.map((s: any) => ({ ...s, desiredMargin: value }));
            setValue("details.screens", updated);

            // Recalculate audit
            try {
              const { clientSummary, internalAudit } = calculateProposalAudit(updated, {
                taxRate: getValues("details.taxRateOverride"),
                bondPct: getValues("details.bondRateOverride"),
                structuralTonnage: getValues("details.metadata.structuralTonnage"),
                reinforcingTonnage: getValues("details.metadata.reinforcingTonnage"),
                projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
                venue: getValues("details.venue"),
              });
              setValue("details.internalAudit", internalAudit);
              setValue("details.clientSummary", clientSummary);

              // Sync line items for PDF template
              const screensWithLineItems = syncLineItemsFromAudit(updated, internalAudit);
              setValue("details.screens", screensWithLineItems);

              // Switch to audit tab because internal pricing changed
              setActiveTab("audit");
            } catch (e) {
              console.warn("Failed to calculate audit after SET_MARGIN", e);
            }
          }
          break;
        }
        case "SYNC_CATALOG": {
          // Ask server to sync the local catalog file with AnythingLLM
          (async () => {
            try {
              const res = await fetch("/api/rag/sync", { method: "POST" });
              const json = await res.json();
              console.log("SYNC_CATALOG server response", json);
            } catch (e) {
              console.error("SYNC_CATALOG failed", e);
            }
          })();

          break;
        }
        case "INCOMPLETE_SPECS": {
          // Open Diagnostic overlay
          openDiagnostic(command);
          break;
        }
        default:
          console.warn("Unknown command type:", command.type);
      }
    } catch (err) {
      console.error("applyCommand error:", err);
    }
  };


  /**
   * Export an proposal in the specified format using the provided form values.
   *
   * This function initiates the export process with the chosen export format and the form data.
   *
   * @param {ExportTypes} exportAs - The format in which to export the proposal.
   */
  const exportProposalDataAs = (exportAs: ExportTypes) => {
    const formValues = getValues();
    const id = formValues?.details?.proposalId ?? formValues?.details?.proposalNumber ?? "";
    formValues.details.proposalId = id;
    formValues.details.proposalNumber = id;

    // Service to export proposal with given parameters
    exportProposal(exportAs, formValues);
  };

  /**
   * Export internal audit XLSX for the current proposal (if proposalId exists)
   */
  const exportAudit = async () => {
    const formValues = getValues();
    const screens = formValues?.details?.screens || [];
    const id = formValues?.details?.proposalId ?? formValues?.details?.proposalNumber ?? "";
    if (screens.length > 0) {
      exportProposalDataAs(ExportTypes.XLSX);
      return;
    }
    if (!id || id === "new") {
      exportProposalDataAs(ExportTypes.XLSX);
      return;
    }

    try {
      const res = await fetch("/api/proposals/export/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          projectAddress: `${formValues?.receiver?.address ?? ""} ${formValues?.receiver?.city ?? ""} ${formValues?.receiver?.zipCode ?? ""} ${formValues?.details?.location ?? ""}`.trim(),
          venue: formValues?.details?.venue ?? "",
        }),
      });

      if (!res.ok) {
        console.error("Audit export failed", await res.text());
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${id}-audit.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("exportAudit error:", e);
    }
  };

  const loadExcelPreview = useCallback(async (file: File) => {
    setExcelPreviewLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const maxRows = 200;
      const maxCols = 60;

      const sheets: ExcelPreviewSheet[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const ref = (sheet as any)["!ref"] as string | undefined;
        const range = ref ? xlsx.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
        const rowsCount = Math.min(range.e.r + 1, maxRows);
        const colsCount = Math.min(range.e.c + 1, maxCols);

        const rawRows = xlsx.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as any[][];

        const grid: string[][] = Array.from({ length: rowsCount }, (_, r) => {
          const src = rawRows[r] || [];
          return Array.from({ length: colsCount }, (_, c) => String(src[c] ?? ""));
        });

        const merges = (((sheet as any)["!merges"] as any[]) || []).map((m) => ({
          s: { r: m.s.r, c: m.s.c },
          e: { r: m.e.r, c: m.e.c },
        }));

        const hiddenRowsMeta = ((sheet as any)["!rows"] as Array<{ hidden?: boolean }> | undefined) || [];
        const hiddenRows = Array.from({ length: rowsCount }, (_, r) => !!hiddenRowsMeta[r]?.hidden);

        const colsMeta = ((sheet as any)["!cols"] as Array<{ wch?: number; hidden?: boolean }> | undefined) || [];
        const colWidths = Array.from({ length: colsCount }, (_, c) => {
          if (colsMeta[c]?.hidden) return 0;
          const wch = colsMeta[c]?.wch;
          return typeof wch === "number" ? wch : null;
        });

        const normalizedSheetName = name.toLowerCase();
        const isLedSheet =
          (normalizedSheetName.includes("led") && normalizedSheetName.includes("sheet")) ||
          normalizedSheetName.includes("led cost sheet");
        const requiredCols = { a: 0, f: 5, g: 6 };

        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(grid.length, 15); r++) {
          const rowText = grid[r].join(" ").toLowerCase();
          if (rowText.includes("display name") || rowText.includes("display")) {
            headerRowIndex = r;
            break;
          }
        }

        let validationIssue = false;
        let hasNumericDimensions = false;
        if (isLedSheet) {
          for (let r = headerRowIndex + 1; r < grid.length; r++) {
            const row = grid[r];
            const nameCell = row[requiredCols.a] || "";
            const rowText = row.join(" ").toUpperCase();
            const isAlt = rowText.includes("ALT");
            if (hiddenRows[r] || isAlt) continue;
            const isRowActive = String(nameCell).trim() !== "";
            if (!isRowActive) continue;
            const h = String(row[requiredCols.f] || "").trim();
            const w = String(row[requiredCols.g] || "").trim();

            const isBad = (v: string) => v === "" || v.toUpperCase().includes("TBD");
            if (isBad(nameCell) || isBad(h) || isBad(w)) {
              validationIssue = true;
              continue;
            }

            const toNum = (v: string) => Number(String(v).replace(/[^\d.-]/g, ""));
            const hn = toNum(h);
            const wn = toNum(w);
            if (!isFinite(hn) || !isFinite(wn) || hn <= 0 || wn <= 0) {
              validationIssue = true;
              continue;
            }
            hasNumericDimensions = true;
          }
        }

        return {
          name,
          grid,
          merges,
          hiddenRows,
          colWidths,
          validationIssue,
          hasNumericDimensions,
        };
      });

      const ledSheet = sheets.find((s) => {
        const n = s.name.toLowerCase();
        return (n.includes("led") && n.includes("sheet")) || n.includes("led cost sheet");
      });
      setExcelValidationOk(!!ledSheet?.hasNumericDimensions && !ledSheet?.validationIssue);

      setExcelPreview({
        fileName: file.name,
        sheets,
        loadedAt: Date.now(),
      });
    } catch {
      setExcelPreview(null);
      setExcelValidationOk(false);
    } finally {
      setExcelPreviewLoading(false);
    }
  }, []);

  /**
   * Import an proposal from a JSON file.
   *
   * @param {File} file - The JSON file to import.
   */
  const importProposalData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);

        // Parse the dates
        if (importedData.details) {
          if (importedData.details.proposalDate) {
            importedData.details.proposalDate = new Date(
              importedData.details.proposalDate
            );
          }
          if (importedData.details.dueDate) {
            importedData.details.dueDate = new Date(
              importedData.details.dueDate
            );
          }

          // Normalize IDs/dates: prefer proposalId/proposalDate and fill proposal fallbacks
          importedData.details.proposalId = importedData.details.proposalId ?? importedData.details.proposalNumber ?? "";
          importedData.details.proposalNumber = importedData.details.proposalNumber ?? importedData.details.proposalId;
          importedData.details.proposalDate = importedData.details.proposalDate ?? importedData.details.proposalDate ?? null;
        }

        // Reset form with imported data
        reset(importedData);
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        importProposalError();
      }
    };
    reader.readAsText(file);
  };

  /**
   * Import an ANC Master Excel file and update the proposal state.
   * 
   * @param {File} file - The Excel file to import.
   */
  const importANCExcel = async (file: File) => {
    loadExcelPreview(file);
    const formData = new FormData();
    formData.append("file", file);

    setExcelImportLoading(true);
    try {
      const res = await fetch("/api/proposals/import-excel", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      if (data.formData) {
        const { formData, internalAudit } = data;

        // 1. Batch update main form fields
        const currentReceiverName = (getValues("receiver.name") ?? "").toString().trim();
        const importedReceiverName = (formData.receiver?.name ?? "").toString().trim();
        const currentProposalName = (getValues("details.proposalName") ?? "").toString().trim();
        const importedProposalName = (formData.details?.proposalName ?? "").toString().trim();

        const isReceiverPlaceholder =
          currentReceiverName.length === 0 ||
          currentReceiverName === FORM_DEFAULT_VALUES.receiver.name ||
          currentReceiverName.toLowerCase() === "new project" ||
          currentReceiverName.toLowerCase() === "placeholder";

        const isImportedReceiverPlaceholder =
          importedReceiverName.length === 0 ||
          importedReceiverName === FORM_DEFAULT_VALUES.receiver.name ||
          importedReceiverName.toLowerCase() === "new project" ||
          importedReceiverName.toLowerCase() === "placeholder";

        const isProposalPlaceholder =
          currentProposalName.length === 0 ||
          currentProposalName.toLowerCase() === "new project" ||
          currentProposalName.toLowerCase() === "placeholder";

        const isImportedProposalPlaceholder =
          importedProposalName.length === 0 ||
          importedProposalName.toLowerCase() === "anc led display proposal" ||
          importedProposalName.toLowerCase() === "new project" ||
          importedProposalName.toLowerCase() === "placeholder";

        // Only overwrite if current is placeholder AND imported is NOT placeholder
        if (isReceiverPlaceholder && !isImportedReceiverPlaceholder) {
          setValue("receiver.name", importedReceiverName, { shouldValidate: true, shouldDirty: true });
        }

        if (isProposalPlaceholder && !isImportedProposalPlaceholder) {
          setValue("details.proposalName", importedProposalName, { shouldValidate: true, shouldDirty: true });
        }

        // Also preserve address/city/zip if they exist locally
        const fieldsToPreserve = [
          "receiver.address",
          "receiver.city",
          "receiver.zipCode",
          "details.venue",
          "details.location"
        ] as const;

        fieldsToPreserve.forEach((field) => {
          const current = (getValues(field) ?? "").toString().trim();
          const imported = (formData.receiver?.[field.split(".")[1] as keyof typeof formData.receiver] ?? 
                            formData.details?.[field.split(".")[1] as keyof typeof formData.details] ?? "").toString().trim();
          
          const isCurrentEmpty = current.length === 0 || current.toLowerCase() === "placeholder";
          const isImportedNotEmpty = imported.length > 0 && imported.toLowerCase() !== "placeholder";

          if (isCurrentEmpty && isImportedNotEmpty) {
            setValue(field, imported, { shouldValidate: true, shouldDirty: true });
          }
        });

        if (formData.details?.mirrorMode !== undefined) setValue("details.mirrorMode", formData.details.mirrorMode, { shouldValidate: true, shouldDirty: true });

        // 2. Handle Screens & Line Items
        if (formData.details?.screens && internalAudit) {
          const screens = formData.details.screens;

          // Sync line items for PDF template (Injecting pricing from Audit into Screen Objects)
          const screensWithLineItems = syncLineItemsFromAudit(screens, internalAudit);
          setValue("details.screens", screensWithLineItems, { shouldValidate: true, shouldDirty: true });
          setValue("details.internalAudit", internalAudit, { shouldValidate: true, shouldDirty: true });
          setValue("details.clientSummary", internalAudit.totals, { shouldValidate: true, shouldDirty: true });

          // 3. CRITICAL: Update the PDF Item Table (The "Items" array used by templates)
          const allItems = screensWithLineItems.flatMap(s => (s.lineItems || []).map((li: any) => ({
            name: li.category,
            description: s.description || "Standard LED specification.",
            quantity: 1,
            unitPrice: li.price,
            total: li.price
          })));
          setValue("details.items", allItems, { shouldValidate: true, shouldDirty: true });
        }
      }

      aiExtractionSuccess();
      setActiveTab("audit");
    } finally {
      setExcelImportLoading(false);
    }
  };

  return (
    <ProposalContext.Provider
      value={{
        proposalPdf,
        proposalPdfLoading,
        excelImportLoading,
        excelPreviewLoading,
        excelPreview,
        excelValidationOk,
        loadExcelPreview,
        savedProposals,
        pdfUrl,
        activeTab,
        setActiveTab,
        onFormSubmit,
        newProposal,
        resetProposal,
        generatePdf,
        removeFinalPdf,
        downloadPdf,
        printPdf,
        previewPdfInTab,
        saveProposalData,
        deleteProposalData,
        // Backwards-compatible alias
        deleteProposal: deleteProposalData,
        sendPdfToMail,
        exportProposalDataAs,
        // Backwards-compatible alias
        exportProposalAs: exportProposalDataAs,
        exportAudit,
        importProposalData,
        importANCExcel,
        // Diagnostic functions
        diagnosticOpen,
        diagnosticPayload,
        openDiagnostic,
        closeDiagnostic,
        submitDiagnostic,
        // Alerts
        lowMarginAlerts,
        // RFP functions
        rfpDocumentUrl,
        aiWorkspaceSlug,
        rfpQuestions,
        uploadRfpDocument: async (file: File) => {
          const formData = new FormData();
          formData.append("file", file);
          if (getValues().details.proposalId) {
            formData.append("proposalId", getValues().details.proposalId as string);
          }
          try {
            const res = await fetch("/api/rfp/upload", { method: "POST", body: formData });
            const data = await res.json();

            if (data.ok) {
              setRfpDocumentUrl(data.url);
              if (data.questions) setRfpQuestions(data.questions);

              // Apply AI extracted data if available
              if (data.extractedData) {
                const ext = data.extractedData;
                const aiPopulated: string[] = [];
                if (ext.receiver?.name) setValue("receiver.name", ext.receiver.name);
                if (ext.details?.proposalName) setValue("details.proposalName", ext.details.proposalName);
                if (ext.venue) {
                  setValue("details.venue", ext.venue);
                  aiPopulated.push("details.venue");
                }
                if (ext.rulesDetected?.structuralTonnage) {
                  setValue("details.metadata.structuralTonnage", Number(ext.rulesDetected.structuralTonnage));
                  aiPopulated.push("details.metadata.structuralTonnage");
                }
                if (ext.rulesDetected?.reinforcingTonnage) {
                  setValue("details.metadata.reinforcingTonnage", Number(ext.rulesDetected.reinforcingTonnage));
                  aiPopulated.push("details.metadata.reinforcingTonnage");
                }

                if (ext.details?.screens && Array.isArray(ext.details.screens)) {
                  const normalized = ext.details.screens.map((s: any, idx: number) => {
                    const prefix = `details.screens[${idx}]`;
                    if (s.name) aiPopulated.push(`${prefix}.name`);
                    if (s.widthFt) aiPopulated.push(`${prefix}.widthFt`);
                    if (s.heightFt) aiPopulated.push(`${prefix}.heightFt`);
                    if (s.pitchMm) aiPopulated.push(`${prefix}.pitchMm`);
                    if (s.pixelsH) aiPopulated.push(`${prefix}.pixelsH`);
                    if (s.pixelsW) aiPopulated.push(`${prefix}.pixelsW`);
                    if (s.brightness) aiPopulated.push(`${prefix}.brightness`);
                    if (s.isReplacement !== undefined) aiPopulated.push(`${prefix}.isReplacement`);

                    return {
                      name: s.name || "New Screen",
                      externalName: s.externalName || s.name,
                      widthFt: Number(s.widthFt || 0),
                      heightFt: Number(s.heightFt || 0),
                      quantity: Number(s.quantity || 1),
                      pitchMm: Number(s.pitchMm || 10),
                      pixelsH: Number(s.pixelsH || 0),
                      pixelsW: Number(s.pixelsW || 0),
                      brightness: s.brightness || "",
                      serviceType: s.serviceType || "Front/Rear",
                      isReplacement: !!s.isReplacement,
                      useExistingStructure: !!s.useExistingStructure,
                      includeSpareParts: s.includeSpareParts !== false,
                    };
                  });
                  setValue("details.screens", normalized);
                  if (ext.receiver?.name) {
                    setValue("receiver.name", ext.receiver.name);
                    aiPopulated.push("receiver.name");
                  }
                  if (ext.details?.proposalName) {
                    setValue("details.proposalName", ext.details.proposalName);
                    aiPopulated.push("details.proposalName");
                  }
                  setAiFields(aiPopulated);

                  // Immediately recalculate audit for the new screens
                  try {
                    const { clientSummary, internalAudit } = calculateProposalAudit(normalized, {
                      taxRate: getValues("details.taxRateOverride"),
                      bondPct: getValues("details.bondRateOverride"),
                      structuralTonnage: ext.rulesDetected?.structuralTonnage,
                      reinforcingTonnage: ext.rulesDetected?.reinforcingTonnage,
                      projectAddress: `${getValues("receiver.address") ?? ""} ${getValues("receiver.city") ?? ""} ${getValues("receiver.zipCode") ?? ""} ${getValues("details.location") ?? ""}`.trim(),
                      venue: ext.venue ?? getValues("details.venue"),
                    });
                    setValue("details.internalAudit", internalAudit);
                    setValue("details.clientSummary", clientSummary);
                  } catch (e) { }
                }
              }
              // Let the user know the magic happened!
              aiExtractionSuccess();
            }
          } catch (e) {
            console.error("RFP upload error", e);
          }
        },
        answerRfpQuestion: async (questionId: string, answer: string) => {
          const proposalId = getValues().details.proposalId;
          try {
            const res = await fetch("/api/rfp/answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ proposalId, questionId, answer }),
            });
            const data = await res.json();
            if (data.ok) {
              setRfpQuestions((prev) =>
                prev.map((q) => (q.id === questionId ? { ...q, answer, answered: true } : q))
              );
            }
          } catch (e) {
            console.error("RFP answer error", e);
          }
        },
        // command execution
        applyCommand,
        executeAiCommand,
        aiMessages,
        aiLoading,
        duplicateScreen,
        aiFields,
        aiFieldTimestamps,
        trackAiFieldModification,
        isFieldGhostActive,
        proposal: watch(),
        headerType,
        setHeaderType,
        // Calculation Mode
        calculationMode,
        setCalculationMode,
        // Risks
        risks,
        setRisks,
        rulesDetected,
        setRulesDetected,
      }}
    >
      {children}

      {/* Diagnostic overlay placed in provider so it can block the whole app */}
      {typeof window !== "undefined" ? (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - dynamic require to avoid SSR issues
        require("@/app/components/DiagnosticOverlay").default()
      ) : null}
    </ProposalContext.Provider>
  );
};
