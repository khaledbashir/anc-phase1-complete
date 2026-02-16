import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PerformanceReportViewer from "./PerformanceReportViewer";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) notFound();

  const { id } = await params;

  const report = await prisma.performanceReport.findUnique({
    where: { id },
    include: { venue: true, sponsor: true },
  });

  if (!report) notFound();

  return <PerformanceReportViewer report={JSON.parse(JSON.stringify(report))} />;
}
