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

/**
 * Apply document mode defaults - HYBRID TEMPLATE APPROACH
 * 
 * In the Hybrid Template, Notes, Scope of Work, and Signatures are
 * OPTIONAL for ALL document types (Budget, Proposal, LOI).
 * 
 * We only set defaults if the values are undefined - we don't force
 * them based on document type anymore. Users can toggle any section
 * regardless of document mode.
 */
export function applyDocumentModeDefaults(mode: DocumentMode, current: any) {
  const base = { ...(current || {}) };
  base.documentMode = mode;

  // Only set defaults if undefined - respect user's explicit choices
  // This allows universal toggles for all document types
  
  if (mode === "LOI") {
    // LOI defaults - but user can override
    if (base.showPaymentTerms === undefined) base.showPaymentTerms = true;
    if (base.showSignatureBlock === undefined) base.showSignatureBlock = true;
    if (base.showExhibitA === undefined) base.showExhibitA = true;
    if (base.showExhibitB === undefined) base.showExhibitB = true;
    if (base.showSpecifications === undefined) base.showSpecifications = false;
    if (base.showNotes === undefined) base.showNotes = true;
    if (base.showScopeOfWork === undefined) base.showScopeOfWork = false;
    return base;
  }

  // Budget and Proposal defaults - but user can override
  if (base.showPaymentTerms === undefined) base.showPaymentTerms = false;
  if (base.showSignatureBlock === undefined) base.showSignatureBlock = false;
  if (base.showSpecifications === undefined) base.showSpecifications = true;
  if (base.showExhibitB === undefined) base.showExhibitB = false;
  if (base.showNotes === undefined) base.showNotes = true;
  if (base.showScopeOfWork === undefined) base.showScopeOfWork = false;

  if (mode === "PROPOSAL") {
    if (base.showExhibitA === undefined) base.showExhibitA = true;
    return base;
  }

  // BUDGET defaults
  if (base.showExhibitA === undefined) base.showExhibitA = false;
  return base;
}
