import path from "node:path";

export type GoldenFixture = {
  name: string;
  file: string;
  expected: {
    minTables: number;
    expectedDocumentTotal?: number;
    mustContainTableNames?: RegExp[];
    mustHaveAlternatePrice?: number;
    mustNotContainItemName?: RegExp;
    minRespMatrixCategories?: number;
    requiredRespMatrixCategories?: string[];
    htmlMustContain?: string[];
    htmlMustNotContain?: string[];
  };
};

export const goldenFixtures: GoldenFixture[] = [
  {
    name: "NBCU",
    file: path.resolve(process.cwd(), "test-fixtures/pricing/golden/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx"),
    expected: {
      minTables: 4,
      expectedDocumentTotal: 1193303.47,
      mustContainTableNames: [/live sync/i, /9c led display/i],
      mustHaveAlternatePrice: -147085.71,
      mustNotContainItemName: /total project value|lg rebate/i,
      minRespMatrixCategories: 1,
      requiredRespMatrixCategories: ["Administrative", "Physical Installation", "Project Specific Notes"],
      htmlMustContain: ["EXHIBIT B", "STATEMENT OF WORK", "ADMINISTRATIVE"],
      htmlMustNotContain: ["TOTAL PROJECT VALUE", "LG REBATE"],
    },
  },
  {
    name: "Indiana Fever",
    file: path.resolve(process.cwd(), "test-fixtures/pricing/golden/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx"),
    expected: {
      minTables: 8,
      mustContainTableNames: [/hall of excellence/i],
      minRespMatrixCategories: 1,
      requiredRespMatrixCategories: ["Physical Installation", "Control System"],
      htmlMustContain: ["EXHIBIT B", "STATEMENT OF WORK", "PHYSICAL INSTALLATION"],
      htmlMustNotContain: ["TOTAL PROJECT VALUE", "LG REBATE"],
    },
  },
  {
    name: "USC Williams-Brice Single-Block Budget",
    file: path.resolve(process.cwd(), "test-fixtures/pricing/golden/USC - Williams-Brice Stadium - Additional LED Displays - Cost Analysis (Budget) - DJC & JSR - 2026-02-09 (1).xlsx"),
    expected: {
      minTables: 1,
      expectedDocumentTotal: 3998971.515,
      mustContainTableNames: [/led video displays/i],
      minRespMatrixCategories: 1,
      requiredRespMatrixCategories: ["Physical Installation", "Electrical & Data Installation", "Control System"],
      htmlMustContain: ["EXHIBIT B", "STATEMENT OF WORK", "PHYSICAL INSTALLATION"],
      htmlMustNotContain: ["TOTAL PROJECT VALUE", "LG REBATE"],
    },
  },
];
