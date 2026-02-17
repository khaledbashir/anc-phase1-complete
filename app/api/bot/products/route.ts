import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateBotToken } from '../auth';

export async function GET(req: NextRequest) {
  const authError = validateBotToken(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const manufacturer = searchParams.get('manufacturer') || '';
  const environment = searchParams.get('environment') || '';
  const pitchMax = parseFloat(searchParams.get('pitch_max') || '0');
  const pitchMin = parseFloat(searchParams.get('pitch_min') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { modelNumber: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { productFamily: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (manufacturer) {
    where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
  }

  if (environment) {
    where.environment = environment.toLowerCase();
  }

  if (pitchMin > 0) {
    where.pixelPitch = { ...(where.pixelPitch as object || {}), gte: pitchMin };
  }

  if (pitchMax > 0) {
    where.pixelPitch = { ...(where.pixelPitch as object || {}), lte: pitchMax };
  }

  const products = await prisma.manufacturerProduct.findMany({
    where,
    select: {
      id: true,
      manufacturer: true,
      productFamily: true,
      modelNumber: true,
      displayName: true,
      pixelPitch: true,
      environment: true,
      maxNits: true,
      cabinetWidthMm: true,
      cabinetHeightMm: true,
      weightKgPerCabinet: true,
      serviceType: true,
      isCurved: true,
      costPerSqFt: true,
      msrpPerSqFt: true,
    },
    orderBy: [{ manufacturer: 'asc' }, { pixelPitch: 'asc' }],
    take: limit,
  });

  const results = products.map((p) => ({
    id: p.id,
    manufacturer: p.manufacturer,
    family: p.productFamily,
    model: p.modelNumber,
    name: p.displayName,
    pitch: `${p.pixelPitch}mm`,
    environment: p.environment,
    brightness: `${p.maxNits} nits`,
    cabinet: `${p.cabinetWidthMm}x${p.cabinetHeightMm}mm`,
    weight: `${p.weightKgPerCabinet}kg`,
    service: p.serviceType,
    curved: p.isCurved,
    cost: p.costPerSqFt ? `$${Number(p.costPerSqFt)}/sqft` : 'N/A',
    msrp: p.msrpPerSqFt ? `$${Number(p.msrpPerSqFt)}/sqft` : 'N/A',
  }));

  return NextResponse.json({ count: results.length, products: results });
}
