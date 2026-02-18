/**
 * Column Detection — finds Cost/Selling Price/Margin columns from header rows
 *
 * Tiered approach:
 *   Tier 1 — exact synonym match (fast, high confidence)
 *   Tier 2 — contains-based fuzzy match (catches unknown naming variations)
 *
 * Designed to handle any ANC Excel template without per-file fixes.
 */

export interface ColumnMap {
  label: number;
  cost: number;
  sell: number;
  margin: number;
  marginPct: number;
}

// ---------------------------------------------------------------------------
// Tier 1: Exact synonyms (normalized to lowercase, collapsed whitespace)
// ---------------------------------------------------------------------------

const COST_EXACT = new Set([
  "cost",
  "budgeted cost",
  "total cost",
  "project cost",
  "estimated cost",
  "base cost",
  "net cost",
  "cost total",
  "extended cost",
]);

const SELL_EXACT = new Set([
  "selling price",
  "sell price",
  "sale price",
  "sales price",
  "revenue",
  "sell",
  "price",
  "total price",
  "total selling price",
  "contract price",
  "contract value",
  "extended price",
  "amount",
  "net price",
]);

const MARGIN_EXACT = new Set([
  "margin $",
  "margin amount",
  "margin",
  "gross margin",
  "profit",
  "gross profit",
]);

const MARGIN_PCT_EXACT = new Set([
  "margin %",
  "margin percent",
  "margin pct",
  "%",
  "gm%",
  "gm %",
]);

// ---------------------------------------------------------------------------
// Tier 2: Contains-based keywords (order matters — first match wins)
// ---------------------------------------------------------------------------

const COST_CONTAINS = ["cost", "expense"];
const SELL_CONTAINS = ["sell", "price", "revenue", "contract"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function findByExactSet(cells: string[], set: Set<string>): number {
  return cells.findIndex((c) => set.has(c));
}

function findByContains(cells: string[], keywords: string[], exclude: number): number {
  for (const kw of keywords) {
    const idx = cells.findIndex((c, i) => i !== exclude && c.includes(kw) && c.length < 40);
    if (idx !== -1) return idx;
  }
  return -1;
}

function findLabelColumn(cells: string[], costIdx: number): number {
  // Walk left from cost looking for a text-heavy column
  for (let j = costIdx - 1; j >= 0; j--) {
    if (cells[j] && cells[j].length > 0 && !/^\d/.test(cells[j])) return j;
  }
  return Math.max(0, costIdx - 1);
}

function findMarginColumns(cells: string[], sellIdx: number): { margin: number; marginPct: number } {
  const marginIdx = findByExactSet(cells, MARGIN_EXACT);
  const marginPctIdx = findByExactSet(cells, MARGIN_PCT_EXACT);
  return {
    margin: marginIdx !== -1 ? marginIdx : sellIdx + 1,
    marginPct: marginPctIdx !== -1 ? marginPctIdx : sellIdx + 2,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Find column headers dynamically.
 * Searches first 40 rows. Returns null only if no viable cost+sell pair found.
 */
export function findColumnHeaders(data: any[][]): ColumnMap | null {
  const limit = Math.min(data.length, 40);

  // Pass 1: Tier 1 exact match
  for (let i = 0; i < limit; i++) {
    const row = data[i] || [];
    const cells = row.map(norm);
    const costIdx = findByExactSet(cells, COST_EXACT);
    const sellIdx = findByExactSet(cells, SELL_EXACT);
    if (costIdx !== -1 && sellIdx !== -1 && costIdx !== sellIdx) {
      const { margin, marginPct } = findMarginColumns(cells, sellIdx);
      console.log(`[COL DETECT] Tier 1 match at row ${i}: cost@${costIdx}="${cells[costIdx]}", sell@${sellIdx}="${cells[sellIdx]}"`);
      return { label: findLabelColumn(cells, costIdx), cost: costIdx, sell: sellIdx, margin, marginPct };
    }
  }

  // Pass 2: Tier 2 fuzzy contains match
  for (let i = 0; i < limit; i++) {
    const row = data[i] || [];
    const cells = row.map(norm);
    const costIdx = findByContains(cells, COST_CONTAINS, -1);
    if (costIdx === -1) continue;
    const sellIdx = findByContains(cells, SELL_CONTAINS, costIdx);
    if (sellIdx === -1) continue;
    const { margin, marginPct } = findMarginColumns(cells, sellIdx);
    console.log(`[COL DETECT] Tier 2 fuzzy match at row ${i}: cost@${costIdx}="${cells[costIdx]}", sell@${sellIdx}="${cells[sellIdx]}"`);
    return { label: findLabelColumn(cells, costIdx), cost: costIdx, sell: sellIdx, margin, marginPct };
  }

  // Diagnostic: log first 10 rows so failures are debuggable
  console.warn("[COL DETECT] FAILED — no cost+sell columns found. First 10 rows:");
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = (data[i] || []).map(norm).filter((c) => c.length > 0);
    if (row.length > 0) console.warn(`  R${i}: ${row.join(" | ")}`);
  }

  return null;
}
