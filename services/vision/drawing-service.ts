import { Glm4VisionClient, ArchitecturalLabelResult } from './glm-client';

export interface ExtractionResult {
    field: string;
    value: string | number;
    confidence: number;
    needsVerification: boolean; // The "Blue Glow" trigger
    sourceCoordinates?: { x: number, y: number };
}

export class DrawingService {
    private visionClient: Glm4VisionClient;

    constructor(config?: { apiKey?: string; baseUrl?: string; modelName?: string }) {
        const apiKey = config?.apiKey || process.env.Z_AI_API_KEY || "";
        const baseUrl = config?.baseUrl || process.env.Z_AI_BASE_URL;
        const modelName = config?.modelName || process.env.Z_AI_MODEL_NAME || "glm-4v";

        if (!apiKey) {
            console.warn("DrawingService initialized without API Key. Vision features will fail.");
        }

        this.visionClient = new Glm4VisionClient({
            apiKey: apiKey,
            baseUrl: baseUrl,
            modelName: modelName
        });
    }

    /**
     * Main entry point: Process a drawing and return UI-ready data
     */
    async processDrawingPage(base64Image: string): Promise<ExtractionResult[]> {
        try {
            // 1. Call the Vision Model
            const rawResult: ArchitecturalLabelResult = await this.visionClient.extractLabels(base64Image);

            // 2. Transform into UI-ready "Blue Glow" objects
            const uiResults: ExtractionResult[] = rawResult.labels.map(label => {
                // The "17/20 Rule": High confidence (>0.8) is auto-filled.
                // Lower confidence triggers "Blue Glow" (needsVerification = true).
                const isConfident = label.confidence > 0.8;

                return {
                    field: "displayId", // This would map to your specific form field
                    value: label.text,
                    confidence: label.confidence,
                    needsVerification: !isConfident,
                    sourceCoordinates: label.boundingBox ? {
                        x: label.boundingBox.x,
                        y: label.boundingBox.y
                    } : undefined
                };
            });

            return uiResults;

        } catch (error) {
            console.error("Drawing processing failed:", error);
            // Fallback / Error handling
            return [];
        }
    }

    /**
     * Describe a drawing page in plain text for RAG embedding (OCR-style).
     * So "Where is AV-101?" can find the right page. Returns text to append to filtered content.
     */
    async describePageForSearch(base64Image: string, pageNumber: number): Promise<string> {
        try {
            const desc = await this.visionClient.describeForSearch(base64Image);
            return `Page ${pageNumber}: ${desc}`;
        } catch (e) {
            console.warn(`DrawingService describePageForSearch page ${pageNumber} failed:`, e);
            return `Page ${pageNumber}: (Drawing — description unavailable)`;
        }
    }
}
