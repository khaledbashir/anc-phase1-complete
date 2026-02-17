import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateBotToken } from '../auth';

export async function GET(req: NextRequest) {
  const authError = validateBotToken(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  const proposals = await prisma.proposal.findMany({
    where,
    select: {
      id: true,
      clientName: true,
      venue: true,
      status: true,
      calculationMode: true,
      pricingMode: true,
      createdAt: true,
      updatedAt: true,
      screens: {
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  const results = proposals.map((p) => ({
    id: p.id,
    client: p.clientName,
    venue: p.venue || 'N/A',
    status: p.status,
    mode: p.pricingMode || p.calculationMode,
    screens: p.screens.length,
    created: p.createdAt.toISOString().split('T')[0],
    updated: p.updatedAt.toISOString().split('T')[0],
  }));

  return NextResponse.json({ count: results.length, proposals: results });
}
