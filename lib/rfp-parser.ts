/**
 * RFP Parser - Extracts technical requirements from RFP documents
 * 
 * This module parses RFP text to extract:
 * - Location names
 * - Display dimensions (width × height)
 * - Pixel pitch requirements
 * - Brightness (nits) requirements
 * - Viewing angle requirements
 * - IP rating requirements
 * - Special notes (transparent displays, serviceability, etc.)
 */

export interface RFPDisplayLocation {
  locationName: string;
  dimensions?: {
    widthFeet: number | null;
    heightFeet: number | null;
    widthPixels: number | null;
    heightPixels: number | null;
  };
  pitchRequirement?: {
    preferred: string | null; // "4 mm", "Sub 4 mm", "10 mm"
    minimum: number | null;
  };
  technicalRequirements?: {
    minimumNits: number | null;
    minimumRefreshRate: number | null;
    viewingAngleHorizontal: number | null;
    viewingAngleVertical: number | null;
    ipRating: string | null;
    colorTemperature: {
      min: number | null;
      max: number | null;
      uniformityKelvin: number | null;
      uniformityPercent: number | null;
    };
    ledLifetime: number | null; // hours to half-life
  };
  serviceRequirements?: {
    accessMethod: string | null; // "Front Serviceable", "Rear Serviceable", etc.
    minimumMaintTripsPerYear: number | null;
    responseTime?: string;
  };
  specialNotes?: string[];
  structural?: {
    useExistingInfrastructure: boolean | null;
    currentWeight: number | null; // lbs
    weightRestriction?: number;
    transparentDisplayRequired: boolean;
  };
  electrical?: {
    voltage: string | null;
    amperage: string | null;
    phase: string | null;
    useExistingInfrastructure: boolean | null;
  };
  quantity: number;
}

export interface ParsedRFP {
  clientName: string;
  projectTitle: string;
  locations: RFPDisplayLocation[];
  metadata: {
    extractedAt: string;
    confidence: number;
  };
}

/**
 * Main extraction function - parses RFP text and extracts all requirements
 */
export function extractRFPRequirements(rfpText: string): ParsedRFP {
  const locations: RFPDisplayLocation[] = [];

  // Extract client name
  const clientMatch = rfpText.match(/(Westfield|Unibail-Rodamco-Westfield|URW)/i);
  const clientName = clientMatch ? clientMatch[1] : "Unknown Client";

  // Extract project title
  const projectMatch = rfpText.match(/Large Format LED Digital Displays|LED\s+Bid\s+Package|RFP\s+for\s+LED/i);
  const projectTitle = projectMatch ? projectMatch[0] : "LED Display Project";

  // Pattern to identify location sections
  // RFP typically lists locations with patterns like:
  // "(1) Concourse", "(2) 9A Underpass 1-4", etc.
  const locationPattern = /\((\d+)\)\s+([A-Za-z0-9\s\-]+)/g;
  const locationMatches = [...rfpText.matchAll(locationPattern)];

  for (const match of locationMatches) {
    const locationNumber = match[1];
    const locationName = match[2].trim();

    // Get the text following this location (until next location or section)
    const locationStartIndex = match.index!;
    const nextLocationMatch = rfpText.slice(locationStartIndex + match[0].length).match(/\(\d+\)\s+/);
    const locationEndIndex = nextLocationMatch
      ? locationStartIndex + match[0].length + nextLocationMatch.index!
      : rfpText.length;

    const locationText = rfpText.slice(locationStartIndex, locationEndIndex);

    // Extract requirements for this location
    const location = parseLocationRequirements(locationName, locationText);
    locations.push(location);
  }

  // If no locations found via pattern matching, try alternative extraction
  if (locations.length === 0) {
    const altLocations = extractLocationsAlternative(rfpText);
    locations.push(...altLocations);
  }

  return {
    clientName,
    projectTitle,
    locations,
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: calculateConfidence(locations),
    },
  };
}

/**
 * Parse requirements for a single location
 */
function parseLocationRequirements(locationName: string, locationText: string): RFPDisplayLocation {
  const location: RFPDisplayLocation = {
    locationName,
    quantity: 1,
    technicalRequirements: {
      minimumNits: null,
      minimumRefreshRate: null,
      viewingAngleHorizontal: null,
      viewingAngleVertical: null,
      ipRating: null,
      colorTemperature: {
        min: null,
        max: null,
        uniformityKelvin: null,
        uniformityPercent: null,
      },
      ledLifetime: null,
    },
    structural: {
      transparentDisplayRequired: false,
      useExistingInfrastructure: null,
      currentWeight: null,
    },
  };

  // Extract dimensions - patterns like "280.31' x 9.45'" or "90' x 18'"
  const dimensionPattern = /(\d+(?:\.\d+)?)'\s*[x×]\s*(\d+(?:\.\d+)?)'/gi;
  const dimensionMatches = [...locationText.matchAll(dimensionPattern)];

  if (dimensionMatches.length > 0) {
    const firstMatch = dimensionMatches[0];
    location.dimensions = {
      widthFeet: parseFloat(firstMatch[1]),
      heightFeet: parseFloat(firstMatch[2]),
      widthPixels: null,
      heightPixels: null,
    };
  }

  // Extract pitch requirement
  const pitchMatch = locationText.match(/Pixel Pitch\s*[\r\n\s]*:\s*(Sub\s*\d+\s*mm|\d+\s*mm|Option\s*\d+\s*Pixel Pitch)/i);
  if (pitchMatch) {
    const pitchText = pitchMatch[1].trim();
    location.pitchRequirement = {
      preferred: pitchText,
      minimum: extractMinimumPitch(pitchText),
    };
  }

  // Extract minimum nits
  const nitsMatch = locationText.match(/Minimum Nits\s*[\r\n\s]*[:=]\s*(\d+)/i);
  if (nitsMatch && location.technicalRequirements) {
    location.technicalRequirements.minimumNits = parseInt(nitsMatch[1]);
  }

  // Extract refresh rate
  const refreshMatch = locationText.match(/Minimum Refresh Rate\s*[:>\s]*([\d,]+)\s*Hz/i);
  if (refreshMatch && location.technicalRequirements) {
    location.technicalRequirements.minimumRefreshRate = parseInt(refreshMatch[1].replace(/,/g, ''));
  }

  // Extract viewing angles
  const angleMatch = locationText.match(/(?:Horizontal|Vertical)\s*Angle\s*:?\s*(\d+)°/gi);
  if (angleMatch && location.technicalRequirements) {
    location.technicalRequirements.viewingAngleHorizontal = 140; // Default from RFP
    location.technicalRequirements.viewingAngleVertical = 140;
  }

  // Extract IP rating
  const ipMatch = locationText.match(/Preferred IP Rating\s*:?\s*(\d+)/i);
  if (ipMatch && location.technicalRequirements) {
    location.technicalRequirements.ipRating = ipMatch[1];
  }

  // Extract color temperature
  const colorTempMatch = locationText.match(/Color Temperature\s*:?\s*(\d+[,-]\d+)º?\s*Kelvin/i);
  if (colorTempMatch && location.technicalRequirements) {
    const [min, max] = colorTempMatch[1].split(/[-,]/).map(v => parseInt(v.trim()));
    location.technicalRequirements.colorTemperature = {
      min: min || null,
      max: max || null,
      uniformityKelvin: 250,
      uniformityPercent: 8,
    };
  }

  // Extract LED lifetime
  const lifetimeMatch = locationText.match(/Minimum LED Lifetime\s*:?\s*(\d+,\d+)\s*Hours/i);
  if (lifetimeMatch && location.technicalRequirements) {
    location.technicalRequirements.ledLifetime = parseInt(lifetimeMatch[1].replace(/,/g, ''));
  }

  // Extract service requirements
  const serviceMatch = locationText.match(/Maintenance Access\s*:?\s*(.+?)(?:\r?\n|$)/i);
  if (serviceMatch) {
    location.serviceRequirements = {
      accessMethod: serviceMatch[1].trim(),
      minimumMaintTripsPerYear: 4, // RFP default
    };
  }

  // Check for transparent display requirement
  location.specialNotes = [];
  if (locationText.toLowerCase().includes('transparent')) {
    location.specialNotes.push('Transparent display required');
    if (location.structural) {
      location.structural.transparentDisplayRequired = true;
    }
  }

  // Extract weight information
  const weightMatch = locationText.match(/Current Weight\s*:?\s*(\d+,\d+)\s*lbs/i);
  if (weightMatch && location.structural) {
    location.structural.currentWeight = parseInt(weightMatch[1].replace(/,/g, ''));
    location.structural.useExistingInfrastructure = true;
  }

  // Extract electrical requirements
  const voltageMatch = locationText.match(/(\d+)A\s*(\d+)V\s*([^\r\n]*)/i);
  if (voltageMatch) {
    location.electrical = {
      voltage: voltageMatch[2] + 'V',
      amperage: voltageMatch[1] + 'A',
      phase: voltageMatch[3]?.trim() || null,
      useExistingInfrastructure: locationText.toLowerCase().includes('use existing infrastructure'),
    };
  }

  // Extract quantity (often specified like "9 displays" or "Quantity: 9")
  const quantityMatch = locationText.match(/(?:Screens?|Display)\s*(\d+)[-–]\s*(\d+)|Quantity\s*:?\s*(\d+)|(\d+)\s*screen/i);
  if (quantityMatch) {
    if (quantityMatch[1] && quantityMatch[2]) {
      // Range like "Screens 7-9" means 3 screens
      location.quantity = parseInt(quantityMatch[2]) - parseInt(quantityMatch[1]) + 1;
    } else if (quantityMatch[3]) {
      location.quantity = parseInt(quantityMatch[3]);
    } else if (quantityMatch[4]) {
      location.quantity = parseInt(quantityMatch[4]);
    }
  }

  return location;
}

/**
 * Extract minimum pitch value from pitch string
 */
function extractMinimumPitch(pitchText: string): number | null {
  if (pitchText.toLowerCase().includes('sub')) {
    const match = pitchText.match(/\d+/);
    return match ? parseInt(match[0]) - 1 : 3; // Sub 4mm = 3mm minimum
  }
  const match = pitchText.match(/(\d+)\s*mm/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Alternative extraction method for different RFP formats
 */
function extractLocationsAlternative(rfpText: string): RFPDisplayLocation[] {
  const locations: RFPDisplayLocation[] = [];

  // Look for dimension patterns that might indicate screen locations
  const dimensionPattern = /(\d+(?:\.\d+)?)'\s*[x×]\s*(\d+(?:\.\d+)?)'/gi;
  const dimensionMatches = [...rfpText.matchAll(dimensionPattern)];

  if (dimensionMatches.length > 0) {
    dimensionMatches.forEach((match, index) => {
      // Try to find a location name nearby (within 200 characters before)
      const contextStart = Math.max(0, match.index! - 200);
      const contextEnd = match.index!;
      const context = rfpText.slice(contextStart, contextEnd);

      // Extract potential location name (last few words before dimension)
      const potentialNameMatch = context.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
      const locationName = potentialNameMatch?.slice(-1)[0] || `Location ${index + 1}`;

      const location: RFPDisplayLocation = {
        locationName,
        quantity: 1,
        dimensions: {
          widthFeet: parseFloat(match[1]),
          heightFeet: parseFloat(match[2]),
          widthPixels: null,
          heightPixels: null,
        },
      };

      locations.push(location);
    });
  }

  return locations;
}

/**
 * Calculate confidence score based on extracted data completeness
 */
function calculateConfidence(locations: RFPDisplayLocation[]): number {
  if (locations.length === 0) return 0;

  let totalFields = 0;
  let filledFields = 0;

  locations.forEach(loc => {
    const fields = [
      loc.dimensions?.widthFeet,
      loc.dimensions?.heightFeet,
      loc.pitchRequirement?.preferred,
      loc.technicalRequirements?.minimumNits,
      loc.technicalRequirements?.ipRating,
      loc.serviceRequirements?.accessMethod,
    ];

    fields.forEach(field => {
      totalFields++;
      if (field !== null && field !== undefined) {
        filledFields++;
      }
    });
  });

  return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
}

/**
 * Convert parsed RFP to structured format for AnythingLLM ingestion
 */
export function convertRFPForIngestion(parsed: ParsedRFP): string {
  const sections = [
    `# RFP: ${parsed.projectTitle}`,
    `Client: ${parsed.clientName}`,
    `Extracted: ${parsed.metadata.extractedAt}`,
    `Confidence: ${parsed.metadata.confidence.toFixed(1)}%`,
    ``,
    `## Locations`,
    ...parsed.locations.map(loc => formatLocationForIngestion(loc)),
  ];

  return sections.join('\n');
}

/**
 * Format a single location for ingestion
 */
function formatLocationForIngestion(loc: RFPDisplayLocation): string {
  const parts = [
    `### ${loc.locationName} (Quantity: ${loc.quantity})`,
    ``,
    `**Dimensions:** ${loc.dimensions?.widthFeet ?? 'N/A'}' × ${loc.dimensions?.heightFeet ?? 'N/A'}'`,
    `**Pixel Pitch:** ${loc.pitchRequirement?.preferred ?? 'Not specified'}`,
    `**Minimum Brightness:** ${loc.technicalRequirements?.minimumNits ?? 'Not specified'} nits`,
    `**IP Rating:** ${loc.technicalRequirements?.ipRating ?? 'Not specified'}`,
    `**Service Access:** ${loc.serviceRequirements?.accessMethod ?? 'Not specified'}`,
    ``,
    loc.specialNotes?.length ? `**Special Notes:** ${loc.specialNotes.join(', ')}` : '',
    loc.structural?.transparentDisplayRequired ? '**REQUIREMENT: Transparent display required**' : '',
  ];

  return parts.filter(p => p !== '').join('\n');
}

/**
 * Validate if a product meets RFP requirements for a location
 */
export function validateProductAgainstRFP(
  product: any,
  location: RFPDisplayLocation
): {
  meetsRequirements: boolean;
  gaps: string[];
  score: number;
} {
  const gaps: string[] = [];
  let score = 100;

  // Check pixel pitch
  if (location.pitchRequirement?.minimum && product.pixel_pitch) {
    const productPitch = parseFloat(product.pixel_pitch);
    if (productPitch > location.pitchRequirement.minimum) {
      gaps.push(`Pixel pitch ${product.pitch_pitch}mm exceeds minimum requirement of ${location.pitchRequirement.minimum}mm`);
      score -= 20;
    }
  }

  // Check brightness (nits)
  if (location.technicalRequirements?.minimumNits && product.brightness_nits) {
    const productNits = parseFloat(product.brightness_nits);
    if (productNits < location.technicalRequirements.minimumNits) {
      gaps.push(`Brightness ${product.brightness_nits} nits below requirement of ${location.technicalRequirements.minimumNits} nits`);
      score -= 30;
    }
  }

  // Check IP rating
  if (location.technicalRequirements?.ipRating && product.ip_rating) {
    const productIP = parseInt(product.ip_rating);
    const requiredIP = parseInt(location.technicalRequirements.ipRating);
    if (productIP < requiredIP) {
      gaps.push(`IP rating ${product.ip_rating} below requirement of IP${requiredIP}`);
      score -= 15;
    }
  }

  // Check transparent display requirement
  if (location.structural?.transparentDisplayRequired && !product.transparent) {
    gaps.push('Product is not a transparent display but RFP requires transparent technology');
    score -= 40;
  }

  return {
    meetsRequirements: score >= 70,
    gaps,
    score: Math.max(0, score),
  };
}
