import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

/**
 * AnythingLLM Service
 * 
 * Centralized service for managing AnythingLLM workspaces and documents.
 * Enforces strict project isolation via unique slugs.
 */
export class AnythingLLMService {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = ANYTHING_LLM_BASE_URL!;
        this.apiKey = ANYTHING_LLM_KEY!;

        // Ensure we are using the /api/v1 prefix if not present in the env var (though user said it is)
        // The user provided: http://basheer_anything-llm:3001/api/v1
        if (this.baseUrl && !this.baseUrl.endsWith('/api/v1')) {
            // Just a safe guard, but trusting the env var primarily.
        }
    }

    private get headers() {
        return {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    /**
     * Creates a new workspace for a project.
     * Sets the "System Prompt" immediately during creation.
     */
    async createWorkspace(projectName: string, systemPrompt?: string) {
        if (!this.baseUrl || !this.apiKey) {
            console.warn("AnythingLLM credentials missing, skipping workspace creation.");
            return null;
        }

        const endpoint = `${this.baseUrl}/workspace/new`;

        // Default ANC Persona if none provided
        const defaultPrompt = `You are an ANC Senior Estimator. 
    Key Rules:
    1. Bond Rate is always 1.5% of the Sell Price.
    2. Margin is calculated as Sell = Cost / (1 - Margin). 
    3. Never output NaN. Ask for clarification if data is missing.
    4. You are helpful, precise, and authoritative.`;

        const body = {
            name: projectName,
            openAiPrompt: systemPrompt || defaultPrompt,
            chatMode: "chat",
            topN: 4
        };

        console.log(`[AnythingLLM] Creating workspace '${projectName}'...`);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[AnythingLLM] Creation failed: ${res.status} ${errorText}`);
                throw new Error(`AnythingLLM Error: ${errorText}`);
            }

            const data = await res.json();
            // Returns { workspace: { id, name, slug, ... }, message: "..." }
            return data.workspace;
        } catch (err) {
            console.error("[AnythingLLM] Service Error:", err);
            throw err;
        }
    }

    /**
     * Uploads a document link to a specific workspace.
     */
    async uploadDocumentLink(slug: string, documentUrl: string) {
        if (!this.baseUrl || !this.apiKey) return null;

        const endpoint = `${this.baseUrl}/document/upload-link`;

        console.log(`[AnythingLLM] Uploading ${documentUrl} to workspace ${slug}...`);

        const body = {
            link: documentUrl,
            addToWorkspaces: slug, // Comma-separated or single slug
            metadata: {
                source: "Invoify Auto-Upload"
            }
        };

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.text();
                console.error(`[AnythingLLM] Upload failed: ${err}`);
                throw new Error(err);
            }

            return await res.json();
        } catch (err) {
            console.error("[AnythingLLM] Upload Error:", err);
            throw err;
        }
    }

    /**
     * Updates an existing workspace System Prompt.
     */
    async updateSystemPrompt(slug: string, newPrompt: string) {
        if (!this.baseUrl || !this.apiKey) return null;

        const endpoint = `${this.baseUrl}/workspace/${slug}/update`;

        const body = {
            openAiPrompt: newPrompt
        };

        const res = await fetch(endpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`Failed to update prompt: ${await res.text()}`);
        }

        return await res.json();
    }
}

export const anythingLLMService = new AnythingLLMService();
