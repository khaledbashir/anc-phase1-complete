
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "./lib/variables";

async function checkWorkspaces() {
    console.log("Checking workspaces at:", ANYTHING_LLM_BASE_URL);
    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspaces`, {
            headers: {
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
        });
        
        if (!res.ok) {
            console.error("Failed to list workspaces:", res.status, res.statusText);
            const text = await res.text();
            console.error("Response body:", text);
            return;
        }
        
        const data = await res.json();
        console.log("Workspaces:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

checkWorkspaces();
