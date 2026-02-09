import { z } from 'zod';

// ------------------------------------------------------------------
// Types & Schemas
// ------------------------------------------------------------------

export interface VisionModelConfig {
    apiKey: string;
    baseUrl?: string; // e.g. "https://open.bigmodel.cn/api/paas/v4/"
    modelName?: string; // e.g. "glm-4v"
}

export interface VisionRequest {
    imageUrl: string; // or base64
    prompt: string;
}

// Zod Schema for Architectural Label Extraction
export const ArchitecturalLabelSchema = z.object({
    labels: z.array(z.object({
        text: z.string().describe("The content of the label (e.g., 'A', 'AV', 'D1')"),
        type: z.enum(['display_id', 'elevation_marker', 'detail_ref', 'other']).describe("The type of architectural symbol"),
        confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
        boundingBox: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number()
        }).optional().describe("Normalized bounding box (0-100)")
    })),
    notes: z.string().optional().describe("Any specific notes found near the labels")
});

export type ArchitecturalLabelResult = z.infer<typeof ArchitecturalLabelSchema>;

// ------------------------------------------------------------------
// GLM-4V Client Implementation
// ------------------------------------------------------------------

export class Glm4VisionClient {
    private config: VisionModelConfig;

    constructor(config: VisionModelConfig) {
        this.config = config;
    }

    /**
     * Sends an image to GLM-4V and extracts structured data matching the Zod schema.
     * Note: GLM-4V native API might not support "JSON Mode" perfectly, so we prompt for JSON
     * and use a repair mechanism if needed.
     */
    async extractLabels(base64Image: string): Promise<ArchitecturalLabelResult> {
        let baseUrl = this.config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const endpoint = `${baseUrl}/chat/completions`;
        
        const payload = {
            model: this.config.modelName || "glm-4v",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this architectural drawing. Locate all display ID tags (usually in circles or hexagons, e.g., 'A', 'D1'). 
                                   Return a valid JSON object matching this structure:
                                   {
                                     "labels": [
                                       { "text": "A", "type": "display_id", "confidence": 0.95 }
                                     ],
                                     "notes": "..."
                                   }
                                   Do not include markdown formatting like \`\`\`json. Just return the raw JSON.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image // Ensure this is a valid data URI or URL
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1, // Low temperature for extraction tasks
            top_p: 0.7
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`GLM-4V API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || "{}";

            // Clean up content if it contains markdown code blocks
            const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(jsonString);
            return ArchitecturalLabelSchema.parse(parsed);
        } catch (parseError) {
            // Return safe default so pipeline does not fail; caller can still use text-only context
            const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
            console.warn("Vision Extraction parse/validation failed, returning empty labels:", errMsg);
            return { labels: [], notes: `Vision extraction failed: ${errMsg}` };
        }
    }

    /**
     * Describe a technical drawing in 2-3 sentences for RAG/search.
     * Used so drawing pages become searchable (e.g. "Where is AV-101?").
     * Returns plain text only — no JSON.
     */
    async describeForSearch(base64Image: string): Promise<string> {
        let baseUrl = this.config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const endpoint = `${baseUrl}/chat/completions`;
        const payload = {
            model: this.config.modelName || "glm-4v",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Describe this technical drawing in 2-4 short sentences for search. Look for sheet labels "AV" (Audio-Visual) or "A" (Architectural). Include: (1) type (elevation, plan, detail, section, structural attachment), (2) sheet number or label (e.g. AV-101, A-2), (3) display/location labels (A, B, D1, Center Hung, Ribbon), (4) any structural attachment or "connection of provider supplied equipment to project structure" details. Use plain text only, no JSON or markdown.`
                        },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                }
            ],
            temperature: 0.3,
            max_tokens: 300
        };
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`GLM-4V describeForSearch: ${response.status} ${err}`);
            }
            const data = await response.json();
            const text = (data.choices?.[0]?.message?.content ?? "").trim();
            return text || "(Drawing page — no description extracted)";
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            console.warn("Vision describeForSearch failed:", errMsg);
            return `(Drawing page — vision description unavailable: ${errMsg})`;
        }
    }
}
