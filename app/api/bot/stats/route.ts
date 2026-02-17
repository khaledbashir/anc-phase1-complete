import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateBotToken } from '../auth';

export async function GET(req: NextRequest) {
  const authError = validateBotToken(req);
  if (authError) return authError;

  const [
    totalProposals,
    draftCount,
    sentCount,
    signedCount,
    closedCount,
    totalProducts,
    totalScreens,
    recentProposals,
    manufacturers,
  ] = await Promise.all([
    prisma.proposal.count(),
    prisma.proposal.count({ where: { status: 'DRAFT' } }),
    prisma.proposal.count({ where: { status: 'SENT' } }),
    prisma.proposal.count({ where: { status: 'SIGNED' } }),
    prisma.proposal.count({ where: { status: 'CLOSED' } }),
    prisma.manufacturerProduct.count({ where: { isActive: true } }),
    prisma.screenConfig.count(),
    prisma.proposal.findMany({
      select: { id: true, clientName: true, venue: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.manufacturerProduct.groupBy({
      by: ['manufacturer'],
      where: { isActive: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    pipeline: {
      total: totalProposals,
      draft: draftCount,
      sent: sentCount,
      signed: signedCount,
      closed: closedCount,
    },
    catalog: {
      products: totalProducts,
      screens: totalScreens,
      manufacturers: manufacturers.map((m) => ({
        name: m.manufacturer,
        products: m._count,
      })),
    },
    recentActivity: recentProposals.map((p) => ({
      id: p.id,
      client: p.clientName,
      venue: p.venue || 'N/A',
      status: p.status,
      updated: p.updatedAt.toISOString().split('T')[0],
    })),
  });
}
