import "dotenv/config";
import { queryVault } from "./lib/anything-llm";

// Load ANYTHING_LLM_URL and ANYTHING_LLM_KEY from .env (dotenv/config above).

async function test() {
    console.log("Testing AnythingLLM connection...");
    const workspace = "natalia";
    const prompt = "@agent search for the address of Apple Inc. Return JSON.";
    
    try {
        const response = await queryVault(workspace, prompt, "chat");
        console.log("Response:", response);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
