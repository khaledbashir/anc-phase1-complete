import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicPerformanceReport from "./PublicPerformanceReport";

export default async function PublicPerformancePage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;

  const report = await prisma.performanceReport.findUnique({
    where: { shareHash: hash },
    include: { venue: true, sponsor: true },
  });

  if (!report) notFound();

  return <PublicPerformanceReport report={JSON.parse(JSON.stringify(report))} />;
}
