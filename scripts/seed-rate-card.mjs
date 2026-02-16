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

  // --- LED COST PER SQFT (Legacy + Yaham NX LGEUS 28% Landed) ---
  { category: "led_cost", key: "led_cost.1_2mm", label: "LED Cost/sqft — 1.2mm", value: 430, unit: "per_sqft", provenance: "Indiana Fever: =M*430 (Locker Room Ribbon)", confidence: "validated" },
  { category: "led_cost", key: "led_cost.2_5mm", label: "LED Cost/sqft — 2.5mm Indoor", value: 251.57, unit: "per_sqft", provenance: "Yaham C2.5-MIP LGEUS 28% landed. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.4mm", label: "LED Cost/sqft — 4mm Indoor", value: 178.09, unit: "per_sqft", provenance: "Yaham C4 Indoor LGEUS 28% landed. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.6mm", label: "LED Cost/sqft — 6mm Indoor", value: 136.51, unit: "per_sqft", provenance: "Yaham C6 Indoor LGEUS 28% landed. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.10mm", label: "LED Cost/sqft — 10mm Indoor", value: 112.22, unit: "per_sqft", provenance: "Yaham C10 Indoor LGEUS 28% landed. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.10mm_fascia_indoor", label: "LED Cost/sqft — 10mm Fascia Indoor", value: 116.25, unit: "per_sqft", provenance: "Yaham H10T Fascia LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.2_5mm_outdoor", label: "LED Cost/sqft — 2.5mm Outdoor", value: 536.25, unit: "per_sqft", provenance: "Yaham R2.5-MIP Outdoor LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.4mm_outdoor", label: "LED Cost/sqft — 4mm Outdoor", value: 232.53, unit: "per_sqft", provenance: "Yaham R4 Outdoor LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.6mm_outdoor", label: "LED Cost/sqft — 6mm Outdoor", value: 260.14, unit: "per_sqft", provenance: "Yaham R6 Outdoor LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.8mm_outdoor", label: "LED Cost/sqft — 8mm Outdoor", value: 194.07, unit: "per_sqft", provenance: "Yaham R8 Outdoor LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.10mm_outdoor", label: "LED Cost/sqft — 10mm Outdoor", value: 154.79, unit: "per_sqft", provenance: "Yaham R10 Outdoor LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.10mm_perimeter", label: "LED Cost/sqft — 10mm Perimeter", value: 206.59, unit: "per_sqft", provenance: "Yaham A10 Perimeter LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.10mm_fascia_outdoor", label: "LED Cost/sqft — 10mm Fascia Outdoor", value: 176.45, unit: "per_sqft", provenance: "Yaham HO10T Outdoor Fascia LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },
  { category: "led_cost", key: "led_cost.6mm_fascia_outdoor", label: "LED Cost/sqft — 6mm Fascia Outdoor", value: 293.20, unit: "per_sqft", provenance: "Yaham HO6T Outdoor Fascia LGEUS 28%. Rate card 02/04/2026.", confidence: "validated" },

  // --- PRICING WATERFALL (Yaham NX supply chain) ---
  { category: "led_cost", key: "led_cost.tariff_pct", label: "Import Tariff Rate", value: 0.10, unit: "pct", provenance: "Yaham NX Rate Card pricing waterfall layer 2", confidence: "validated" },
  { category: "led_cost", key: "led_cost.shipping_pct", label: "Ocean Freight Shipping Rate", value: 0.05, unit: "pct", provenance: "Yaham NX Rate Card pricing waterfall layer 3", confidence: "validated" },
  { category: "led_cost", key: "led_cost.lgeus_markup_pct", label: "LGEUS Distribution Markup", value: 0.28, unit: "pct", provenance: "Yaham NX Rate Card pricing waterfall layer 4 — ANC buy price", confidence: "validated" },
  { category: "led_cost", key: "led_cost.custom_cabinet_pct", label: "Custom Cabinet Premium", value: 0.10, unit: "pct", provenance: "Yaham NX Rate Card pricing waterfall layer 5 (optional)", confidence: "validated" },

  // --- WARRANTY ---
  { category: "warranty", key: "warranty.annual_escalation", label: "Annual Warranty Escalation", value: 0.10, unit: "pct_annual", provenance: "Indiana Fever: =C*1.1 chain (years 4-10)", confidence: "validated" },

  // --- OTHER ---
  { category: "other", key: "other.pm_base_fee", label: "PM Base Fee (zone-multiplied)", value: 5882.35, unit: "fixed", provenance: "estlogic.md + productCatalog.ts", confidence: "extracted" },
  { category: "other", key: "other.eng_base_fee", label: "Engineering Base Fee (zone-multiplied)", value: 4705.88, unit: "fixed", provenance: "estlogic.md + productCatalog.ts", confidence: "extracted" },
  { category: "other", key: "other.complex_modifier", label: "Complex Zone Modifier", value: 1.2, unit: "multiplier", provenance: "productCatalog.ts", confidence: "extracted" },
  { category: "other", key: "other.alt1_upgrade_ratio", label: "Alt-1 Upgrade Ratio", value: 0.07, unit: "pct", provenance: "productCatalog.ts", confidence: "extracted" },
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
