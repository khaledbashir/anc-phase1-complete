/**
 * Column Detection — finds Cost/Selling Price/Margin columns from header rows
 */

export interface ColumnMap {
  label: number;
  cost: number;
  sell: number;
  margin: number;
  marginPct: number;
}

/**
 * Find column headers dynamically
 */
export function findColumnHeaders(data: any[][]): ColumnMap | null {
  const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

  // Search first 40 rows for header row
  for (let i = 0; i < Math.min(data.length, 40); i++) {
    const row = data[i] || [];
    const cells = row.map(norm);

    // Find cost column
    const costIdx = cells.findIndex((c) =>
      c === "cost" ||
      c === "budgeted cost" ||
      c === "total cost" ||
      c === "project cost"
    );

    // Find sell column
    const sellIdx = cells.findIndex((c) =>
      c === "selling price" ||
      c === "sell price" ||
      c === "sale price" ||
      c === "sales price" ||
      c === "revenue" ||
      c === "sell" ||
      c === "price" ||
      c === "total price" ||
      c === "amount"
    );

    if (costIdx !== -1 && sellIdx !== -1) {
      // Label is typically to the left of cost, or column 0
      const labelIdx = costIdx > 0 ? costIdx - 1 : 0;

      // Margin columns (optional)
      const marginIdx = cells.findIndex((c) =>
        c === "margin $" || c === "margin amount" || c === "margin"
      );
      const marginPctIdx = cells.findIndex((c) =>
        c === "margin %" || c === "margin percent" || c === "%"
      );

      return {
        label: labelIdx,
        cost: costIdx,
        sell: sellIdx,
        margin: marginIdx !== -1 ? marginIdx : sellIdx + 1,
        marginPct: marginPctIdx !== -1 ? marginPctIdx : sellIdx + 2,
      };
    }
  }

  return null;
}
