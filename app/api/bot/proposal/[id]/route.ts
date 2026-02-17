import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateBotToken } from '../../auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateBotToken(req);
  if (authError) return authError;

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      id: true,
      clientName: true,
      clientAddress: true,
      clientCity: true,
      venue: true,
      status: true,
      calculationMode: true,
      pricingMode: true,
      mirrorMode: true,
      paymentTerms: true,
      verificationStatus: true,
      isLocked: true,
      versionNumber: true,
      source: true,
      createdAt: true,
      updatedAt: true,
      estimatorAnswers: true,
      screens: {
        select: {
          id: true,
          screenLabel: true,
          width: true,
          height: true,
          pixelPitch: true,
          manufacturer: true,
          modelNumber: true,
          environment: true,
          totalScreenCost: true,
          sellingPrice: true,
        },
      },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Extract financial summary from estimatorAnswers if available
  const ea = proposal.estimatorAnswers as Record<string, unknown> | null;
  const financial = ea ? {
    totalProjectCost: ea.totalProjectCost || null,
    targetMargin: ea.targetMargin || null,
    totalSellingPrice: ea.totalSellingPrice || null,
    currency: ea.currency || 'USD',
  } : null;

  return NextResponse.json({
    id: proposal.id,
    client: proposal.clientName,
    address: [proposal.clientAddress, proposal.clientCity].filter(Boolean).join(', ') || 'N/A',
    venue: proposal.venue || 'N/A',
    status: proposal.status,
    mode: proposal.pricingMode || proposal.calculationMode,
    mirrorMode: proposal.mirrorMode || false,
    version: proposal.versionNumber,
    verified: proposal.verificationStatus,
    locked: proposal.isLocked,
    source: proposal.source || 'manual',
    paymentTerms: proposal.paymentTerms || 'N/A',
    financial,
    screens: proposal.screens.map((s) => ({
      id: s.id,
      label: s.screenLabel || 'Unnamed',
      size: s.width && s.height ? `${s.width}' x ${s.height}'` : 'N/A',
      pitch: s.pixelPitch ? `${s.pixelPitch}mm` : 'N/A',
      manufacturer: s.manufacturer || 'N/A',
      model: s.modelNumber || 'N/A',
      environment: s.environment || 'N/A',
      cost: s.totalScreenCost ? Number(s.totalScreenCost) : null,
      price: s.sellingPrice ? Number(s.sellingPrice) : null,
    })),
    created: proposal.createdAt.toISOString().split('T')[0],
    updated: proposal.updatedAt.toISOString().split('T')[0],
  });
}
