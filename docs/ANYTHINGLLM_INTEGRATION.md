# AnythingLLM Integration Guide

This document provides everything needed to integrate AnythingLLM for RAG (Retrieval-Augmented Generation), including workspace management, document embedding, threads, and chat functionality.

---

## 1. Environment Variables

```env
# AnythingLLM Configuration
ANYTHING_LLM_URL=http://basheer_anything-llm:3001/api/v1
ANYTHING_LLM_KEY=your-api-key-here
ANYTHING_LLM_WORKSPACE=ancdashboard
ANYTHING_LLM_MASTER_WORKSPACE=dashboard-vault
ANYTHING_LLM_MASTER_CATALOG_URL=https://example.com/catalog.pdf
```

### URL Normalization
The URL is automatically normalized to include `/api/v1`:
```typescript
// lib/variables.ts
const rawUrl = (process.env.ANYTHING_LLM_URL || "").trim();
export const ANYTHING_LLM_BASE_URL = !rawUrl 
  ? "" 
  : rawUrl.endsWith("/api/v1") 
    ? rawUrl 
    : `${rawUrl.replace(/\/+$/, "")}/api/v1`;
export const ANYTHING_LLM_KEY = process.env.ANYTHING_LLM_KEY;
```

---

## 2. API Endpoints Reference

### Base URL Pattern
```
${ANYTHING_LLM_BASE_URL}/api/v1/...
```

### Authentication
All requests require Bearer token authentication:
```typescript
headers: {
  "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
  "Content-Type": "application/json"
}
```

### Endpoint Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workspace/new` | POST | Create new workspace |
| `/workspace/{slug}/chat` | POST | Send chat message |
| `/workspace/{slug}/stream-chat` | POST | Streaming chat |
| `/workspace/{slug}/update` | POST | Update workspace settings |
| `/workspace/{slug}/update-embeddings` | POST | Add documents to workspace |
| `/workspace/{slug}/update-pin` | POST | Pin/unpin documents |
| `/workspace/{slug}/vector-search` | POST | Vector similarity search |
| `/workspace/{slug}/documents` | GET | List workspace documents |
| `/workspace/{slug}/thread/new` | POST | Create new thread |
| `/workspace/{slug}/thread/{threadSlug}/chat` | POST | Chat in thread |
| `/workspace/{slug}/thread/{threadSlug}/stream-chat` | POST | Stream chat in thread |
| `/document/upload` | POST | Upload file document |
| `/document/upload-link` | POST | Upload URL/document link |
| `/system` | GET | Get system configuration |

---

## 3. Workspace Management

### Create Workspace
```typescript
async function createWorkspace(name: string, slug?: string, systemPrompt?: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/new`;
  
  const body = {
    name: name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    openAiPrompt: systemPrompt || `You are a helpful AI assistant.`,
    chatMode: "chat",
    topN: 4
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.workspace; // { id, name, slug, ... }
}
```

### Update Workspace Settings
```typescript
async function updateWorkspaceSettings(slug: string, settings: {
  openAiTemp?: number;
  openAiPrompt?: string;
  chatMode?: "chat" | "query";
  topN?: number;
}) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${slug}/update`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify(settings),
  });

  return res.json();
}
```

### Provision Project Workspace (Full Pattern)
```typescript
async function provisionProjectWorkspace(
  projectName: string,
  uniqueSuffix: string
): Promise<string | null> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    console.warn("AnythingLLM not configured");
    return null;
  }

  // Generate safe slug
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  const slugName = `${safeName}-${uniqueSuffix.slice(-6)}`;

  // Create workspace
  const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ 
      name: slugName, 
      chatMode: "chat" 
    }),
  });

  if (!res.ok) {
    console.error(`Workspace creation failed: ${await res.text()}`);
    return null;
  }

  const created = await res.json();
  const slug = created?.workspace?.slug || slugName;

  // Configure settings (non-blocking)
  updateWorkspaceSettings(slug, {
    openAiTemp: 0.2,
    chatMode: "chat",
  }).catch(console.error);

  return slug;
}
```

---

## 4. Document Upload & Embedding

### Upload File Document
```typescript
async function uploadDocument(
  file: Buffer | File,
  filename: string,
  options?: {
    folderName?: string;
    metadata?: Record<string, string>;
    addToWorkspaces?: string[];
  }
) {
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
  const endpoint = `${ANYTHING_LLM_BASE_URL}/document/upload${folderPart}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: formData,
  });

  return res.json();
}
```

### Upload Link/URL Document
```typescript
async function uploadLinkDocument(urlLink: string, workspaceSlug?: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/document/upload-link`;

  const body: any = { link: urlLink };
  if (workspaceSlug) {
    body.addToWorkspaces = workspaceSlug;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}
```

### Add Document to Workspace (Trigger Embedding)
```typescript
async function addToWorkspace(workspaceSlug: string, docPath: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/update-embeddings`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({
      adds: [docPath],  // Document path from upload
      deletes: [],
    }),
  });

  return res.json();
}
```

### Upload and Embed in One Step
```typescript
async function uploadLinkToWorkspace(workspace: string, urlLink: string) {
  // Step 1: Upload the link document
  const uploadEndpoint = `${ANYTHING_LLM_BASE_URL}/document/upload-link`;
  const uploadRes = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      link: urlLink, 
      addToWorkspaces: workspace 
    }),
  });

  const uploadResult = await uploadRes.json();

  // Step 2: Trigger embedding update
  if (uploadRes.ok && uploadResult) {
    const docPath = uploadResult?.document?.path || 
                    uploadResult?.path || 
                    uploadResult?.filename;

    const embedEndpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/update-embeddings`;
    await fetch(embedEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adds: [docPath], deletes: [] }),
    });
  }

  return uploadResult;
}
```

### Pin/Unpin Document
```typescript
async function updateDocumentPin(
  workspaceSlug: string, 
  docPath: string, 
  pinStatus: boolean
) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/update-pin`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({
      docPath,
      pinStatus,
    }),
  });

  return res.json();
}
```

---

## 5. Chat Operations

### Simple Chat
```typescript
async function chat(workspaceSlug: string, message: string, mode: "chat" | "query" = "chat") {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message, mode }),
  });

  const data = await res.json();
  return data.textResponse || data.text || "";
}
```

### Chat with Fallback Endpoints
```typescript
async function chatWithFallback(workspaceSlug: string, message: string) {
  const payload = JSON.stringify({ message, mode: "chat" });
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
  };

  // Primary endpoint
  const primary = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

  // Fallbacks for different versions
  const altBase = ANYTHING_LLM_BASE_URL.replace("/api/v1", "/v1");
  const fallbacks = [
    `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/stream-chat`,
    `${altBase}/workspace/${workspaceSlug}/chat`,
    `${altBase}/workspace/${workspaceSlug}/stream-chat`,
  ];

  // Try primary first
  let res = await fetch(primary, { method: "POST", headers, body: payload });
  
  // If failed, try fallbacks
  if (!res.ok) {
    for (const endpoint of fallbacks) {
      res = await fetch(endpoint, { method: "POST", headers, body: payload });
      if (res.ok) break;
    }
  }

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data.textResponse || data.text || "";
  } catch {
    return text;
  }
}
```

### Streaming Chat
```typescript
async function streamChat(workspaceSlug: string, message: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/stream-chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message, mode: "chat" }),
  });

  // Handle streaming response
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}
```

---

## 6. Thread Management

### Create Thread
```typescript
async function createThread(workspaceSlug: string, title?: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/thread/new`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ 
      title: title || `Thread - ${new Date().toISOString()}` 
    }),
  });

  const data = await res.json();
  return data.thread?.slug || data.slug;
}
```

### Chat in Thread
```typescript
async function chatInThread(
  workspaceSlug: string, 
  threadSlug: string, 
  message: string
) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/thread/${threadSlug}/chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message, mode: "chat" }),
  });

  return res.json();
}
```

### Stream Chat in Thread
```typescript
async function streamChatInThread(
  workspaceSlug: string, 
  threadSlug: string, 
  message: string
) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message, mode: "chat" }),
  });

  return res.body; // Returns ReadableStream
}
```

---

## 7. Vector Search

### Basic Vector Search
```typescript
async function vectorSearch(workspace: string, query: string) {
  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/vector-search`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      query, 
      topN: 6,              // Number of results
      scoreThreshold: 0.2   // Minimum similarity score
    }),
  });

  return res.json();
}
```

### Enhanced Vector Search with Keyword Boosting
```typescript
async function enhancedVectorSearch(workspace: string, query: string) {
  // High-priority keywords to boost search relevance
  const highPriorityKeywords = [
    "Section 11 06 60",      // Display Schedule
    "Display Schedule",
    "Section 11 63 10",      // LED Display Systems
    "Division 11",
    "LED Display",
    "Pixel Pitch",
    "Brightness",
  ];

  // Repeat keywords to boost weight
  const boostedQuery = `${query} ${highPriorityKeywords.join(' ')} ${highPriorityKeywords.slice(0, 3).join(' ')}`;

  return vectorSearch(workspace, boostedQuery);
}
```

---

## 8. System Configuration

### Get System LLM Config
```typescript
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

async function getSystemLLMConfig() {
  const res = await fetch(`${ANYTHING_LLM_BASE_URL}/system`, {
    headers: { 
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}` 
    },
  });

  const data = await res.json();
  const settings = data?.settings || data;

  const provider = settings.LLMProvider || "groq";
  const modelKey = PROVIDER_MODEL_KEYS[provider] || "LLMModel";
  const model = settings[modelKey] || settings.LLMModel || "";

  return { provider, model };
}
```

---

## 9. Agent Mode (Web Search + RAG)

### Query with @agent Mode
```typescript
async function queryAgent(workspaceSlug: string, message: string) {
  // Prefix with @agent to invoke agent mode (web search + RAG)
  const agentMessage = message.startsWith("@agent") 
    ? message 
    : `@agent ${message}`;

  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message: agentMessage, mode: "chat" }),
  });

  const data = await res.json();
  return data.textResponse || data.text || "";
}
```

---

## 10. Complete Service Class

```typescript
// services/AnythingLLMService.ts
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export class AnythingLLMService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = ANYTHING_LLM_BASE_URL!;
    this.apiKey = ANYTHING_LLM_KEY!;
  }

  private get headers() {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  // Workspace Operations
  async createWorkspace(name: string, systemPrompt?: string) {
    const res = await fetch(`${this.baseUrl}/workspace/new`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        name,
        openAiPrompt: systemPrompt || "You are a helpful AI assistant.",
        chatMode: "chat",
        topN: 4
      }),
    });
    const data = await res.json();
    return data.workspace;
  }

  async updateSystemPrompt(slug: string, prompt: string) {
    const res = await fetch(`${this.baseUrl}/workspace/${slug}/update`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ openAiPrompt: prompt }),
    });
    return res.json();
  }

  // Document Operations
  async uploadFile(file: Blob | File, fileName: string, workspaceSlug?: string) {
    const formData = new FormData();
    formData.append("file", file, fileName);
    if (workspaceSlug) {
      formData.append("addToWorkspaces", workspaceSlug);
    }

    const res = await fetch(`${this.baseUrl}/document/upload`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json"
      },
      body: formData
    });

    return res.json();
  }

  async uploadDocumentLink(slug: string, documentUrl: string) {
    const res = await fetch(`${this.baseUrl}/document/upload-link`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        link: documentUrl,
        addToWorkspaces: slug
      })
    });

    return res.json();
  }

  // Chat Operations
  async sendChat(slug: string, message: string, mode: "chat" | "query" = "chat") {
    const res = await fetch(`${this.baseUrl}/workspace/${slug}/chat`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ message, mode })
    });

    const data = await res.json();
    return data.textResponse || data.response || null;
  }

  // Thread Operations
  async createThread(slug: string, title: string) {
    const res = await fetch(`${this.baseUrl}/workspace/${slug}/thread/new`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ title })
    });
    return res.json();
  }

  // Search Operations
  async vectorSearch(slug: string, query: string, topN = 6) {
    const res = await fetch(`${this.baseUrl}/workspace/${slug}/vector-search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, topN, scoreThreshold: 0.2 })
    });
    return res.json();
  }
}

export const anythingLLMService = new AnythingLLMService();
```

---

## 11. Next.js API Route Examples

### Chat Endpoint
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function POST(req: NextRequest) {
  const { message, workspace, threadSlug } = await req.json();

  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 500 });
  }

  const workspaceSlug = workspace || process.env.ANYTHING_LLM_WORKSPACE || "default";

  // Build endpoint based on thread presence
  const endpoint = threadSlug
    ? `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/thread/${threadSlug}/chat`
    : `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({ message, mode: "chat" }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
```

### Upload & Embed Endpoint
```typescript
// app/api/embed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadDocument, addToWorkspace } from "@/lib/anything-llm";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const workspace = formData.get("workspace") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Upload document
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadDocument(buffer, file.name, {
    addToWorkspaces: [workspace]
  });

  if (!uploadResult.success) {
    return NextResponse.json({ error: uploadResult.message }, { status: 500 });
  }

  // Trigger embedding if docPath returned
  if (uploadResult.data?.document?.path) {
    await addToWorkspace(workspace, uploadResult.data.document.path);
  }

  return NextResponse.json({ success: true, upload: uploadResult.data });
}
```

---

## 12. Source Files Reference

| File | Purpose |
|------|---------|
| [`lib/variables.ts:40-43`](lib/variables.ts:40) | Environment config & URL normalization |
| [`lib/anything-llm.ts`](lib/anything-llm.ts) | Core API bridge (upload, chat, search) |
| [`lib/rag-sync.ts`](lib/rag-sync.ts) | Document sync & vector search |
| [`services/AnythingLLMService.ts`](services/AnythingLLMService.ts) | Service class wrapper |
| [`app/api/command/route.ts`](app/api/command/route.ts) | Chat command handler with threads |
| [`app/api/rfp/upload/route.ts`](app/api/rfp/upload/route.ts) | Document upload with workspace creation |
| [`app/api/copilot/chat/route.ts`](app/api/copilot/chat/route.ts) | Copilot chat integration |
| [`app/api/copilot/stream/route.ts`](app/api/copilot/stream/route.ts) | Streaming chat integration |

---

## 13. Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create workspace | `/workspace/new` | POST |
| Chat | `/workspace/{slug}/chat` | POST |
| Stream chat | `/workspace/{slug}/stream-chat` | POST |
| Create thread | `/workspace/{slug}/thread/new` | POST |
| Thread chat | `/workspace/{slug}/thread/{thread}/chat` | POST |
| Upload file | `/document/upload` | POST |
| Upload link | `/document/upload-link` | POST |
| Add to workspace | `/workspace/{slug}/update-embeddings` | POST |
| Vector search | `/workspace/{slug}/vector-search` | POST |
| Update settings | `/workspace/{slug}/update` | POST |
| System config | `/system` | GET |
