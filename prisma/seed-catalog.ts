/**
 * I1: Seed normalized product catalog (Manufacturer → Series → Module + Processor)
 *
 * Run: npx tsx prisma/seed-catalog.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding normalized product catalog...\n");

  // ── Manufacturers ──
  const yaham = await prisma.manufacturer.upsert({
    where: { name: "Yaham" },
    update: {},
    create: {
      name: "Yaham",
      website: "https://www.yaham.com",
      contactName: "Yaham Sales",
      contactEmail: "sales@yaham.com",
    },
  });

  const lg = await prisma.manufacturer.upsert({
    where: { name: "LG" },
    update: {},
    create: {
      name: "LG",
      website: "https://www.lg.com/business/led-signage",
      contactName: "LG Business Solutions",
      contactEmail: "business@lg.com",
    },
  });

  console.log(`  Manufacturers: ${yaham.name}, ${lg.name}`);

  // ── Product Series ──
  const yahamHVO = await prisma.productSeries.upsert({
    where: { manufacturerId_name: { manufacturerId: yaham.id, name: "HVO" } },
    update: {},
    create: {
      name: "HVO",
      description: "High-performance outdoor LED display series for stadium perimeter and scoreboard applications",
      environment: "outdoor",
      manufacturerId: yaham.id,
    },
  });

  const lgLSBC = await prisma.productSeries.upsert({
    where: { manufacturerId_name: { manufacturerId: lg.id, name: "LSBC" } },
    update: {},
    create: {
      name: "LSBC",
      description: "Ultra-fine pitch indoor LED cabinet series for concourse and suite applications",
      environment: "indoor",
      manufacturerId: lg.id,
    },
  });

  console.log(`  Series: Yaham ${yahamHVO.name}, LG ${lgLSBC.name}`);

  // ── Product Modules ──
  await prisma.productModule.upsert({
    where: { modelNumber: "HVO-10" },
    update: {},
    create: {
      modelNumber: "HVO-10",
      seriesId: yahamHVO.id,
      pixelPitch: 10.0,
      moduleWidth: 960,
      moduleHeight: 960,
      weight: 38.0,
      brightness: 7500,
      powerMax: 520,
      powerAvg: 175,
      refreshRate: 3840,
    },
  });

  await prisma.productModule.upsert({
    where: { modelNumber: "LSBC-1.5" },
    update: {},
    create: {
      modelNumber: "LSBC-1.5",
      seriesId: lgLSBC.id,
      pixelPitch: 1.5,
      moduleWidth: 600,
      moduleHeight: 337.5,
      weight: 6.5,
      brightness: 600,
      powerMax: 150,
      powerAvg: 75,
      refreshRate: 3840,
    },
  });

  console.log("  Modules: HVO-10 (Yaham outdoor 10mm), LSBC-1.5 (LG indoor 1.5mm)");

  // ── Processors ──
  await prisma.processor.upsert({
    where: { id: "proc-novastar-vx1000" },
    update: {},
    create: {
      id: "proc-novastar-vx1000",
      name: "Novastar VX1000",
      maxPixels: 6500000,
      inputs: "4x HDMI 2.0, 2x DP 1.2, 1x DVI",
    },
  });

  await prisma.processor.upsert({
    where: { id: "proc-brompton-sx40" },
    update: {},
    create: {
      id: "proc-brompton-sx40",
      name: "Brompton Tessera SX40",
      maxPixels: 2300000,
      inputs: "4x HDMI 2.0, 2x DP 1.4",
    },
  });

  console.log("  Processors: Novastar VX1000, Brompton Tessera SX40");

  // ── Summary ──
  const counts = {
    manufacturers: await prisma.manufacturer.count(),
    series: await prisma.productSeries.count(),
    modules: await prisma.productModule.count(),
    processors: await prisma.processor.count(),
  };

  console.log(`\nCatalog totals: ${counts.manufacturers} manufacturers, ${counts.series} series, ${counts.modules} modules, ${counts.processors} processors`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
