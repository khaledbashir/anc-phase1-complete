import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "./variables";

/**
 * AnythingLLM API Bridge
 * Handles direct communication with the AnythingLLM RAG backend.
 */

export interface AnythingLLMResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface UploadOptions {
    folderName?: string;
    metadata?: Record<string, string>;
    addToWorkspaces?: string[];
}

/**
 * Upload a document to AnythingLLM
 * @param file The file to upload (Buffer or File)
 * @param filename The name of the file
 * @param options Upload options (folder, metadata, auto-embed)
 */
export async function uploadDocument(
    file: Buffer | File,
    filename: string,
    options?: UploadOptions
): Promise<AnythingLLMResponse> {
    const formData = new FormData();

    if (file instanceof Buffer) {
        const blob = new Blob([new Uint8Array(file)]);
        formData.append("file", blob, filename);
    } else {
        formData.append("file", file);
    }

    if (options?.metadata) {
        formData.append("metadata", JSON.stringify(options.metadata));
    }

    if (options?.addToWorkspaces) {
        formData.append("addToWorkspaces", options.addToWorkspaces.join(","));
    }

    const folderPart = options?.folderName ? `/${options.folderName}` : "";

    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/document/upload${folderPart}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: formData,
        });

        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Add an uploaded document to a specific workspace and trigger embedding update
 * @param workspaceSlug The slug of the workspace
 * @param docPath The destination path returned from the upload (e.g. "custom-documents/filename.json")
 */
export async function addToWorkspace(workspaceSlug: string, docPath: string): Promise<AnythingLLMResponse> {
    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/update-embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                adds: [docPath],
            }),
        });

        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

/**
 * Update pin status for a document in a workspace
 * Pinned docs are included in context window (full access)
 * Non-pinned docs rely on RAG/vector search (saves tokens)
 * 
 * @param workspaceSlug The workspace slug
 * @param docPath The document path (e.g. "custom-documents/filename.json")
 * @param pinStatus true to pin, false to unpin
 */
export async function updatePin(
    workspaceSlug: string,
    docPath: string,
    pinStatus: boolean
): Promise<AnythingLLMResponse> {
    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/update-pin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                docPath,
                pinStatus,
            }),
        });

        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        console.error("[AnythingLLM] Update Pin failed:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Query the Knowledge Vault (Strict RAG)
 * @param workspaceSlug The workspace to query
 * @param message The prompt
 * @param mode "query" (Strict RAG) or "chat" (General)
 */
export async function queryVault(
    workspaceSlug: string,
    message: string,
    mode: "query" | "chat" = "query"
): Promise<string> {
    const payload = JSON.stringify({ message, mode });
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
    } as Record<string, string>;

    // Primary endpoint (most installs)
    const primary = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

    // Fallbacks used by some deployments and versions
    const altBase = ANYTHING_LLM_BASE_URL.replace("/api/v1", "/v1");
    const fallbacks = [
        `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/stream-chat`,
        `${altBase}/workspace/${workspaceSlug}/chat`,
        `${altBase}/workspace/${workspaceSlug}/stream-chat`,
    ];

    const tryEndpoint = async (endpoint: string) => {
        const res = await fetch(endpoint, { method: "POST", headers, body: payload });
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            return { ok: res.ok, data, text: undefined as string | undefined };
        } catch {
            return { ok: res.ok, data: undefined, text };
        }
    };

    try {
        let attempt = await tryEndpoint(primary);
        if (!attempt.ok || (attempt.data && attempt.data.type === "abort" && attempt.data.error)) {
            for (const ep of fallbacks) {
                attempt = await tryEndpoint(ep);
                if (attempt.ok && attempt.data && attempt.data.type !== "abort") break;
            }
        }

        if (attempt.data) {
            const d: any = attempt.data;
            return d.textResponse || d.text || "";
        }
        if (attempt.text) {
            return attempt.text;
        }
        throw new Error("No response from AnythingLLM");
    } catch (error: any) {
        console.error("queryVault failed:", error);
        return `Error retrieving data from ${workspaceSlug}: ${error.message}`;
    }
}

/**
 * Query with @agent mode (Web Search + RAG)
 * @param workspaceSlug The workspace to query
 * @param message The prompt (will be prefixed with @agent)
 */
export async function queryAgent(
    workspaceSlug: string,
    message: string
): Promise<string> {
    // Prefix with @agent to invoke agent mode
    const agentMessage = message.startsWith("@agent") ? message : `@agent ${message}`;
    const payload = JSON.stringify({ message: agentMessage, mode: "chat" });
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
    } as Record<string, string>;

    // Primary endpoint
    const primary = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

    // Fallbacks
    const altBase = ANYTHING_LLM_BASE_URL.replace("/api/v1", "/v1");
    const fallbacks = [
        `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/stream-chat`,
        `${altBase}/workspace/${workspaceSlug}/chat`,
        `${altBase}/workspace/${workspaceSlug}/stream-chat`,
    ];

    const tryEndpoint = async (endpoint: string) => {
        const res = await fetch(endpoint, { method: "POST", headers, body: payload });
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            return { ok: res.ok, data, text: undefined as string | undefined };
        } catch {
            return { ok: res.ok, data: undefined, text };
        }
    };

    try {
        let attempt = await tryEndpoint(primary);
        if (!attempt.ok || (attempt.data && attempt.data.type === "abort" && attempt.data.error)) {
            for (const ep of fallbacks) {
                attempt = await tryEndpoint(ep);
                if (attempt.ok && attempt.data && attempt.data.type !== "abort") break;
            }
        }

        if (attempt.data) {
            const d: any = attempt.data;
            return d.textResponse || d.text || "";
        }
        if (attempt.text) {
            return attempt.text;
        }
        throw new Error("No response from AnythingLLM Agent");
    } catch (error: any) {
        console.error("queryAgent failed:", error);
        return `Error retrieving data from agent: ${error.message}`;
    }
}

/**
 * Provider → model preference key mapping for AnythingLLM system settings.
 * When LLMProvider is "groq", the model is in "GroqModelPref", etc.
 */
const PROVIDER_MODEL_KEYS: Record<string, string> = {
    groq: "GroqModelPref",
    openai: "OpenAiModelPref",
    anthropic: "AnthropicModelPref",
    gemini: "GeminiLLMModelPref",
    openrouter: "OpenRouterModelPref",
    "generic-openai": "GenericOpenAiModelPref",
    ollama: "OllamaLLMModelPref",
    mistral: "MistralModelPref",
    deepseek: "DeepSeekModelPref",
    cohere: "CohereModelPref",
    togetherai: "TogetherAiModelPref",
    fireworksai: "FireworksAiLLMModelPref",
    perplexity: "PerplexityModelPref",
    lmstudio: "LMStudioModelPref",
    litellm: "LiteLLMModelPref",
};

/**
 * Query AnythingLLM system settings to get the current LLM provider and model.
 * Returns whatever is configured in the admin UI — zero hardcoding.
 * Falls back gracefully if the system endpoint is unreachable.
 */
export async function getSystemLLMConfig(): Promise<{
    provider: string;
    model: string;
}> {
    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/system`, {
            headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        });
        if (!res.ok) throw new Error(`System endpoint returned ${res.status}`);

        const data = await res.json();
        const settings = data?.settings || data;

        const provider = settings.LLMProvider || "groq";
        const modelKey = PROVIDER_MODEL_KEYS[provider] || "LLMModel";
        const model = settings[modelKey] || settings.LLMModel || "";

        console.log(`[AnythingLLM] System LLM config: provider=${provider}, model=${model}`);
        return { provider, model };
    } catch (error: any) {
        console.error("[AnythingLLM] Failed to fetch system LLM config:", error.message);
        // No fallback to hardcoded values — caller decides what to do
        return { provider: "", model: "" };
    }
}

/**
 * Update Workspace Settings (Automate Agent & LLM config)
 * @param slug The workspace slug
 * @param settings Settings object (chatModel, web_search, etc.)
 */
export async function updateWorkspaceSettings(slug: string, settings: any): Promise<AnythingLLMResponse> {
    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify(settings),
        });

        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        console.error("[AnythingLLM] Update Settings failed:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Client Review Annotator: AI Triage
 * Categorizes client feedback annotations into actionable categories.
 * Used by the share request API after batch annotation submission.
 */
export async function triageAnnotations(
    workspaceSlug: string,
    annotations: Array<{ id: string; transcript: string }>
): Promise<Array<{ id: string; category: string; confidence: number }>> {
    if (annotations.length === 0) return [];

    const annotationList = annotations
        .map((a, i) => `[${i + 1}] "${a.transcript}"`)
        .join("\n");

    const prompt = `You are a proposal review assistant for ANC Sports (LED display manufacturer). Categorize each client feedback item into exactly ONE category:
- pricing: About costs, prices, totals, discounts, or budget
- specs: About technical specifications, pixel pitch, dimensions, brightness
- design: About layout, appearance, naming, or visual presentation
- approval: Client confirming, agreeing, or approving something
- question: Client asking a question or requesting clarification
- other: Anything that doesn't fit above

Respond ONLY with a valid JSON array. Each element: { "index": <number>, "category": "<category>", "confidence": <0.0-1.0> }

Client feedback items:
${annotationList}`;

    const response = await queryVault(workspaceSlug, prompt, "chat");

    try {
        const jsonMatch = response.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
            return annotations.map((a) => ({ id: a.id, category: "other", confidence: 0 }));
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return annotations.map((a, i) => {
            const item = parsed.find((p: any) => p.index === i + 1);
            return {
                id: a.id,
                category: item?.category || "other",
                confidence: typeof item?.confidence === "number" ? item.confidence : 0,
            };
        });
    } catch {
        return annotations.map((a) => ({ id: a.id, category: "other", confidence: 0 }));
    }
}

/**
 * Smart Assembly Agent: Retrieves verbatim scope blocks from legal brain
 */
export async function getScopeBlock(productType: string, isUnion: boolean): Promise<string> {
    const workspaceSlug = "anc-legal-brain";
    const prompt = `Retrieve the exact, verbatim installation scope of work text for a ${productType} display. 
  If isUnion is ${isUnion}, you MUST include the standard Union Labor jurisdiction clause. 
  Do NOT summarize. Return ONLY the verbatim text blocks as Legos.`;

    return queryVault(workspaceSlug, prompt, "query");
}
