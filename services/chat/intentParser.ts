/**
 * Copilot Intent Parser — P65
 *
 * Parses user chat messages into structured intents/actions.
 * Detects commands like "set margin to 30%", "add a screen", "export PDF", etc.
 */

// ============================================================================
// TYPES
// ============================================================================

export type IntentType =
    | "set_margin"
    | "set_bond_rate"
    | "set_tax_rate"
    | "add_screen"
    | "remove_screen"
    | "add_quote_item"
    | "export_pdf"
    | "export_csv"
    | "find_product"
    | "explain_pricing"
    | "general_question"
    | "unknown";

export interface ParsedIntent {
    type: IntentType;
    confidence: number; // 0-1
    params: Record<string, any>;
    originalMessage: string;
}

// ============================================================================
// PATTERNS
// ============================================================================

const INTENT_PATTERNS: Array<{
    type: IntentType;
    patterns: RegExp[];
    extractParams: (match: RegExpMatchArray, message: string) => Record<string, any>;
}> = [
    {
        type: "set_margin",
        patterns: [
            /(?:set|change|update|make)\s+(?:the\s+)?(?:global\s+)?margin\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*%?/i,
            /margin\s*[:=]\s*(\d+(?:\.\d+)?)\s*%?/i,
            /(\d+(?:\.\d+)?)\s*%?\s+margin/i,
        ],
        extractParams: (match) => ({ margin: parseFloat(match[1]) / 100 }),
    },
    {
        type: "set_bond_rate",
        patterns: [
            /(?:set|change|update)\s+(?:the\s+)?bond\s+(?:rate\s+)?(?:to\s+)?(\d+(?:\.\d+)?)\s*%?/i,
            /bond\s*[:=]\s*(\d+(?:\.\d+)?)\s*%?/i,
        ],
        extractParams: (match) => ({ bondRate: parseFloat(match[1]) }),
    },
    {
        type: "set_tax_rate",
        patterns: [
            /(?:set|change|update)\s+(?:the\s+)?(?:sales\s+)?tax\s+(?:rate\s+)?(?:to\s+)?(\d+(?:\.\d+)?)\s*%?/i,
            /tax\s*[:=]\s*(\d+(?:\.\d+)?)\s*%?/i,
        ],
        extractParams: (match) => ({ taxRate: parseFloat(match[1]) / 100 }),
    },
    {
        type: "add_screen",
        patterns: [
            /(?:add|create|new|insert)\s+(?:a\s+)?(?:\d+\s+)?(?:screen|display|panel)/i,
        ],
        extractParams: (_match, message) => ({ rawSpec: message }),
    },
    {
        type: "remove_screen",
        patterns: [
            /(?:remove|delete)\s+(?:the\s+)?(?:screen|display)\s*(.*)/i,
            /(?:remove|delete)\s+screen\s*(\d+)/i,
        ],
        extractParams: (match) => ({ target: (match[1] || "").trim() }),
    },
    {
        type: "add_quote_item",
        patterns: [
            /(?:add|create|new)\s+(?:a\s+)?(?:quote|quotation|line)\s*item/i,
        ],
        extractParams: () => ({}),
    },
    {
        type: "export_pdf",
        patterns: [
            /(?:export|download|generate)\s+(?:the\s+)?pdf/i,
            /(?:create|make)\s+(?:the\s+)?(?:proposal\s+)?pdf/i,
        ],
        extractParams: () => ({}),
    },
    {
        type: "export_csv",
        patterns: [
            /(?:export|download)\s+(?:the\s+)?(?:audit\s+)?csv/i,
        ],
        extractParams: () => ({}),
    },
    {
        type: "find_product",
        patterns: [
            /(?:find|search|look\s+for|recommend)\s+(?:a\s+)?(?:product|display|led|module)/i,
            /what\s+(?:product|display|led)\s+(?:should|would|do)/i,
        ],
        extractParams: (_match, message) => ({ query: message }),
    },
    {
        type: "explain_pricing",
        patterns: [
            /(?:explain|how\s+does|what\s+is)\s+(?:the\s+)?(?:pricing|margin|divisor|formula|math)/i,
            /how\s+(?:is|are)\s+(?:the\s+)?(?:price|cost|total)\s+calculated/i,
        ],
        extractParams: () => ({}),
    },
];

// ============================================================================
// PARSER
// ============================================================================

/**
 * Parse a user message into a structured intent.
 */
export function parseIntent(message: string): ParsedIntent {
    const trimmed = message.trim();

    for (const { type, patterns, extractParams } of INTENT_PATTERNS) {
        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    type,
                    confidence: 0.85,
                    params: extractParams(match, trimmed),
                    originalMessage: trimmed,
                };
            }
        }
    }

    // Check if it's a question
    if (trimmed.endsWith("?") || /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does)/i.test(trimmed)) {
        return {
            type: "general_question",
            confidence: 0.6,
            params: { query: trimmed },
            originalMessage: trimmed,
        };
    }

    return {
        type: "unknown",
        confidence: 0,
        params: {},
        originalMessage: trimmed,
    };
}
