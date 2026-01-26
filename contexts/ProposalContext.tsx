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
  duplicateScreen: (index: number) => { },
  proposal: null as any,
};

export const ProposalContext = createContext(defaultProposalContext);

export const useProposalContext = () => {
  return useContext(ProposalContext);
};

type ProposalContextProviderProps = {
  children: React.ReactNode;
};

export const ProposalContextProvider = ({
  children,
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
  const [activeTab, setActiveTab] = useState<string>("client");

  // Alerts
  const [lowMarginAlerts, setLowMarginAlerts] = useState<Array<{ name: string; marginPct: number }>>([]);

  // RFP state
  const [rfpDocumentUrl, setRfpDocumentUrl] = useState<string | null>(null);
  const [aiWorkspaceSlug, setAiWorkspaceSlug] = useState<string | null>(null);
  const [rfpQuestions, setRfpQuestions] = useState<Array<{ id: string; question: string; answer: string | null; answered: boolean; order: number }>>([]);

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
    // Only download if there is an invoice
    if (proposalPdf instanceof Blob && proposalPdf.size > 0) {
      // Create a blob URL to trigger the download
      const url = window.URL.createObjectURL(proposalPdf);

      // Create an anchor element to initiate the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoice.pdf";
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

  // TODO: Change function name. (saveProposalDataData maybe?)
  /**
   * Saves the invoice/proposal data to local storage (normalizes invoice/proposal ids).
   */
  const saveProposalData = () => {
    if (proposalPdf) {
      // If get values function is provided, allow to save the invoice
      if (getValues) {
        // Retrieve the existing array from local storage or initialize an empty array
        const savedProposalsJSON = localStorage.getItem("savedProposals");
        const savedProposals = savedProposalsJSON
          ? JSON.parse(savedProposalsJSON)
          : [];

        const formValues = getValues();

        // Normalize IDs: prefer proposalId, fall back to invoiceNumber, keep both in sync
        const id =
          formValues?.details?.proposalId ?? formValues?.details?.invoiceNumber ?? "";
        formValues.details.proposalId = id;
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

        const existingInvoiceIndex = savedProposals.findIndex(
          (invoice: ProposalType) => {
            return (
              invoice.details.invoiceNumber === id ||
              invoice.details.proposalId === id
            );
          }
        );

        // If invoice already exists
        if (existingInvoiceIndex !== -1) {
          savedProposals[existingInvoiceIndex] = formValues;

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

  // TODO: Change function name. (deleteProposalDataData maybe?)
  /**
   * Delete an invoice from local storage based on the given index.
   *
   * @param {number} index - The index of the invoice to be deleted.
   */
  const deleteProposalData = (index: number) => {
    if (index >= 0 && index < savedProposals.length) {
      const updatedInvoices = [...savedProposals];
      updatedInvoices.splice(index, 1);
      setSavedProposals(updatedInvoices);

      const updatedInvoicesJSON = JSON.stringify(updatedInvoices);

      localStorage.setItem("savedProposals", updatedInvoicesJSON);
    }
  };

  /**
   * Send the invoice PDF to the specified email address.
   *
   * @param {string} email - The email address to which the Invoice PDF will be sent.
   * @returns {Promise<void>} A promise that resolves once the email is successfully sent.
   */
  const sendPdfToMail = (email: string) => {
    const fd = new FormData();
    const formValues = getValues();
    const id = formValues?.details?.proposalId ?? formValues?.details?.invoiceNumber ?? "";
    fd.append("email", email);
    fd.append("proposalPdf", proposalPdf, "invoice.pdf");
    // Keep invoiceNumber for backwards-compatibility and include proposalId
    fd.append("invoiceNumber", formValues?.details?.invoiceNumber ?? id);
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

          // Push new screen
          const updatedScreens = [...screens, newScreen];
          setValue("details.screens", updatedScreens);

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
          if (payload.name) setValue("receiver.name", payload.name);
          if (payload.address) setValue("receiver.address", payload.address);
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

  return (
    <ProposalContext.Provider
      value={{
        proposalPdf,
        proposalPdfLoading,
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
                  const normalized = ext.details.screens.map((s: any) => ({
                    name: s.name || "New Screen",
                    externalName: s.externalName || s.name,
                    widthFt: Number(s.widthFt || 0),
                    heightFt: Number(s.heightFt || 0),
                    quantity: Number(s.quantity || 1),
                    pitchMm: Number(s.pitchMm || 10),
                    serviceType: s.serviceType || "Front/Rear",
                    isReplacement: !!s.isReplacement,
                    useExistingStructure: !!s.useExistingStructure,
                    includeSpareParts: s.includeSpareParts !== false,
                  }));
                  setValue("details.screens", normalized);

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
        duplicateScreen: (index: number) => {
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
        },
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
