/**
 * Debug script: trace how pricingTableParser handles the Indiana Fever file.
 * Run: npx tsx scripts/debug-rollup.ts
 */
import * as XLSX from "xlsx";
import * as path from "path";

const filePath = path.resolve(__dirname, "../ANC_Indiana Fever LED Displays LOI_1.26.2026.xlsx");
const workbook = XLSX.readFile(filePath);

// Find Margin Analysis sheet
const sheetName = workbook.SheetNames.find((s: string) =>
  /margin|analysis|total/i.test(s)
) || workbook.SheetNames[0];
console.log(`\n=== Sheet: "${sheetName}" ===`);

const sheet = workbook.Sheets[sheetName];
const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

// Print first 50 rows to understand the structure
console.log(`\nTotal rows: ${data.length}\n`);
console.log("=== RAW DATA (first 60 rows) ===");
for (let i = 0; i < Math.min(data.length, 60); i++) {
  const row = data[i] || [];
  const cells = row.map((c: any, idx: number) => {
    const v = c === "" || c === null || c === undefined ? "" : String(c);
    return `[${idx}]=${v.substring(0, 40)}`;
  }).filter((s: string) => !s.endsWith("="));
  if (cells.length > 0) {
    console.log(`Row ${i}: ${cells.join(" | ")}`);
  } else {
    console.log(`Row ${i}: (empty)`);
  }
}

// Now find column headers
const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

let headerRowIdx = -1;
let costIdx = -1;
let sellIdx = -1;
let labelIdx = -1;

for (let i = 0; i < Math.min(data.length, 40); i++) {
  const row = data[i] || [];
  const cells = row.map(norm);
  costIdx = cells.findIndex((c: string) => c === "cost" || c === "budgeted cost" || c === "total cost" || c === "project cost");
  sellIdx = cells.findIndex((c: string) => c === "selling price" || c === "sell price" || c === "revenue" || c === "sell" || c === "price" || c === "total price" || c === "amount");
  if (costIdx !== -1 && sellIdx !== -1) {
    headerRowIdx = i;
    labelIdx = costIdx > 0 ? costIdx - 1 : 0;
    break;
  }
}

console.log(`\n=== Column Detection ===`);
console.log(`Header row: ${headerRowIdx}`);
console.log(`Label col: ${labelIdx}, Cost col: ${costIdx}, Sell col: ${sellIdx}`);

// Now parse rows and classify them
console.log(`\n=== ROW CLASSIFICATION (after header) ===`);

function parseNumber(value: any): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return isNaN(value) ? NaN : value;
  const str = String(value).replace(/[$,\s]/g, "").replace(/[()]/g, "-").trim();
  if (!str || str === "-") return NaN;
  const result = parseFloat(str);
  return isFinite(result) ? result : NaN;
}

function looksLikeSectionHeader(labelNorm: string): boolean {
  if (!labelNorm) return false;
  return (
    labelNorm.includes("display") ||
    labelNorm.includes("video board") ||
    labelNorm.includes("ribbon") ||
    labelNorm.includes("concourse") ||
    labelNorm.includes("hall of") ||
    labelNorm.includes("section")
  );
}

const sectionHeaders: string[] = [];
const lineItems: { row: number; label: string; sell: number; classification: string }[] = [];

for (let i = headerRowIdx + 1; i < data.length; i++) {
  const row = data[i] || [];
  const label = String(row[labelIdx] ?? "").trim();
  const labelN = norm(label);
  const cost = parseNumber(row[costIdx]);
  const sell = parseNumber(row[sellIdx]);
  const isEmpty = !label && !Number.isFinite(sell);
  const hasNumericData = Number.isFinite(cost) || Number.isFinite(sell);
  const hasNonZeroNumericData = (Number.isFinite(cost) && cost !== 0) || (Number.isFinite(sell) && sell !== 0);

  const isHeader = !isEmpty && label.length > 0 && !labelN.includes("alternate") && (!hasNumericData || (!hasNonZeroNumericData && looksLikeSectionHeader(labelN)));
  const isSubtotal = labelN.includes("subtotal") || labelN.includes("sub total") || (labelN === "" && hasNumericData);
  const isTax = labelN === "tax" || labelN.startsWith("tax ");
  const isBond = labelN === "bond";
  const isGrandTotal = labelN.includes("grand total") || labelN.includes("sub total (bid form)") || labelN === "total" || labelN === "project total";

  let classification = "LINE_ITEM";
  if (isEmpty) classification = "EMPTY";
  else if (isHeader) classification = "HEADER";
  else if (isGrandTotal) classification = "GRAND_TOTAL";
  else if (isSubtotal) classification = "SUBTOTAL";
  else if (isTax) classification = "TAX";
  else if (isBond) classification = "BOND";

  if (!isEmpty) {
    const sellStr = Number.isFinite(sell) ? `$${sell.toFixed(2)}` : "NaN";
    const costStr = Number.isFinite(cost) ? `$${cost.toFixed(2)}` : "NaN";
    console.log(`Row ${i}: [${classification}] "${label}" | cost=${costStr} | sell=${sellStr} | looksLikeSection=${looksLikeSectionHeader(labelN)} | hasNumericData=${hasNumericData} | hasNonZero=${hasNonZeroNumericData}`);

    if (isHeader) sectionHeaders.push(label);
  }
}

console.log(`\n=== DETECTED SECTION HEADERS (${sectionHeaders.length}) ===`);
sectionHeaders.forEach((h, i) => console.log(`  ${i + 1}. "${h}"`));

// Show what boundary detection would produce
console.log(`\n=== GRAND TOTAL CANDIDATES ===`);
for (let i = headerRowIdx + 1; i < data.length; i++) {
  const row = data[i] || [];
  const label = String(row[labelIdx] ?? "").trim();
  const labelN = norm(label);
  const sell = parseNumber(row[sellIdx]);
  const isGrandTotal = labelN.includes("grand total") || labelN.includes("sub total (bid form)") || labelN === "total" || labelN === "project total";
  if (isGrandTotal && Number.isFinite(sell)) {
    console.log(`  Row ${i}: "${label}" = $${sell.toFixed(2)}`);
  }
}
