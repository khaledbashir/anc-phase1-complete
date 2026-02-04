/**
 * Excel Proposal Converter
 * Converts Natalia's "ugly Excel" proposals to ANC Proposal Engine format
 */

import * as XLSX from 'xlsx';
import { ScreenInput } from '@/lib/estimator';

interface ExcelScreenRow {
  description: string;
  pitchMm: number;
  quantity: number;
  heightFt: number;
  widthFt: number;
  areaSqFt: number;
  unitCost: number;
  extCost: number;
  marginPct: number;
  unitSell: number;
}

interface ConvertedProposal {
  clientName: string;
  projectName: string;
  margin: number;
  screens: ScreenInput[];
  totalCost: number;
  totalSell: number;
}

/**
 * Parse dimension string like "20' 9" W x 7' 11" H" to feet
 */
function parseDimension(dimStr: string): { widthFt: number; heightFt: number } {
  // Match patterns like "20' 9" W x 7' 11" H" or "21' 1" W x 10' H"
  const match = dimStr.match(/(\d+)'\s*(\d+)?"?\s*W?\s*x\s*(\d+)'\s*(\d+)?"?\s*H?/i);
  
  if (!match) {
    // Try simpler pattern like "44' W x 10' H"
    const simpleMatch = dimStr.match(/(\d+)'\s*W?\s*x\s*(\d+)'\s*H?/i);
    if (simpleMatch) {
      return {
        widthFt: parseInt(simpleMatch[1]),
        heightFt: parseInt(simpleMatch[2])
      };
    }
    throw new Error(`Cannot parse dimension: ${dimStr}`);
  }
  
  const widthFt = parseInt(match[1]) + (parseInt(match[2]) || 0) / 12;
  const heightFt = parseInt(match[3]) + (parseInt(match[4]) || 0) / 12;
  
  return { widthFt, heightFt };
}

/**
 * Parse pixel pitch string like "1.8mm" or ".9mm" to number
 */
function parsePitchMm(pitchStr: string): number {
  const match = pitchStr.match(/(\d+\.?\d*)/);
  if (!match) throw new Error(`Cannot parse pitch: ${pitchStr}`);
  return parseFloat(match[1]);
}

/**
 * Extract location name from description
 * e.g., "NW suites bridge: 20' 9" W x 7' 11" H..." → "NW suites bridge"
 */
function extractLocation(description: string): string {
  const parts = description.split(':');
  return parts[0].trim();
}

/**
 * Convert Excel proposal to ANC format
 */
export function convertExcelProposal(fileBuffer: Buffer): ConvertedProposal {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Read Summary sheet
  const summarySheet = workbook.Sheets['Summary'];
  if (!summarySheet) {
    throw new Error('Summary sheet not found');
  }
  
  const jsonData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][];
  
  // Extract project info
  const projectName = jsonData[2]?.[0] || 'Unknown Project';
  const margin = parseFloat(jsonData[3]?.[1]) || 0.25;
  
  // Find data rows (starting from row 8, index 7)
  const screens: ScreenInput[] = [];
  
  for (let i = 7; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Stop at subtotal/grand total rows
    if (!row[1] || String(row[1]).includes('Subtotal') || String(row[1]).includes('GRAND')) {
      break;
    }
    
    const description = String(row[1]);
    const pitchStr = String(row[2] || '');
    const quantity = parseInt(row[3]) || 1;
    const heightFt = parseFloat(row[4]) || 0;
    const widthFt = parseFloat(row[5]) || 0;
    const areaSqFt = parseFloat(row[6]) || 0;
    const unitCost = parseFloat(row[7]) || 0;
    const extCost = parseFloat(row[8]) || 0;
    const marginPct = parseFloat(row[9]) || margin;
    const unitSell = parseFloat(row[10]) || 0;
    
    // Parse pitch from string like "1.8mm"
    let pitchMm = 10; // default
    try {
      pitchMm = parsePitchMm(pitchStr);
    } catch (e) {
      console.warn(`Could not parse pitch for row ${i + 1}: ${pitchStr}`);
    }
    
    const location = extractLocation(description);
    
    screens.push({
      name: location,
      description: description,
      widthFt,
      heightFt,
      quantity,
      pitchMm,
      desiredMargin: marginPct,
      // Additional metadata
      aiSource: {
        moduleKey: `${pitchMm}mm`,
        source: 'excel_import'
      }
    } as ScreenInput);
  }
  
  // Calculate totals from last rows
  let totalCost = 0;
  let totalSell = 0;
  
  for (let i = jsonData.length - 1; i >= 0; i--) {
    const row = jsonData[i];
    if (String(row[1]).includes('GRAND TOTALS')) {
      totalCost = parseFloat(row[8]) || 0;
      totalSell = parseFloat(row[10]) || 0;
      break;
    }
  }
  
  return {
    clientName: 'LG', // From filename
    projectName,
    margin,
    screens,
    totalCost,
    totalSell
  };
}

/**
 * Generate proposal JSON for ANC Engine
 */
export function generateProposalJson(excelBuffer: Buffer): any {
  const converted = convertExcelProposal(excelBuffer);
  
  return {
    receiver: {
      name: converted.clientName,
      address: ''
    },
    details: {
      proposalName: converted.projectName,
      venue: converted.projectName,
      proposalDate: new Date().toISOString().split('T')[0],
    },
    screens: converted.screens.map(s => ({
      name: s.name,
      widthFt: s.widthFt,
      heightFt: s.heightFt,
      quantity: s.quantity,
      pitchMm: s.pitchMm,
      desiredMargin: s.desiredMargin,
      formFactor: 'Straight',
      serviceType: 'Front/Rear'
    })),
    rulesDetected: {
      margin: converted.margin,
      totalCost: converted.totalCost,
      totalSell: converted.totalSell
    }
  };
}

// CLI usage
if (require.main === module) {
  const fs = require('fs');
  const path = process.argv[2];
  
  if (!path) {
    console.error('Usage: npx tsx scripts/convert-excel-proposal.ts <path-to-excel>');
    process.exit(1);
  }
  
  const buffer = fs.readFileSync(path);
  const result = generateProposalJson(buffer);
  
  console.log(JSON.stringify(result, null, 2));
}
