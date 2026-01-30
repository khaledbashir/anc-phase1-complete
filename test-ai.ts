
import { queryVault } from "./lib/anything-llm";

// Manually set for test since tsx doesn't load .env
process.env.ANYTHING_LLM_URL = "https://basheer-anything-llm.c9tnyg.easypanel.host/api/v1";
process.env.ANYTHING_LLM_KEY = "KPFXD2Q-YE3MKYY-JHVDTJ9-PTJ5ZNQ";

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
