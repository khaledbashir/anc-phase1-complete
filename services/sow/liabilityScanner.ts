export interface LiabilityCheck {
    id: string;
    category: "financial" | "legal" | "scope" | "timeline" | "warranty";
    name: string;
    description: string;
    severity: "critical" | "warning" | "info";
    keywords: string[];
    foundText?: string;
    status: "found" | "missing" | "flagged";
    recommendation: string;
}

export interface ScanResult {
    documentName: string;
    totalChecks: number;
    passed: number;
    warnings: number;
    critical: number;
    checks: LiabilityCheck[];
    riskScore: number;
    scannedAt: string;
}

interface CheckDefinition {
    id: string;
    category: LiabilityCheck["category"];
    name: string;
    description: string;
    severity: LiabilityCheck["severity"];
    patterns: RegExp[];
    logic: "must_exist" | "flag_if_found" | "conditional";
    conditionalFlag?: (matchedText: string) => { status: LiabilityCheck["status"]; recommendation: string } | null;
    missingRecommendation: string;
    foundRecommendation: string;
}

const CHECKLIST: CheckDefinition[] = [
    // ── Financial (5) ──
    {
        id: "fin-01",
        category: "financial",
        name: "Liquidated Damages Clause",
        description: "Check for liquidated damages and whether a cap is specified",
        severity: "critical",
        patterns: [/liquidated\s+damages/i, /\bLD\b/, /daily\s+penalty/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const hasLD = /liquidated\s+damages|daily\s+penalty/i.test(text);
            if (!hasLD) return null;
            const hasCap = /cap\b|maximum|not\s+to\s+exceed|aggregate|ceiling/i.test(text);
            if (!hasCap) {
                return {
                    status: "flagged",
                    recommendation: "Liquidated damages clause found but NO CAP detected. Negotiate a cap (typically 5-10% of contract value).",
                };
            }
            return {
                status: "found",
                recommendation: "Liquidated damages clause with cap found. Verify cap amount is reasonable.",
            };
        },
        missingRecommendation: "No liquidated damages clause found. Confirm this is intentional — absence can be favorable.",
        foundRecommendation: "Liquidated damages clause found.",
    },
    {
        id: "fin-02",
        category: "financial",
        name: "Performance Bond Percentage",
        description: "Check for performance/surety bond and flag unusual rates",
        severity: "warning",
        patterns: [/performance\s+bond/i, /surety\s+bond/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const pctMatch = text.match(/(\d+)\s*%/);
            if (pctMatch) {
                const pct = parseInt(pctMatch[1], 10);
                if (pct > 5) {
                    return {
                        status: "flagged",
                        recommendation: `Bond rate at ${pct}% is unusually high. ANC standard is 1.5%. Negotiate down or price into proposal.`,
                    };
                }
            }
            return null;
        },
        missingRecommendation: "No performance bond requirement found. Confirm with client if bond is needed.",
        foundRecommendation: "Performance bond clause found at standard rate.",
    },
    {
        id: "fin-03",
        category: "financial",
        name: "Payment Terms",
        description: "Check for defined payment terms (Net 30/45/60)",
        severity: "warning",
        patterns: [/net\s+30/i, /net\s+45/i, /net\s+60/i, /payment\s+terms/i, /progress\s+payment/i, /milestone\s+payment/i],
        logic: "must_exist",
        missingRecommendation: "No payment terms found. Add Net 30 or milestone-based payment schedule to protect cash flow.",
        foundRecommendation: "Payment terms defined.",
    },
    {
        id: "fin-04",
        category: "financial",
        name: "Retainage",
        description: "Check for retainage/retention/holdback and flag if over 10%",
        severity: "warning",
        patterns: [/retainage/i, /retention/i, /holdback/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const pctMatch = text.match(/(\d+)\s*%/);
            if (pctMatch) {
                const pct = parseInt(pctMatch[1], 10);
                if (pct > 10) {
                    return {
                        status: "flagged",
                        recommendation: `Retainage at ${pct}% exceeds industry standard (5-10%). Negotiate reduction or phased release.`,
                    };
                }
            }
            return null;
        },
        missingRecommendation: "No retainage clause found. This is typically favorable for the contractor.",
        foundRecommendation: "Retainage clause found within standard range.",
    },
    {
        id: "fin-05",
        category: "financial",
        name: "Change Order Process",
        description: "Check for a defined change order / scope change process",
        severity: "critical",
        patterns: [/change\s+order/i, /variation\s+order/i, /scope\s+change/i],
        logic: "must_exist",
        missingRecommendation: "CRITICAL: No change order process defined. Without this, scope creep has no contractual remedy. Add a formal CO process.",
        foundRecommendation: "Change order process defined.",
    },

    // ── Legal (5) ──
    {
        id: "leg-01",
        category: "legal",
        name: "Force Majeure",
        description: "Check for force majeure / act of God clause",
        severity: "warning",
        patterns: [/force\s+majeure/i, /act\s+of\s+god/i],
        logic: "must_exist",
        missingRecommendation: "No force majeure clause. Add one to protect against uncontrollable delays (weather, supply chain, pandemic).",
        foundRecommendation: "Force majeure clause found.",
    },
    {
        id: "leg-02",
        category: "legal",
        name: "Limitation of Liability",
        description: "Check for liability cap / limitation of liability clause",
        severity: "critical",
        patterns: [/limitation\s+of\s+liability/i, /liability\s+cap/i, /aggregate\s+liability/i, /total\s+liability/i],
        logic: "must_exist",
        missingRecommendation: "CRITICAL: No limitation of liability clause. ANC's exposure is unlimited. Add a cap (typically contract value or 2x).",
        foundRecommendation: "Limitation of liability clause found.",
    },
    {
        id: "leg-03",
        category: "legal",
        name: "Indemnification",
        description: "Check for indemnification / hold harmless clauses",
        severity: "warning",
        patterns: [/indemnif/i, /hold\s+harmless/i],
        logic: "flag_if_found",
        missingRecommendation: "No indemnification clause found.",
        foundRecommendation: "Indemnification clause found. Review scope — ensure it's mutual and doesn't expose ANC to third-party claims beyond ANC's control.",
    },
    {
        id: "leg-04",
        category: "legal",
        name: "Termination Clause",
        description: "Check for termination for convenience and/or cause",
        severity: "warning",
        patterns: [/termination\s+for\s+convenience/i, /termination\s+for\s+cause/i, /right\s+to\s+terminate/i],
        logic: "must_exist",
        missingRecommendation: "No termination clause found. Add termination for cause (both parties) and termination for convenience with kill fee.",
        foundRecommendation: "Termination clause found.",
    },
    {
        id: "leg-05",
        category: "legal",
        name: "IP / Ownership",
        description: "Check for intellectual property and work product ownership clauses",
        severity: "info",
        patterns: [/intellectual\s+property/i, /ownership\s+of\s+work/i, /work\s+product/i],
        logic: "flag_if_found",
        missingRecommendation: "No IP/ownership clause found.",
        foundRecommendation: "IP/ownership clause found. Verify ANC retains rights to proprietary installation methods and software.",
    },

    // ── Scope (4) ──
    {
        id: "sco-01",
        category: "scope",
        name: "Scope Exclusions",
        description: "Identify scope exclusions and owner-responsible items",
        severity: "info",
        patterns: [/exclud/i, /not\s+included/i, /owner\s+responsible/i, /by\s+others/i],
        logic: "flag_if_found",
        missingRecommendation: "No explicit scope exclusions found. Ensure ANC's scope boundaries are clearly defined.",
        foundRecommendation: "Scope exclusions found. Review each to confirm ANC is not inadvertently accepting excluded work.",
    },
    {
        id: "sco-02",
        category: "scope",
        name: "Prevailing Wage",
        description: "Check for prevailing wage / Davis-Bacon / union requirements",
        severity: "warning",
        patterns: [/prevailing\s+wage/i, /davis[\s-]bacon/i, /union/i],
        logic: "flag_if_found",
        missingRecommendation: "No prevailing wage requirement detected.",
        foundRecommendation: "Prevailing wage / union requirement found. This significantly impacts labor costs — ensure install pricing reflects prevailing rates.",
    },
    {
        id: "sco-03",
        category: "scope",
        name: "Working Hours Restrictions",
        description: "Check for night work, weekend, or overtime restrictions",
        severity: "info",
        patterns: [/working\s+hours/i, /night\s+work/i, /weekend/i, /overtime/i, /after\s+hours/i],
        logic: "flag_if_found",
        missingRecommendation: "No working hours restrictions found.",
        foundRecommendation: "Working hours restrictions found. Factor overtime/premium rates into install estimate if off-hours work is required.",
    },
    {
        id: "sco-04",
        category: "scope",
        name: "Permit Responsibility",
        description: "Check who is responsible for permits, licenses, and inspections",
        severity: "warning",
        patterns: [/permit/i, /license/i, /inspection/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const contractorResponsible = /contractor\s+(shall|will|is\s+responsible).{0,40}(permit|license|inspection)/i.test(text);
            if (contractorResponsible) {
                return {
                    status: "flagged",
                    recommendation: "ANC appears responsible for permits/inspections. Ensure permit costs and timeline are included in the estimate.",
                };
            }
            return null;
        },
        missingRecommendation: "No permit responsibility clause found. Clarify who obtains and pays for permits.",
        foundRecommendation: "Permit responsibility defined.",
    },

    // ── Timeline (3) ──
    {
        id: "tim-01",
        category: "timeline",
        name: "Substantial Completion Date",
        description: "Check for a defined substantial completion date or milestone",
        severity: "warning",
        patterns: [/substantial\s+completion/i, /milestone/i, /completion\s+date/i],
        logic: "must_exist",
        missingRecommendation: "No substantial completion date found. Without a defined deadline, schedule disputes have no contractual basis.",
        foundRecommendation: "Substantial completion date / milestones defined.",
    },
    {
        id: "tim-02",
        category: "timeline",
        name: "Weather Days",
        description: "Check for weather day / rain day allowances",
        severity: "info",
        patterns: [/weather\s+day/i, /rain\s+day/i, /force\s+majeure\s+day/i, /weather\s+delay/i],
        logic: "must_exist",
        missingRecommendation: "No weather day allowance found. For outdoor installations, add weather day provisions to protect the schedule.",
        foundRecommendation: "Weather day provisions found.",
    },
    {
        id: "tim-03",
        category: "timeline",
        name: "Concurrent Work",
        description: "Check for concurrent contractor coordination requirements",
        severity: "info",
        patterns: [/concurrent/i, /other\s+contractors/i, /coordinate/i, /coordination/i],
        logic: "flag_if_found",
        missingRecommendation: "No concurrent work mentioned.",
        foundRecommendation: "Concurrent work with other contractors mentioned. Factor coordination time into PM estimate and clarify liability boundaries.",
    },

    // ── Warranty (3) ──
    {
        id: "war-01",
        category: "warranty",
        name: "Warranty Duration",
        description: "Check for warranty / guarantee duration",
        severity: "warning",
        patterns: [/warranty/i, /guarantee/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const durationMatch = text.match(/(\d+)\s*[\s-]*(year|month|yr)/i);
            if (durationMatch) {
                const num = parseInt(durationMatch[1], 10);
                const unit = durationMatch[2].toLowerCase();
                const years = unit.startsWith("month") ? num / 12 : num;
                if (years > 5) {
                    return {
                        status: "flagged",
                        recommendation: `Warranty duration of ${num} ${unit}s is above standard (typically 2-5 years for LED). Ensure extended warranty costs are priced in.`,
                    };
                }
                return {
                    status: "found",
                    recommendation: `Warranty duration: ${num} ${unit}(s). Within standard range.`,
                };
            }
            return null;
        },
        missingRecommendation: "No warranty clause found. Define warranty terms before signing.",
        foundRecommendation: "Warranty clause found.",
    },
    {
        id: "war-02",
        category: "warranty",
        name: "Extended Warranty / Maintenance",
        description: "Check for extended warranty or maintenance agreement requirements",
        severity: "info",
        patterns: [/extended\s+warranty/i, /maintenance\s+agreement/i, /service\s+agreement/i, /annual\s+maintenance/i],
        logic: "flag_if_found",
        missingRecommendation: "No extended warranty / maintenance agreement mentioned.",
        foundRecommendation: "Extended warranty or maintenance agreement found. Price the annual escalation (typically 10%/year for years 4-10).",
    },
    {
        id: "war-03",
        category: "warranty",
        name: "Spare Parts Requirement",
        description: "Check for spare parts / attic stock requirements",
        severity: "info",
        patterns: [/spare/i, /attic\s+stock/i, /replacement\s+(module|part|panel)/i],
        logic: "conditional",
        conditionalFlag: (text) => {
            const pctMatch = text.match(/(\d+)\s*%/);
            if (pctMatch) {
                const pct = parseInt(pctMatch[1], 10);
                if (pct > 10) {
                    return {
                        status: "flagged",
                        recommendation: `Spare parts at ${pct}% is above standard (typically 2-5% for LED modules). Negotiate down or price accordingly.`,
                    };
                }
                return {
                    status: "found",
                    recommendation: `Spare parts at ${pct}%. Within standard range.`,
                };
            }
            return null;
        },
        missingRecommendation: "No spare parts requirement found.",
        foundRecommendation: "Spare parts requirement found.",
    },
];

function extractContext(text: string, pattern: RegExp, contextChars: number = 200): string {
    const match = text.match(pattern);
    if (!match || match.index === undefined) return "";
    const start = Math.max(0, match.index - contextChars / 2);
    const end = Math.min(text.length, match.index + match[0].length + contextChars / 2);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function scanForLiabilities(text: string, documentName: string): ScanResult {
    const normalizedText = text.replace(/\r\n/g, "\n");
    const checks: LiabilityCheck[] = [];

    for (const def of CHECKLIST) {
        let matched = false;
        let matchedText = "";

        for (const pattern of def.patterns) {
            if (pattern.test(normalizedText)) {
                matched = true;
                matchedText = extractContext(normalizedText, pattern);
                break;
            }
        }

        let status: LiabilityCheck["status"];
        let recommendation: string;

        if (def.logic === "must_exist") {
            if (matched) {
                status = "found";
                recommendation = def.foundRecommendation;
            } else {
                status = "missing";
                recommendation = def.missingRecommendation;
            }
        } else if (def.logic === "flag_if_found") {
            if (matched) {
                status = "flagged";
                recommendation = def.foundRecommendation;
            } else {
                status = "found"; // not found = no issue
                recommendation = def.missingRecommendation;
            }
        } else {
            // conditional
            if (matched && def.conditionalFlag) {
                const result = def.conditionalFlag(normalizedText);
                if (result) {
                    status = result.status;
                    recommendation = result.recommendation;
                } else {
                    status = "found";
                    recommendation = def.foundRecommendation;
                }
            } else if (!matched) {
                status = "missing";
                recommendation = def.missingRecommendation;
            } else {
                status = "found";
                recommendation = def.foundRecommendation;
            }
        }

        checks.push({
            id: def.id,
            category: def.category,
            name: def.name,
            description: def.description,
            severity: def.severity,
            keywords: def.patterns.map((p) => p.source),
            foundText: matched ? matchedText : undefined,
            status,
            recommendation,
        });
    }

    // Scoring
    let riskPoints = 0;
    let passed = 0;
    let warnings = 0;
    let critical = 0;

    for (const check of checks) {
        if (check.status === "found") {
            passed++;
        } else if (check.status === "missing") {
            if (check.severity === "critical") {
                critical++;
                riskPoints += 15;
            } else if (check.severity === "warning") {
                warnings++;
                riskPoints += 8;
            } else {
                warnings++;
                riskPoints += 3;
            }
        } else if (check.status === "flagged") {
            if (check.severity === "critical") {
                critical++;
                riskPoints += 15;
            } else if (check.severity === "warning") {
                warnings++;
                riskPoints += 8;
            } else {
                riskPoints += 3;
            }
        }
    }

    return {
        documentName,
        totalChecks: checks.length,
        passed,
        warnings,
        critical,
        checks,
        riskScore: Math.min(100, riskPoints),
        scannedAt: new Date().toISOString(),
    };
}
