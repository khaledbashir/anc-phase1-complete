# Key Services Reference

## Pricing & Proposals
| Service | Path | Purpose |
|---------|------|---------|
| pricingTableParser.ts | services/pricing/ | Mirror Mode parser — exact Excel fidelity, NO MATH |
| excelImportService.ts | services/pricing/ | Intelligence Mode import — recalculates everything |
| intelligenceMathEngine.ts | services/pricing/ | Margin/pricing calculations for Intelligence Mode |
| generateProposalPdfService.ts | services/ | PDF generation via Browserless headless Chrome |
| currencyService.ts | services/pricing/ | USD/CAD/EUR/GBP formatting |

## AI & Chat
| Service | Path | Purpose |
|---------|------|---------|
| kimiService.ts | services/chat/ | AI chat via Kimi K2.5 (Puter.js) + AnythingLLM fallback |
| intentParser.ts | services/chat/ | Copilot NLP — parses user intent from natural language |
| actionExecutor.ts | services/chat/ | Copilot actions — executes parsed intents on form fields |

## RFP Pipeline
| Service | Path | Purpose |
|---------|------|---------|
| rfpExtractor.ts | services/rfp/ | RFP PDF text extraction (Mistral OCR + pdftotext) |
| productCatalog.ts | services/rfp/ | LED product catalog, rates, margins, pricing formulas |
| productMatcher.ts | services/catalog/ | Product matching engine — matches specs to catalog |
| rateCardLoader.ts | services/rfp/ | Rate card data loader |
| generateRateCardExcel.ts | services/rfp/pipeline/ | 3-sheet rate card Excel (pricing summary, cost breakdown, rates) |
| generateSubcontractorExcel.ts | services/rfp/pipeline/ | Subcontractor quote request Excel |
| generateScopingWorkbook.ts | services/rfp/pipeline/ | Full 10+ sheet scoping workbook (Toyota Center format) |
| quoteImporter.ts | services/rfp/pipeline/ | Import subcontractor quote Excel responses |

## Product Catalog Constants (productCatalog.ts)
- `MARGIN_PRESETS.ledHardware` = 30% (LED hardware margin)
- `MARGIN_PRESETS.servicesDefault` = 20% (services margin, >100 sqft)
- `MARGIN_PRESETS.servicesSmall` = 30% (services margin, <100 sqft)
- `BOND_RATE` = 1.5%
- `LED_COST_PER_SQFT_BY_PITCH` — cost lookup by pixel pitch
- `STEEL_FABRICATION_PER_LB` — install rates by complexity
- Products: Yaham (Corona indoor, Radiance outdoor, Halo fascia, Aura perimeter) + LG + Nitxeon

## Contexts (React)
| Context | Path | Purpose |
|---------|------|---------|
| ProposalContext | contexts/ | Main proposal state (119KB, largest context) |
| ChargesContext | contexts/ | Line items, pricing, charges |
| SignatureContext | contexts/ | E-signature state |

## Auto-save
- `useDebouncedSave` hook with 2000ms debounce
- Saves proposal state to DB automatically
