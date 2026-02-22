/**
 * RFP Pipeline — Steps 4-6
 *
 * Step 4: generateSubcontractorExcel — specs → quote request Excel
 * Step 5: importQuoteExcel / applyManualQuotes — import subcontractor response
 * Step 6: generateRateCardExcel — specs + quotes + rates → final pricing Excel
 */

export { generateSubcontractorExcel, type SubcontractorExcelOptions } from "./generateSubcontractorExcel";
export { importQuoteExcel, applyManualQuotes, type QuotedSpec, type QuoteImportResult, type ManualQuoteEntry } from "./quoteImporter";
export { generateRateCardExcel, type RateCardExcelOptions, type PricedDisplay } from "./generateRateCardExcel";
