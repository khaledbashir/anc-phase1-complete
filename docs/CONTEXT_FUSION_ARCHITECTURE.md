# Context Fusion Architecture: Sidebar + Drafting Table

**Goal:** Create a "Living Context" where the Chatbot (Intelligence Sidebar) and the Form (Drafting Table) share the exact same state.

## 1. The "Single Source of Truth" (State Management)

We move the proposal state out of local React state and into a global **Zustand** store. This allows the Chatbot to "inject" values into the form without prop drilling.

### `stores/proposalStore.ts`
```typescript
import { create } from 'zustand';

interface ProposalState {
  data: ProposalData;
  // Field-level metadata for "Blue Glow"
  metadata: Record<string, { 
    isAiGenerated: boolean; 
    confidence: number; 
    source?: string;
  }>;
  
  updateField: (path: string, value: any, meta?: any) => void;
}

export const useProposalStore = create<ProposalState>((set) => ({
  data: initialData,
  metadata: {},
  updateField: (path, value, meta) => set((state) => ({
    data: { ...state.data, [path]: value },
    metadata: meta ? { ...state.metadata, [path]: meta } : state.metadata
  }))
}));
```

## 2. The Intelligence Sidebar (Vercel AI SDK)

The Chatbot is configured with **Tools** that have direct access to the Zustand store.

### `app/api/chat/route.ts`
```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: glm4v, // or your chosen model
    messages,
    tools: {
      updateProposalField: tool({
        description: 'Update a field in the proposal form based on user instruction or document extraction.',
        parameters: z.object({
          field: z.enum(['height', 'width', 'pitch', 'weight']),
          value: z.union([z.string(), z.number()]),
          confidence: z.number().optional(),
          reason: z.string().describe("Why this change was made")
        }),
        execute: async ({ field, value }) => {
          // This executes on SERVER, but we need to signal CLIENT.
          // Pattern: Return a structured result that the Client uses to update Store.
          return { success: true, field, value };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

### `components/IntelligenceSidebar.tsx`
```typescript
const { messages, append } = useChat({
  onToolCall: ({ toolCall }) => {
    if (toolCall.toolName === 'updateProposalField') {
      const { field, value, confidence } = toolCall.args;
      // DIRECT UPDATE TO ZUSTAND
      useProposalStore.getState().updateField(field, value, {
        isAiGenerated: true,
        confidence: confidence || 1.0
      });
    }
  }
});
```

## 3. The "Blue Glow" UI (Drafting Table)

The Input components subscribe to the metadata to show the glow.

### `components/ui/SmartInput.tsx`
```typescript
export function SmartInput({ name, ...props }) {
  const meta = useProposalStore(s => s.metadata[name]);
  
  // The "Blue Glow" Logic
  const hasGlow = meta?.isAiGenerated && meta?.confidence < 0.9;

  return (
    <div className={cn("relative transition-all", hasGlow && "shadow-[0_0_15px_rgba(59,130,246,0.5)] border-blue-400")}>
      <Input {...props} />
      {hasGlow && (
         <span className="absolute -top-2 right-2 text-xs bg-blue-600 text-white px-1 rounded">
           Verify ({Math.round(meta.confidence * 100)}%)
         </span>
      )}
    </div>
  );
}
```

## 4. The "Copy-Paste Killer" Workflow

1. **User** uploads a PDF (2,500 pages).
2. **System** (RAG) extracts "Section 11 06 60".
3. **User** asks: "Fill the display schedule from the PDF."
4. **Chatbot** calls `updateProposalField` for Height, Width, Pitch.
5. **Drafting Table** *instantly* populates.
6. **Blue Glow** appears on "17 tons" (Confidence 0.75).
7. **User** clicks the field, checks the source page, and confirms.
8. **Glow** vanishes.
