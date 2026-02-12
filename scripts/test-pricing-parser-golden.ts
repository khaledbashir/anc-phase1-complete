import assert from "node:assert/strict";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { parsePricingTablesWithValidation } from "@/services/pricing/pricingTableParser";
import { goldenFixtures } from "./golden-pricing-fixtures";

for (const fixture of goldenFixtures) {
  assert.ok(fs.existsSync(fixture.file), `Missing golden fixture: ${fixture.file}`);
  const wb = XLSX.readFile(fixture.file);
  const { document, validation } = parsePricingTablesWithValidation(wb, fixture.name, { strict: true });
  assert.equal(validation.status, "PASS", `${fixture.name}: validation failed: ${validation.errors.join("; ")}`);
  assert.ok(document, `${fixture.name}: parser returned null`);
  const parsed = document!;

  assert.ok(parsed.tables.length >= fixture.expected.minTables, `${fixture.name}: expected >= ${fixture.expected.minTables} tables, got ${parsed.tables.length}`);

  if (typeof fixture.expected.expectedDocumentTotal === "number") {
    assert.ok(Math.abs(parsed.documentTotal - fixture.expected.expectedDocumentTotal) < 0.01, `${fixture.name}: document total mismatch`);
  }

  if (fixture.expected.mustContainTableNames?.length) {
    for (const re of fixture.expected.mustContainTableNames) {
      assert.ok(parsed.tables.some((t) => re.test(t.name)), `${fixture.name}: missing table matching ${re}`);
    }
  }

  if (typeof fixture.expected.mustHaveAlternatePrice === "number") {
    const found = parsed.tables.some((t) => (t.alternates || []).some((a) => Math.abs(a.priceDifference - fixture.expected.mustHaveAlternatePrice!) < 0.01));
    assert.ok(found, `${fixture.name}: missing alternate price ${fixture.expected.mustHaveAlternatePrice}`);
  }

  if (fixture.expected.mustNotContainItemName) {
    for (const t of parsed.tables) {
      const bad = t.items.find((i) => fixture.expected.mustNotContainItemName!.test(i.description || ""));
      assert.ok(!bad, `${fixture.name}: forbidden item ${bad?.description} in ${t.name}`);
    }
  }

  if (typeof fixture.expected.minRespMatrixCategories === "number") {
    const count = parsed.respMatrix?.categories?.length || 0;
    assert.ok(count >= fixture.expected.minRespMatrixCategories, `${fixture.name}: expected >= ${fixture.expected.minRespMatrixCategories} resp matrix categories, got ${count}`);
  }

  if (fixture.expected.requiredRespMatrixCategories?.length) {
    const categories = new Set((parsed.respMatrix?.categories || []).map((c) => c.name.toLowerCase()));
    for (const required of fixture.expected.requiredRespMatrixCategories) {
      assert.ok(categories.has(required.toLowerCase()), `${fixture.name}: missing resp matrix category ${required}`);
    }
  }

  console.log(`PASS: ${fixture.name}`);
}

console.log("PASS: golden parser suite");
