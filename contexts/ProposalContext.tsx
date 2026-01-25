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
} from "@/lib/variables";

// Types
import { ExportTypes, ProposalType } from "@/types";

const defaultProposalContext = {
  proposalPdf: new Blob(),
  proposalPdfLoading: false,
  savedProposals: [] as ProposalType[],
  pdfUrl: null as string | null,
  onFormSubmit: (values: ProposalType) => {},
  newProposal: () => {},
  generatePdf: async (data: ProposalType) => {},
  removeFinalPdf: () => {},
  downloadPdf: () => {},
  printPdf: () => {},
  previewPdfInTab: () => {},
  saveProposalData: () => {},
  deleteProposalData: (index: number) => {},
  sendPdfToMail: (email: string): Promise<void> => Promise.resolve(),
  exportProposalDataAs: (exportAs: ExportTypes) => {},
  importProposalData: (file: File) => {},
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
  } = useToasts();

  // Get form values and methods from form context
  const { getValues, reset, watch } = useFormContext<ProposalType>();

  // Variables
  const [proposalPdf, setProposalPdf] = useState<Blob>(new Blob());
  const [proposalPdfLoading, setProposalPdfLoading] = useState<boolean>(false);

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
    const subscription = watch((value) => {
      try {
        window.localStorage.setItem(
          LOCAL_STORAGE_INVOICE_DRAFT_KEY,
          JSON.stringify(value)
        );
      } catch {}
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
      } catch {}
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
    setInvoicePdfLoading(true);

    try {
      const response = await fetch(GENERATE_PDF_API, {
        method: "POST",
        body: JSON.stringify(data),
      });

      const result = await response.blob();
      setInvoicePdf(result);

      if (result.size > 0) {
        // Toast
        pdfGenerationSuccess();
      }
    } catch (err) {
      console.log(err);
    } finally {
      setInvoicePdfLoading(false);
    }
  }, []);

  /**
   * Removes the final PDF file and switches to Live Preview
   */
  const removeFinalPdf = () => {
    setInvoicePdf(new Blob());
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
   * Saves the invoice data to local storage.
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

        const updatedDate = new Date().toLocaleDateString(
          "en-US",
          SHORT_DATE_OPTIONS
        );

        const formValues = getValues();
        formValues.details.updatedAt = updatedDate;

        const existingInvoiceIndex = savedProposals.findIndex(
          (invoice: ProposalType) => {
            return (
              invoice.details.invoiceNumber === formValues.details.invoiceNumber
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

        setSavedInvoices(savedProposals);
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
      setSavedInvoices(updatedInvoices);

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
    fd.append("email", email);
    fd.append("proposalPdf", proposalPdf, "invoice.pdf");
    fd.append("invoiceNumber", getValues().details.invoiceNumber);

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
   * Export an invoice in the specified format using the provided form values.
   *
   * This function initiates the export process with the chosen export format and the form data.
   *
   * @param {ExportTypes} exportAs - The format in which to export the invoice.
   */
  const exportProposalDataAs = (exportAs: ExportTypes) => {
    const formValues = getValues();

    // Service to export invoice with given parameters
    exportProposal(exportAs, formValues);
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
        onFormSubmit,
        newProposal,
        generatePdf,
        removeFinalPdf,
        downloadPdf,
        printPdf,
        previewPdfInTab,
        saveProposalData,
        deleteProposalData,
        sendPdfToMail,
        exportProposalDataAs,
        importProposalData,
      }}
    >
      {children}
    </ProposalContext.Provider>
  );
};
