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
import { exportProposal } from "@/services/invoice/client/exportProposal";

// Variables
import {
  FORM_DEFAULT_VALUES,
  GENERATE_PDF_API,
  SEND_PDF_API,
  SHORT_DATE_OPTIONS,
  LOCAL_STORAGE_PROPOSAL_DRAFT_KEY,
  LOCAL_STORAGE_INVOICE_DRAFT_KEY,
} from "@/lib/variables";

// Types
import { ExportTypes, ProposalType } from "@/types";

// Estimator / Audit
import { calculateProposalAudit } from "@/lib/estimator";

const defaultProposalContext = {
  proposalPdf: new Blob(),
  proposalPdfLoading: false,
  excelImportLoading: false,
  savedProposals: [] as ProposalType[],
  pdfUrl: null as string | null,
  activeTab: "client",
  setActiveTab: (tab: string) => { },
  onFormSubmit: (values: ProposalType) => { },
  newProposal: () => { },
  generatePdf: async (data: ProposalType) => { },
  removeFinalPdf: () => { },
  downloadPdf: () => { },
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
  proposal: null as any,
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
  const [activeTab, setActiveTab] = useState<string>("client");

  // Alerts
  const [lowMarginAlerts, setLowMarginAlerts] = useState<Array<{ name: string; marginPct: number }>>([]);

  // RFP state
  const [rfpDocumentUrl, setRfpDocumentUrl] = useState<string | null>(null);
  const [rfpQuestions, setRfpQuestions] = useState<Array<{ id: string; question: string; answer: string | null; answered: boolean; order: number }>>([]);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Sync isolated AI workspace from form state (set via reset(initialData))
  const aiWorkspaceSlug = watch("details.aiWorkspaceSlug") || null;

  // Saved proposals
  const [savedProposals, setSavedProposals] = useState<ProposalType[]>([]);

  useEffect(() => {
    let savedProposalsDefault;
    if (typeof window !== undefined) {
      // Saved invoices variables
      const savedProposalsJSON = window.localStorage.getItem("savedProposals");
      savedProposalsDefault = savedProposalsJSON
        ? JSON.parse(savedProposalsJSON)
        : [];
      setSavedProposals(savedProposalsDefault);
    }
  }, []);

  // Persist full form state with debounce
  useEffect(() => {
    if (typeof window === "undefined") return;
    const subscription = watch((value: any) => {
      try {
        window.localStorage.setItem(
          LOCAL_STORAGE_INVOICE_DRAFT_KEY,
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
      const details = typeof d.detailsData === 'string' ? JSON.parse(d.detailsData) : d.detailsData || {};
      const sender = typeof d.senderData === 'string' ? JSON.parse(d.senderData) : d.senderData || {};
      const receiver = typeof d.receiverData === 'string' ? JSON.parse(d.receiverData) : d.receiverData || {};

      const mappedData: ProposalType = {
        sender: {
          name: sender.name || "",
          address: sender.address || "",
          zipCode: sender.zipCode || "",
          city: sender.city || "",
          country: sender.country || "",
          email: sender.email || "",
          phone: sender.phone || "",
          customInputs: sender.customInputs || [],
        },
        receiver: {
          name: receiver.name || "",
          address: receiver.address || "",
          zipCode: receiver.zipCode || "",
          city: receiver.city || "",
          country: receiver.country || "",
          email: receiver.email || "",
          phone: receiver.phone || "",
          customInputs: receiver.customInputs || [],
        },
        details: {
          proposalId: d.id, // Use DB ID
          invoiceNumber: d.id, // Legacy compat
          proposalName: details.proposalName || d.proposalName || "",
          invoiceDate: details.invoiceDate || new Date().toISOString(),
          dueDate: details.dueDate || new Date().toISOString(),
          items: details.items || [],
          currency: details.currency || "USD",
          language: "English",
          taxDetails: details.taxDetails,
          discountDetails: details.discountDetails,
          shippingDetails: details.shippingDetails,
          paymentInformation: details.paymentInformation,
          additionalNotes: details.additionalNotes,
          paymentTerms: details.paymentTerms || "Net 30", // Default if missing
          pdfTemplate: details.pdfTemplate || 1,
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
          internalAudit: details.internalAudit || null,
          clientSummary: details.clientSummary || null,
          documentType: d.documentType || "First Round",
          pricingType: d.pricingType || "Budget",
          mirrorMode: d.mirrorMode ?? false,
        },
      };

      reset(mappedData);
      // Force update the slug state if needed
      setValue("details.aiWorkspaceSlug", d.aiWorkspaceSlug);

      // Cleanup AI state on project switch
      setAiMessages([]);
      setAiFields([]);
      setProposalPdf(new Blob());
    }
  }, [initialData, reset, setValue]);


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
            aiWorkspaceSlug: currentValues.details.aiWorkspaceSlug
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
        desiredMargin: s.desiredMargin,
        serviceType: s.serviceType,
        formFactor: s.formFactor,
        isReplacement: !!s.isReplacement,
        useExistingStructure: !!s.useExistingStructure,
        includeSpareParts: s.includeSpareParts !== false,
      }));

      const { clientSummary, internalAudit } = calculateProposalAudit(normalized);

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
        const { clientSummary, internalAudit } = calculateProposalAudit(updatedScreens);
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
   * Generates a new proposal.
   */
  const newProposal = () => {
    reset(FORM_DEFAULT_VALUES);
    setProposalPdf(new Blob());

    // Clear the draft
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_INVOICE_DRAFT_KEY);
      } catch { }
    }

    router.refresh();

    // Toast
    newProposalSuccess();
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
      const audit = calculateProposalAudit(screens);

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
  const downloadPdf = () => {
    // Only download if there is a pdf
    if (proposalPdf instanceof Blob && proposalPdf.size > 0) {
      // Create a blob URL to trigger the download
      const url = window.URL.createObjectURL(proposalPdf);

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
        const savedProposals = savedProposalsJSON
          ? JSON.parse(savedProposalsJSON)
          : [];

        const formValues = getValues();

        // Normalize IDs: use proposalId
        const id = formValues?.details?.proposalId || `prop-${Date.now()}`;
        formValues.details.proposalId = id;
        // Legacy support
        formValues.details.invoiceNumber = id;

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

          const audit = calculateProposalAudit(screens);
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
              p.details.invoiceNumber === id
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
    // Keep invoiceNumber for backwards-compatibility and include proposalId
    fd.append("invoiceNumber", id);
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
          const audit = calculateProposalAudit(updatedScreens);
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
            const { clientSummary, internalAudit } = calculateProposalAudit(normalizedScreens);
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
              const { clientSummary, internalAudit } = calculateProposalAudit(updated);
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
   * Export an invoice in the specified format using the provided form values.
   *
   * This function initiates the export process with the chosen export format and the form data.
   *
   * @param {ExportTypes} exportAs - The format in which to export the invoice.
   */
  const exportProposalDataAs = (exportAs: ExportTypes) => {
    const formValues = getValues();
    const id = formValues?.details?.proposalId ?? formValues?.details?.invoiceNumber ?? "";
    formValues.details.proposalId = id;
    formValues.details.invoiceNumber = id;

    // Service to export invoice with given parameters
    exportProposal(exportAs, formValues);
  };

  /**
   * Export internal audit XLSX for the current proposal (if proposalId exists)
   */
  const exportAudit = async () => {
    const formValues = getValues();
    const id = formValues?.details?.proposalId ?? formValues?.details?.invoiceNumber ?? "";
    if (!id) {
      console.warn("No proposal id set for exportAudit");
      return;
    }

    try {
      const res = await fetch("/api/proposals/export/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id }),
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

  /**
   * Import an invoice from a JSON file.
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
          if (importedData.details.invoiceDate) {
            importedData.details.invoiceDate = new Date(
              importedData.details.invoiceDate
            );
          }
          if (importedData.details.dueDate) {
            importedData.details.dueDate = new Date(
              importedData.details.dueDate
            );
          }

          // Normalize IDs/dates: prefer proposalId/proposalDate and fill invoice fallbacks
          importedData.details.proposalId = importedData.details.proposalId ?? importedData.details.invoiceNumber ?? "";
          importedData.details.invoiceNumber = importedData.details.invoiceNumber ?? importedData.details.proposalId;
          importedData.details.proposalDate = importedData.details.proposalDate ?? importedData.details.invoiceDate ?? null;
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

      // Update form values with imported data
      if (data.clientName) setValue("receiver.name", data.clientName);
      if (data.proposalName) setValue("details.proposalName", data.proposalName);

      if (data.screens && data.screens.length > 0) {
        setValue("details.screens", data.screens);
      }

      if (data.internalAudit) {
        setValue("details.internalAudit", data.internalAudit);
        setValue("details.clientSummary", data.clientSummary || data.internalAudit.totals); // Fallback

        // Sync line items for PDF template
        if (data.screens) {
          const screensWithLineItems = syncLineItemsFromAudit(data.screens, data.internalAudit);
          setValue("details.screens", screensWithLineItems);

          // Flatten for PDF item table
          const allItems = screensWithLineItems.flatMap(s => (s.lineItems || []).map((li: any) => ({
            name: li.category,
            description: s.description || "Standard specification.",
            quantity: 1,
            unitPrice: li.price,
            total: li.price
          })));
          setValue("details.items", allItems);
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
        savedProposals,
        pdfUrl,
        activeTab,
        setActiveTab,
        onFormSubmit,
        newProposal,
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
                if (ext.receiver?.name) setValue("receiver.name", ext.receiver.name);
                if (ext.details?.proposalName) setValue("details.proposalName", ext.details.proposalName);

                if (ext.details?.screens && Array.isArray(ext.details.screens)) {
                  const aiPopulated: string[] = [];
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
                    const { clientSummary, internalAudit } = calculateProposalAudit(normalized);
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
        proposal: watch(),
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
