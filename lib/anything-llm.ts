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
 * Smart Assembly Agent: Retrieves verbatim scope blocks from legal brain
 */
export async function getScopeBlock(productType: string, isUnion: boolean): Promise<string> {
    const workspaceSlug = "anc-legal-brain";
    const prompt = `Retrieve the exact, verbatim installation scope of work text for a ${productType} display. 
  If isUnion is ${isUnion}, you MUST include the standard Union Labor jurisdiction clause. 
  Do NOT summarize. Return ONLY the verbatim text blocks as Legos.`;

    return queryVault(workspaceSlug, prompt, "query");
}
