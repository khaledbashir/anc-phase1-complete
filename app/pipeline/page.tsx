import { prisma } from "@/lib/prisma";
import PipelineKanban from "./PipelineKanban";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const proposals = await prisma.proposal.findMany({
    where: {
      status: { notIn: ["ARCHIVED", "CANCELLED"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientName: true,
      venue: true,
      clientCity: true,
      documentMode: true,
      status: true,
      calculationMode: true,
      mirrorMode: true,
      createdAt: true,
      updatedAt: true,
      screens: {
        select: { id: true, name: true, customDisplayName: true, externalName: true, pixelPitch: true, width: true, height: true },
      },
      pricingDocument: true,
    },
  });

  const cards = proposals.map((p) => {
    // Compute total from pricingDocument tables if available
    let totalAmount = 0;
    const pd = p.pricingDocument as any;
    if (pd?.tables) {
      for (const table of pd.tables) {
        for (const item of table.items || []) {
          const price = parseFloat(item.sellingPrice || item.price || 0);
          if (!isNaN(price)) totalAmount += price;
        }
      }
    }

    return {
      id: p.id,
      clientName: p.clientName,
      venue: p.venue,
      city: p.clientCity,
      documentMode: p.documentMode,
      status: p.status,
      calculationMode: p.calculationMode,
      screenCount: p.screens.length,
      totalAmount,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  return <PipelineKanban initialCards={cards} />;
}
