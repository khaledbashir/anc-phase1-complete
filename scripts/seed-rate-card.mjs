#!/usr/bin/env node
/**
 * Seed rate card with validated defaults from Excel extraction.
 * Upserts on key — safe to run multiple times.
 *
 * Usage: node scripts/seed-rate-card.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_DATA = [
  // --- MARGINS ---
  { category: "margin", key: "margin.led_hardware", label: "LED Hardware Margin", value: 0.30, unit: "pct", provenance: "NBCU LED Cost Sheet: column V=0.3, ALL 9 displays", confidence: "validated" },
  { category: "margin", key: "margin.services_default", label: "Services Margin (Standard)", value: 0.20, unit: "pct", provenance: "Indiana Fever (6 sheets), USC (1 sheet), NBCU 9C Install", confidence: "validated" },
  { category: "margin", key: "margin.services_small", label: "Services Margin (Small <100sqft)", value: 0.30, unit: "pct", provenance: "NBCU Ribbon/History/Lounge Install sheets", confidence: "validated" },
  { category: "margin", key: "margin.livesync", label: "LiveSync / CMS Margin", value: 0.35, unit: "pct", provenance: "NBCU Margin Analysis rows 44-48", confidence: "validated" },

  // --- BOND & TAX ---
  { category: "bond_tax", key: "bond_tax.bond_rate", label: "Bond Rate", value: 0.015, unit: "pct", provenance: "=W*0.015 — 21 formula hits across ALL 3 costed files", confidence: "validated" },
  { category: "bond_tax", key: "bond_tax.nyc_tax", label: "NYC Sales Tax", value: 0.08875, unit: "pct", provenance: "NBCU Margin Analysis", confidence: "validated" },
  { category: "bond_tax", key: "bond_tax.default_sales_tax", label: "Default Sales Tax", value: 0.095, unit: "pct", provenance: "estimator.ts legacy default", confidence: "estimated" },

  // --- INSTALL: STEEL FABRICATION (per lb) ---
  { category: "install", key: "install.steel_fab.simple", label: "Steel Fabrication — Simple", value: 25, unit: "per_lb", provenance: "USC Install(Base): =D19*25", confidence: "validated" },
  { category: "install", key: "install.steel_fab.standard", label: "Steel Fabrication — Standard", value: 35, unit: "per_lb", provenance: "Indiana Fever Locker/Gym: =D19*35", confidence: "validated" },
  { category: "install", key: "install.steel_fab.complex", label: "Steel Fabrication — Complex", value: 55, unit: "per_lb", provenance: "Indiana Fever HOE: =D19*55", confidence: "validated" },
  { category: "install", key: "install.steel_fab.heavy", label: "Steel Fabrication — Heavy", value: 75, unit: "per_lb", provenance: "Indiana Fever Round: =D19*75", confidence: "validated" },

  // --- INSTALL: LED PANEL (per sqft) ---
  { category: "install", key: "install.led_panel.simple", label: "LED Panel Install — Simple", value: 75, unit: "per_sqft", provenance: "USC Install(Base): =D19*75", confidence: "validated" },
  { category: "install", key: "install.led_panel.standard", label: "LED Panel Install — Standard", value: 105, unit: "per_sqft", provenance: "Indiana Fever Locker/TS: =C19*105, =D19*105", confidence: "validated" },
  { category: "install", key: "install.led_panel.complex", label: "LED Panel Install — Complex", value: 145, unit: "per_sqft", provenance: "Indiana Fever Round: =D19*145", confidence: "validated" },

  // --- INSTALL: OTHER ---
  { category: "install", key: "install.heavy_equipment", label: "Heavy Equipment", value: 30, unit: "per_lb", provenance: "USC Install(Base): =D19*30", confidence: "validated" },
  { category: "install", key: "install.pm_gc_travel", label: "PM / GC / Travel", value: 5, unit: "per_lb", provenance: "USC Install(Base): =D19*5", confidence: "validated" },

  // --- ELECTRICAL ---
  { category: "electrical", key: "electrical.materials_per_sqft", label: "Electrical Materials (Budget)", value: 125, unit: "per_sqft", provenance: "USC Install(Base): =D19*125. Budget-stage only.", confidence: "validated" },

  // --- SPARE PARTS ---
  { category: "spare_parts", key: "spare_parts.lcd_pct", label: "Spare Parts % (LCD)", value: 0.05, unit: "pct", provenance: "Indiana Fever: =D*0.05 on LCD displays", confidence: "validated" },
  { category: "spare_parts", key: "spare_parts.led_pct", label: "Spare Parts % (LED)", value: 0.05, unit: "pct", provenance: "Default. No LED-specific rate found in formulas.", confidence: "estimated" },

  // --- LED COST PER SQFT ---
  { category: "led_cost", key: "led_cost.1_2mm", label: "LED Cost/sqft — 1.2mm", value: 430, unit: "per_sqft", provenance: "Indiana Fever: =M*430 (Locker Room Ribbon)", confidence: "validated" },
  { category: "led_cost", key: "led_cost.2_5mm", label: "LED Cost/sqft — 2.5mm", value: 335, unit: "per_sqft", provenance: "NBCU LED Cost Sheet: $105,120 / 314 sqft (calculated)", confidence: "extracted" },

  // --- WARRANTY ---
  { category: "warranty", key: "warranty.annual_escalation", label: "Annual Warranty Escalation", value: 0.10, unit: "pct_annual", provenance: "Indiana Fever: =C*1.1 chain (years 4-10)", confidence: "validated" },

  // --- OTHER ---
  { category: "other", key: "other.pm_base_fee", label: "PM Base Fee (zone-multiplied)", value: 5882.35, unit: "fixed", provenance: "estlogic.md + productCatalog.ts", confidence: "extracted" },
  { category: "other", key: "other.eng_base_fee", label: "Engineering Base Fee (zone-multiplied)", value: 4705.88, unit: "fixed", provenance: "estlogic.md + productCatalog.ts", confidence: "extracted" },
  { category: "other", key: "other.complex_modifier", label: "Complex Zone Modifier", value: 1.2, unit: "multiplier", provenance: "productCatalog.ts", confidence: "extracted" },
];

async function main() {
  console.log(`Seeding ${SEED_DATA.length} rate card entries...`);

  let created = 0;
  let updated = 0;

  for (const entry of SEED_DATA) {
    const existing = await prisma.rateCardEntry.findUnique({ where: { key: entry.key } });
    if (existing) {
      await prisma.rateCardEntry.update({
        where: { key: entry.key },
        data: { ...entry },
      });
      updated++;
    } else {
      await prisma.rateCardEntry.create({ data: entry });
      created++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
