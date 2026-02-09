/**
 * Copilot Router — Decides which brain handles each message.
 *
 * KIMI (vision brain): Sees the screen, executes field changes, handles UI commands.
 *   → Fast, free (Puter.js), client-side, vision-capable.
 *
 * ANYTHINGLLM (knowledge brain): Database queries, product lookups, RAG, web search.
 *   → Server-side, has access to embedded documents and project workspace.
 */

export type CopilotBrain = "kimi" | "anythingllm";

// Keywords/phrases that need AnythingLLM (database, RAG, deep knowledge)
const ANYTHINGLLM_TRIGGERS = [
    "product catalog",
    "products",
    "what led",
    "what displays",
    "find a product",
    "match a product",
    "product database",
    "search the database",
    "query",
    "sql",
    "project bible",
    "documentation",
    "past project",
    "previous proposal",
    "history",
    "address lookup",
    "look up address",
    "find address",
    "what do we know about",
    "company info",
    "web search",
    "search for",
    "google",
    "how many proposals",
    "pipeline",
    "dashboard stats",
    "@agent",
];

/**
 * Route a user message to the appropriate brain.
 * Default: Kimi (vision + actions). Only routes to AnythingLLM for knowledge queries.
 */
export function routeMessage(userMessage: string): CopilotBrain {
    const lower = userMessage.toLowerCase().trim();

    for (const trigger of ANYTHINGLLM_TRIGGERS) {
        if (lower.includes(trigger)) {
            return "anythingllm";
        }
    }

    // Everything else goes to Kimi (screen-aware, action-capable)
    return "kimi";
}
