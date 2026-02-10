/**
 * Schedule & Warranty Extractor — P49c
 *
 * Extracts construction schedule phases and warranty/service terms from RFP text.
 * Two strategies: regex-first (instant, free), AI-fallback (AnythingLLM) for complex docs.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { ANC_SYSTEM_PROMPT } from "@/lib/ai-prompts";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedTask {
  name: string;
  duration: string | null;
  notes?: string;
}

export interface ExtractedPhase {
  phaseName: string;
  phaseNumber: string | null;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  dependencies: string[];
  tasks: ExtractedTask[];
  confidence: number;
}

export interface ExtractedWarranty {
  baseYears: number | null;
  extendedYears: number | null;
  responseTime: string | null;
  slaLevel: string | null;
  sparePartsPercent: number | null;
  preventativeVisitsPerYear: number | null;
  annualCost: number | null;
  terms: string[];
  confidence: number;
}

export interface ScheduleWarrantyResult {
  schedule: ExtractedPhase[];
  warranty: ExtractedWarranty;
  method: "regex" | "ai-assisted";
}

// ============================================================================
// REGEX PATTERNS — SCHEDULE
// ============================================================================

const PHASE_HEADER_PATTERNS = [
  /(?:PHASE|Phase)\s+(\d+)\s*[:\-–—]?\s*(.+)/,
  /(?:STAGE|Stage)\s+(\d+)\s*[:\-–—]?\s*(.+)/,
  /(\d+)\.\s+((?:Design|Engineering|Manufacturing|Procurement|Shipping|Installation|Integration|Commissioning|Closeout|Training|Mobilization|Demolition|Testing|Punch\s*List)[A-Za-z\s&,]*)/i,
];

const DURATION_PATTERNS = [
  /(\d+)\s*(?:calendar\s*)?days?\b/i,
  /(\d+)\s*(?:work(?:ing)?\s*)?days?\b/i,
  /(\d+)\s*weeks?\b/i,
  /(\d+)\s*months?\b/i,
  /(\d+)\s*(?:business\s*)?days?\b/i,
];

const DATE_PATTERNS = [
  // MM/DD/YYYY or MM-DD-YYYY
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  // Month DD, YYYY
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
  // DD Month YYYY
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
];

const ANC_STANDARD_PHASES = [
  { pattern: /design\s*(?:and|&)?\s*(?:development|engineering)/i, name: "Design and Development" },
  { pattern: /engineering\s*(?:and|&)?\s*submittals?/i, name: "Engineering and Submittals" },
  { pattern: /structural\s*(?:design\s*)?engineering/i, name: "Structural Design Engineering" },
  { pattern: /electrical\s*(?:and|&)?\s*data\s*(?:design\s*)?engineering/i, name: "Electrical and Data Engineering" },
  { pattern: /control\s*room\s*(?:design\s*)?engineering/i, name: "Control Room Engineering" },
  { pattern: /submittal/i, name: "Submittals" },
  { pattern: /owner\s*review/i, name: "Owner Review and Approval" },
  { pattern: /led\s*manufactur/i, name: "LED Manufacturing" },
  { pattern: /manufactur(?:ing|e)/i, name: "Manufacturing" },
  { pattern: /ocean\s*freight/i, name: "Ocean Freight Shipping" },
  { pattern: /ground\s*shipp/i, name: "Ground Shipping" },
  { pattern: /(?:freight|shipp(?:ing|ment))/i, name: "Shipping" },
  { pattern: /mobiliz(?:ation|e)/i, name: "Mobilization and Site Prep" },
  { pattern: /demolition/i, name: "Demolition and Disposal" },
  { pattern: /(?:led|display)\s*install/i, name: "LED Installation" },
  { pattern: /install(?:ation)?/i, name: "Installation" },
  { pattern: /infrastructure/i, name: "Infrastructure Install" },
  { pattern: /low\s*voltage/i, name: "Low Voltage Connectivity" },
  { pattern: /integrat(?:ion|e)/i, name: "Integration" },
  { pattern: /control\s*system\s*install/i, name: "Control System Installation" },
  { pattern: /commission/i, name: "Commissioning" },
  { pattern: /test(?:ing)?\s*(?:and|&)?\s*commission/i, name: "Testing and Commissioning" },
  { pattern: /training/i, name: "On-Site Training" },
  { pattern: /closeout/i, name: "Closeout" },
  { pattern: /punch\s*list/i, name: "Punch List" },
  { pattern: /finish(?:es)?\s*(?:and|&)?\s*trim/i, name: "Finishes and Trim" },
  { pattern: /site\s*clean/i, name: "Site Clean Up" },
  { pattern: /preconstruction/i, name: "Preconstruction" },
  { pattern: /procurement/i, name: "Procurement" },
];

// ============================================================================
// REGEX PATTERNS — WARRANTY
// ============================================================================

const WARRANTY_YEAR_PATTERNS = [
  /(\d+)\s*[-–]?\s*year\s*(?:base\s*)?warranty/i,
  /warranty\s*(?:period|term|duration)\s*[:\-–]?\s*(\d+)\s*year/i,
  /base\s*warranty\s*[:\-–]?\s*(\d+)\s*year/i,
  /(\d+)\s*year\s*(?:base\s*)?(?:parts?\s*(?:and|&)\s*labor|full|comprehensive)\s*warranty/i,
];

const EXTENDED_WARRANTY_PATTERNS = [
  /extended\s*warranty\s*[:\-–]?\s*(?:up\s*to\s*)?(\d+)\s*year/i,
  /(\d+)\s*year\s*extended\s*warranty/i,
  /year[s]?\s*(\d+)\s*[-–]\s*(\d+)\s*[:\-–]?\s*extended/i,
  /optional\s*(?:extended\s*)?warranty\s*[:\-–]?\s*(\d+)\s*year/i,
];

const RESPONSE_TIME_PATTERNS = [
  /(?:response|acknowledgement?)\s*(?:time)?\s*[:\-–]?\s*(?:within\s*)?(\d+)\s*hour/i,
  /(\d+)\s*[-–]?\s*hour\s*(?:ticketed\s*)?response/i,
  /(?:ticketed|service)\s*response\s*[:\-–]?\s*(?:within\s*)?(\d+)\s*hour/i,
  /on\s*[-–]?\s*site\s*(?:repair|response)\s*[:\-–]?\s*(?:within\s*)?(\d+)\s*hour/i,
  /(?:response|acknowledgement?)\s*(?:time)?\s*[:\-–]?\s*(?:within\s*)?(\d+)\s*minute/i,
];

const SPARE_PARTS_PATTERNS = [
  /(\d+)\s*%\s*spare\s*parts?/i,
  /spare\s*parts?\s*[:\-–]?\s*(\d+)\s*%/i,
  /minimum\s*(\d+)\s*%\s*spare/i,
];

const MAINTENANCE_VISIT_PATTERNS = [
  /(\d+)\s*(?:scheduled\s*)?visit[s]?\s*per\s*year/i,
  /(\d+)\s*(?:annual|yearly)\s*(?:preventative\s*)?(?:maintenance\s*)?visit/i,
  /preventative\s*maintenance\s*[:\-–]?\s*(\d+)\s*(?:times?\s*)?(?:per\s*year|annually)/i,
  /(\d+)\s*(?:times?\s*)?(?:per\s*year|annually)\s*(?:preventative\s*)?maintenance/i,
];

const SLA_PATTERNS = [
  /(?:SLA|service\s*level\s*agreement?)\s*[:\-–]?\s*(.{5,60})/i,
  /(?:white\s*glove|premium|standard|gold|silver|platinum)\s*(?:service|SLA|support)/i,
];

const WARRANTY_COST_PATTERNS = [
  /(?:warranty|service|maintenance)\s*(?:annual\s*)?cost\s*[:\-–]?\s*\$?([\d,]+)/i,
  /\$?([\d,]+)\s*(?:per\s*year|annually|\/yr)\s*(?:for\s*)?(?:warranty|service|maintenance)/i,
];

// ============================================================================
// SCHEDULE EXTRACTOR
// ============================================================================

export function extractSchedule(text: string): ExtractedPhase[] {
  const phases: ExtractedPhase[] = [];
  const lines = text.split("\n");

  // Strategy 1: Look for explicit phase headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const pattern of PHASE_HEADER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const phaseNumber = match[1];
        const phaseName = match[2].trim().replace(/[:\-–—]+$/, "").trim();

        // Collect tasks under this phase (look ahead until next phase or blank block)
        const tasks: ExtractedTask[] = [];
        let phaseDuration: string | null = null;
        let phaseStart: string | null = null;
        let phaseEnd: string | null = null;

        for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
          const taskLine = lines[j].trim();
          if (!taskLine) continue;

          // Stop if we hit another phase header
          if (PHASE_HEADER_PATTERNS.some(p => p.test(taskLine))) break;

          // Extract task name and duration
          const taskDuration = extractDuration(taskLine);
          const taskDates = extractDates(taskLine);

          // Match against known ANC task patterns
          let taskName: string | null = null;
          for (const { pattern: tp, name } of ANC_STANDARD_PHASES) {
            if (tp.test(taskLine)) {
              taskName = name;
              break;
            }
          }

          if (taskName || taskDuration) {
            tasks.push({
              name: taskName || taskLine.slice(0, 80).replace(/[\d\/\-,]+$/, "").trim(),
              duration: taskDuration,
              notes: taskDates.length > 0 ? taskDates.join(" → ") : undefined,
            });
          }

          // Capture phase-level dates
          if (taskDates.length > 0) {
            if (!phaseStart) phaseStart = taskDates[0];
            phaseEnd = taskDates[taskDates.length - 1];
          }

          // Capture phase-level duration
          if (!phaseDuration && taskDuration) {
            phaseDuration = taskDuration;
          }
        }

        // Calculate overall phase duration from tasks if not found directly
        if (!phaseDuration && tasks.length > 0) {
          const taskDurations = tasks
            .map(t => t.duration)
            .filter(Boolean)
            .map(d => parseDurationToDays(d!));
          if (taskDurations.length > 0) {
            const maxDays = Math.max(...taskDurations);
            phaseDuration = `${maxDays} days (estimated)`;
          }
        }

        phases.push({
          phaseName,
          phaseNumber,
          duration: phaseDuration,
          startDate: phaseStart,
          endDate: phaseEnd,
          dependencies: [],
          tasks,
          confidence: tasks.length > 0 ? 0.8 : 0.5,
        });
        break;
      }
    }
  }

  // Strategy 2: If no explicit phases found, scan for ANC standard phase keywords
  if (phases.length === 0) {
    const foundTasks = new Map<string, ExtractedTask[]>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      for (const { pattern, name } of ANC_STANDARD_PHASES) {
        if (pattern.test(line)) {
          const duration = extractDuration(line);
          const context = [lines[i - 1] || "", line, lines[i + 1] || ""].join(" ");
          const contextDuration = duration || extractDuration(context);

          if (!foundTasks.has(name)) {
            foundTasks.set(name, []);
          }
          foundTasks.get(name)!.push({
            name,
            duration: contextDuration,
          });
          break;
        }
      }
    }

    // Group into logical phases
    const phaseGroups: Record<string, string[]> = {
      "Design and Development": [
        "Design and Development", "Engineering and Submittals",
        "Structural Design Engineering", "Electrical and Data Engineering",
        "Control Room Engineering", "Submittals", "Owner Review and Approval",
        "Preconstruction",
      ],
      "Manufacturing and Shipping": [
        "LED Manufacturing", "Manufacturing", "Procurement",
        "Ocean Freight Shipping", "Ground Shipping", "Shipping",
      ],
      "Installation": [
        "Mobilization and Site Prep", "Demolition and Disposal",
        "LED Installation", "Installation", "Infrastructure Install",
        "Low Voltage Connectivity", "Finishes and Trim", "Site Clean Up",
      ],
      "Integration and Closeout": [
        "Integration", "Control System Installation",
        "Commissioning", "Testing and Commissioning",
        "On-Site Training", "Closeout", "Punch List",
      ],
    };

    let phaseIdx = 1;
    for (const [groupName, taskNames] of Object.entries(phaseGroups)) {
      const groupTasks: ExtractedTask[] = [];
      for (const taskName of taskNames) {
        const found = foundTasks.get(taskName);
        if (found && found.length > 0) {
          groupTasks.push(found[0]);
          foundTasks.delete(taskName);
        }
      }

      if (groupTasks.length > 0) {
        phases.push({
          phaseName: groupName,
          phaseNumber: String(phaseIdx),
          duration: null,
          startDate: null,
          endDate: null,
          dependencies: phaseIdx > 1 ? [`Phase ${phaseIdx - 1}`] : [],
          tasks: groupTasks,
          confidence: 0.6,
        });
        phaseIdx++;
      }
    }
  }

  // Infer dependencies: each phase depends on the previous
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].dependencies.length === 0) {
      phases[i].dependencies.push(phases[i - 1].phaseName);
    }
  }

  return phases;
}

// ============================================================================
// WARRANTY EXTRACTOR
// ============================================================================

export function extractWarranty(text: string): ExtractedWarranty {
  let baseYears: number | null = null;
  let extendedYears: number | null = null;
  let responseTime: string | null = null;
  let slaLevel: string | null = null;
  let sparePartsPercent: number | null = null;
  let preventativeVisitsPerYear: number | null = null;
  let annualCost: number | null = null;
  const terms: string[] = [];
  let matchCount = 0;

  // Base warranty years
  for (const pattern of WARRANTY_YEAR_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      baseYears = parseInt(match[1]);
      terms.push(`Base warranty: ${baseYears} years`);
      matchCount++;
      break;
    }
  }

  // Extended warranty
  for (const pattern of EXTENDED_WARRANTY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      extendedYears = parseInt(match[1] || match[2]);
      terms.push(`Extended warranty: up to ${extendedYears} years`);
      matchCount++;
      break;
    }
  }

  // Response time
  for (const pattern of RESPONSE_TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      const isMinutes = /minute/i.test(pattern.source);
      responseTime = isMinutes ? `${value} minutes` : `${value} hours`;
      terms.push(`Response time: ${responseTime}`);
      matchCount++;
      break;
    }
  }

  // Spare parts
  for (const pattern of SPARE_PARTS_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      sparePartsPercent = parseInt(match[1]);
      terms.push(`Spare parts: ${sparePartsPercent}%`);
      matchCount++;
      break;
    }
  }

  // Preventative maintenance visits
  for (const pattern of MAINTENANCE_VISIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      preventativeVisitsPerYear = parseInt(match[1]);
      terms.push(`Preventative maintenance: ${preventativeVisitsPerYear} visits/year`);
      matchCount++;
      break;
    }
  }

  // SLA level
  for (const pattern of SLA_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const slaText = match[0].trim();
      if (/white\s*glove/i.test(slaText)) slaLevel = "White Glove";
      else if (/premium/i.test(slaText)) slaLevel = "Premium";
      else if (/platinum/i.test(slaText)) slaLevel = "Platinum";
      else if (/gold/i.test(slaText)) slaLevel = "Gold";
      else slaLevel = "Standard";
      terms.push(`SLA: ${slaLevel}`);
      matchCount++;
      break;
    }
  }

  // Annual cost
  for (const pattern of WARRANTY_COST_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      annualCost = parseFloat(match[1].replace(/,/g, ""));
      terms.push(`Annual cost: $${annualCost.toLocaleString()}`);
      matchCount++;
      break;
    }
  }

  // Extract raw warranty-related sentences for context
  const warrantyLines = text.split("\n")
    .map(l => l.trim())
    .filter(l => /warranty|maintenance|service\s*level|sla|spare\s*part|response\s*time|preventative/i.test(l))
    .filter(l => l.length > 15 && l.length < 300)
    .slice(0, 15);

  for (const line of warrantyLines) {
    if (!terms.includes(line) && terms.length < 20) {
      terms.push(line);
    }
  }

  // Confidence based on how many fields we found
  const confidence = matchCount >= 4 ? 0.85 : matchCount >= 2 ? 0.65 : matchCount >= 1 ? 0.45 : 0.2;

  return {
    baseYears,
    extendedYears,
    responseTime,
    slaLevel,
    sparePartsPercent,
    preventativeVisitsPerYear,
    annualCost,
    terms,
    confidence,
  };
}

// ============================================================================
// AI FALLBACK
// ============================================================================

const DASHBOARD_WORKSPACE_SLUG = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

export async function extractScheduleWarrantyWithAI(
  highValueText: string
): Promise<{ schedule: ExtractedPhase[]; warranty: ExtractedWarranty }> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    throw new Error("AnythingLLM not configured. Set ANYTHING_LLM_URL and ANYTHING_LLM_KEY.");
  }

  const prompt = `${ANC_SYSTEM_PROMPT}

You are analyzing an RFP document for ANC Sports Enterprises. Extract the construction schedule and warranty terms.

Return ONLY valid JSON in this exact format (no markdown, no explanation):

{
  "schedule": [
    {
      "phaseName": "Design and Development",
      "phaseNumber": "1",
      "duration": "38 days",
      "startDate": null,
      "endDate": null,
      "dependencies": [],
      "tasks": [
        { "name": "Structural Design Engineering", "duration": "30 days" },
        { "name": "Electrical and Data Engineering", "duration": "30 days" }
      ]
    }
  ],
  "warranty": {
    "baseYears": 5,
    "extendedYears": 10,
    "responseTime": "4 hours",
    "slaLevel": "Standard",
    "sparePartsPercent": 5,
    "preventativeVisitsPerYear": 2,
    "annualCost": null,
    "terms": ["5-year base warranty", "4-hour ticketed response", "5% spare parts on-site"]
  }
}

EXTRACTION RULES:
- For schedule: Look for phases, milestones, Gantt data, task durations, dates
- ANC standard phases: Design → Manufacturing → Shipping → Installation → Integration → Commissioning → Closeout
- For warranty: Look for warranty years, response times, SLA terms, spare parts %, maintenance visits, costs
- Set fields to null if not found
- Return ONLY JSON, no other text

DOCUMENT CONTENT:

${highValueText.slice(0, 50000)}`;

  const chatUrl = `${ANYTHING_LLM_BASE_URL}/workspace/${DASHBOARD_WORKSPACE_SLUG}/chat`;

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({
      message: prompt,
      mode: "chat",
      sessionId: `schedule-warranty-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AnythingLLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.textResponse || data.response || "";

  // Parse JSON from response
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Schedule/Warranty AI] No JSON found in response:", rawContent.slice(0, 200));
    return {
      schedule: [],
      warranty: {
        baseYears: null, extendedYears: null, responseTime: null,
        slaLevel: null, sparePartsPercent: null, preventativeVisitsPerYear: null,
        annualCost: null, terms: [], confidence: 0,
      },
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize schedule
    const schedule: ExtractedPhase[] = (parsed.schedule || []).map((p: any, idx: number) => ({
      phaseName: p.phaseName || `Phase ${idx + 1}`,
      phaseNumber: p.phaseNumber || String(idx + 1),
      duration: p.duration || null,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      dependencies: p.dependencies || [],
      tasks: (p.tasks || []).map((t: any) => ({
        name: t.name || "Unknown Task",
        duration: t.duration || null,
        notes: t.notes || undefined,
      })),
      confidence: 0.75,
    }));

    // Normalize warranty
    const w = parsed.warranty || {};
    const warranty: ExtractedWarranty = {
      baseYears: w.baseYears ?? null,
      extendedYears: w.extendedYears ?? null,
      responseTime: w.responseTime ?? null,
      slaLevel: w.slaLevel ?? null,
      sparePartsPercent: w.sparePartsPercent ?? null,
      preventativeVisitsPerYear: w.preventativeVisitsPerYear ?? null,
      annualCost: w.annualCost ?? null,
      terms: w.terms || [],
      confidence: 0.75,
    };

    return { schedule, warranty };
  } catch (e) {
    console.error("[Schedule/Warranty AI] JSON parse error:", e);
    return {
      schedule: [],
      warranty: {
        baseYears: null, extendedYears: null, responseTime: null,
        slaLevel: null, sparePartsPercent: null, preventativeVisitsPerYear: null,
        annualCost: null, terms: [], confidence: 0,
      },
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function extractDuration(text: string): string | null {
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (/week/i.test(match[0])) return `${value} weeks`;
      if (/month/i.test(match[0])) return `${value} months`;
      return `${value} days`;
    }
  }
  return null;
}

function extractDates(text: string): string[] {
  const dates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      dates.push(match[0]);
    }
  }
  return dates;
}

function parseDurationToDays(duration: string): number {
  const match = duration.match(/(\d+)\s*(day|week|month)/i);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("week")) return value * 7;
  if (unit.startsWith("month")) return value * 30;
  return value;
}
