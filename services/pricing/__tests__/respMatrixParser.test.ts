import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseRespMatrixDetailed } from "@/services/pricing/respMatrixParser";

function buildWorkbook(rows: any[][]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Resp Matrix");
  return wb;
}

describe("Resp Matrix Parser", () => {
  it("uses example-named sheets when they are the only resp matrix sheets (Union Station case)", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Project", "Demo"],
      ["Date", "02/18/2026"],
      ["PHYSICAL INSTALLATION", "ANC", "PURCHASER"],
      ["Control System", "X", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Resp Matrix - ROM Example");

    const result = parseRespMatrixDetailed(wb);
    expect(result.sheetCandidates).toEqual(["Resp Matrix - ROM Example"]);
    expect(result.usedSheet).toBe("Resp Matrix - ROM Example");
    expect(result.matrix).not.toBeNull();
  });

  it("ignores example-named sheets when a real resp matrix sheet also exists", () => {
    const wb = XLSX.utils.book_new();
    const wsExample = XLSX.utils.aoa_to_sheet([["Example data"]]);
    const wsReal = XLSX.utils.aoa_to_sheet([
      ["Project", "Demo"],
      ["Date", "02/18/2026"],
      ["PHYSICAL INSTALLATION", "ANC", "PURCHASER"],
      ["Control System", "X", ""],
      ["Warranty", "X", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, wsExample, "Resp Matrix - ROM Example");
    XLSX.utils.book_append_sheet(wb, wsReal, "Resp Matrix");

    const result = parseRespMatrixDetailed(wb);
    expect(result.usedSheet).toBe("Resp Matrix");
    expect(result.matrix).not.toBeNull();
  });

  it("returns null when candidate sheet has no valid category headers", () => {
    const wb = buildWorkbook([
      ["Project", "Demo"],
      ["Date", "02/18/2026"],
      ["", "Control System", "X", "X"],
      ["", "Warranty", "X", ""],
    ]);

    const result = parseRespMatrixDetailed(wb);
    expect(result.matrix).toBeNull();
    expect(result.errors.some((e) => /no valid category headers/i.test(e))).toBe(true);
  });

  it("parses a structured matrix with category header + items", () => {
    const wb = buildWorkbook([
      ["Project", "Demo"],
      ["Date", "02/18/2026"],
      ["PHYSICAL INSTALLATION", "ANC", "PURCHASER"],
      ["Control System", "X", ""],
      ["Warranty", "X", ""],
    ]);

    const result = parseRespMatrixDetailed(wb);
    expect(result.matrix).not.toBeNull();
    expect(result.matrix!.categories.length).toBe(1);
    expect(result.matrix!.categories[0].name).toBe("PHYSICAL INSTALLATION");
    expect(result.matrix!.categories[0].items.length).toBe(2);
  });
});
