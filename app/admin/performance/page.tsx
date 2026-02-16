import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Unauthorized from "@/app/components/reusables/Unauthorized";
import PerformanceDashboard from "./PerformanceDashboard";
import type { UserRole } from "@/lib/rbac";

export default async function PerformancePage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role as UserRole | undefined;

  const allowedRoles: UserRole[] = ["ADMIN", "ESTIMATOR", "PROPOSAL_LEAD"];
  const hasAccess = userRole && allowedRoles.includes(userRole);

  if (!hasAccess) {
    return <Unauthorized allowedRoles={allowedRoles} featureName="Proof of Performance" />;
  }

  const [venues, sponsors, reports] = await Promise.all([
    prisma.venue.findMany({
      orderBy: { name: "asc" },
      include: {
        screens: { where: { isActive: true }, orderBy: { name: "asc" } },
        _count: { select: { reports: true } },
      },
    }),
    prisma.sponsor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { playLogs: true, reports: true } } },
    }),
    prisma.performanceReport.findMany({
      orderBy: { generatedAt: "desc" },
      take: 20,
      include: {
        venue: { select: { id: true, name: true, client: true } },
        sponsor: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Total play logs count
  const totalPlayLogs = await prisma.playLog.count();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <PerformanceDashboard
          initialVenues={JSON.parse(JSON.stringify(venues))}
          initialSponsors={JSON.parse(JSON.stringify(sponsors))}
          initialReports={JSON.parse(JSON.stringify(reports))}
          totalPlayLogs={totalPlayLogs}
        />
      </div>
    </div>
  );
}
