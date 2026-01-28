// Variables
import { EXPORT_PROPOSAL_API } from "@/lib/variables";

// Types
import { ExportTypes, ProposalType } from "@/types";

/**
 * Export an proposal by sending a POST request to the server and initiating the download.
 *
 * @param {ExportTypes} exportAs - The format in which to export the proposal (e.g., JSON, CSV).
 * @param {ProposalType} formValues - The proposal form data to be exported.
 * @throws {Error} If there is an error during the export process.
 * @returns {Promise<void>} A promise that resolves when the export is completed.
 */
export const exportProposal = async (
    exportAs: ExportTypes,
    formValues: ProposalType
) => {
    return fetch(`${EXPORT_PROPOSAL_API}?format=${exportAs}`, {
        method: "POST",
        body: JSON.stringify(formValues),
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((res) => res.blob())
        .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `proposal.${exportAs.toLowerCase()}`;
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
            console.error("Error downloading:", error);
        });
};
