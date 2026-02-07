/**
 * Seed script: Pricing Logic Database — I2 Example
 * Run: npx prisma db execute --stdin < ./prisma/seed-pricing-logic.ts OR ts-node prisma/seed-pricing-logic.ts
 *
 * Seeds a simple LED decision tree as an example:
 * LED → Indoor/Outdoor → Pixel Pitch → Manufacturer → Formula
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Pricing Logic Database...");

  // 1. Create Category: LED
  const ledCategory = await prisma.category.upsert({
    where: { name: "LED" },
    update: {},
    create: {
      name: "LED",
      description: "LED display systems",
    },
  });
  console.log(`✓ Category: ${ledCategory.name}`);

  // 2. Create Decision Nodes
  const rootIndoorOutdoor = await prisma.decisionNode.create({
    data: {
      categoryId: ledCategory.id,
      question: "Indoor or Outdoor?",
      order: 1,
    },
  });

  const pixelPitch = await prisma.decisionNode.create({
    data: {
      categoryId: ledCategory.id,
      parentNodeId: rootIndoorOutdoor.id,
      question: "What pixel pitch?",
      order: 2,
    },
  });

  const manufacturer = await prisma.decisionNode.create({
    data: {
      categoryId: ledCategory.id,
      parentNodeId: pixelPitch.id,
      question: "Which manufacturer?",
      order: 3,
    },
  });
  console.log(`✓ Created 3 decision nodes`);

  // 3. Create Decision Options (answers)
  const options = await Promise.all([
    // Root: Indoor/Outdoor
    prisma.decisionOption.create({
      data: {
        nodeId: rootIndoorOutdoor.id,
        optionText: "Indoor",
        nextNodeId: pixelPitch.id,
        isFinal: false,
      },
    }),
    prisma.decisionOption.create({
      data: {
        nodeId: rootIndoorOutdoor.id,
        optionText: "Outdoor",
        nextNodeId: pixelPitch.id,
        isFinal: false,
      },
    }),
    // Pixel Pitch options
    prisma.decisionOption.create({
      data: {
        nodeId: pixelPitch.id,
        optionText: "1.5mm",
        nextNodeId: manufacturer.id,
        isFinal: false,
      },
    }),
    prisma.decisionOption.create({
      data: {
        nodeId: pixelPitch.id,
        optionText: "3.9mm",
        nextNodeId: manufacturer.id,
        isFinal: false,
      },
    }),
    // Manufacturer (final nodes)
    prisma.decisionOption.create({
      data: {
        nodeId: manufacturer.id,
        optionText: "LG",
        isFinal: true,
        formula: {
          create: {
            formula: "base_cost * square_footage + 50",
            unit: "USD",
            notes: "LG 1.5mm indoor pricing with $50 overhead",
          },
        },
      },
    }),
    prisma.decisionOption.create({
      data: {
        nodeId: manufacturer.id,
        optionText: "Yaham",
        isFinal: true,
        formula: {
          create: {
            formula: "base_cost * square_footage + 30",
            unit: "USD",
            notes: "Yaham 1.5mm indoor pricing with $30 overhead",
          },
        },
      },
    }),
  ]);
  console.log(`✓ Created ${options.length} decision options`);

  // 4. Create Formula Variables
  const variables = await Promise.all([
    prisma.formulaVariable.upsert({
      where: { variableName: "base_cost" },
      update: {},
      create: {
        variableName: "base_cost",
        defaultValue: 200,
        source: "Product catalog",
        notes: "Cost per sq ft for LED screens",
      },
    }),
    prisma.formulaVariable.upsert({
      where: { variableName: "square_footage" },
      update: {},
      create: {
        variableName: "square_footage",
        source: "User input",
        notes: "Display size in square feet",
      },
    }),
    prisma.formulaVariable.upsert({
      where: { variableName: "labor_hours" },
      update: {},
      create: {
        variableName: "labor_hours",
        defaultValue: 8,
        source: "Estimator input",
        notes: "Hours to install",
      },
    }),
    prisma.formulaVariable.upsert({
      where: { variableName: "hourly_rate" },
      update: {},
      create: {
        variableName: "hourly_rate",
        defaultValue: 75,
        source: "Company policy",
        notes: "Installer hourly rate",
      },
    }),
  ]);
  console.log(`✓ Created ${variables.length} formula variables`);

  console.log("\n✅ Pricing Logic Database seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - 1 Category: ${ledCategory.name}`);
  console.log(`   - 3 Decision Nodes`);
  console.log(`   - 6 Decision Options (2 with formulas)`);
  console.log(`   - 4 Formula Variables: ${variables.map((v) => v.variableName).join(", ")}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());