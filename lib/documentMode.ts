export type DocumentMode = "BUDGET" | "PROPOSAL" | "LOI";

export function resolveDocumentMode(details: any): DocumentMode {
  const explicit = details?.documentMode;
  if (explicit === "BUDGET" || explicit === "PROPOSAL" || explicit === "LOI") return explicit;

  const documentType = details?.documentType;
  if (documentType === "LOI") return "LOI";

  const pricingType = details?.pricingType;
  if (pricingType === "Hard Quoted") return "PROPOSAL";

  return "BUDGET";
}

export function applyDocumentModeDefaults(mode: DocumentMode, current: any) {
  const base = { ...(current || {}) };
  base.documentMode = mode;

  if (mode === "LOI") {
    base.showPaymentTerms = true;
    base.showSignatureBlock = true;
    base.showExhibitA = true;
    base.showExhibitB = true;
    base.showSpecifications = false;
    return base;
  }

  base.showPaymentTerms = false;
  base.showSignatureBlock = false;
  base.showSpecifications = true;
  base.showExhibitB = false;

  if (mode === "PROPOSAL") {
    base.showExhibitA = true;
    return base;
  }

  base.showExhibitA = false;
  return base;
}
