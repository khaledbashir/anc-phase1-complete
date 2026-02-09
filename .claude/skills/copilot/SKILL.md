# AI Copilot Skill

## Overview
The ANC Copilot is a slide-out AI chat panel integrated into the Proposal Engine. It helps users with pricing, product selection, proposal formatting, and project configuration via natural language.

## Architecture

### UI Layer
- **`app/components/chat/CopilotPanel.tsx`** — Slide-out panel with message list, input, quick actions
  - Props: `onSendMessage`, `quickActions`, `className`
  - Fixed bottom-right toggle button
  - Echo mode fallback when no AI service configured

### Service Layer
- **`services/chat/kimiService.ts`** — AI provider (Kimi K2.5 via Puter.js → AnythingLLM fallback)
- **`services/chat/intentParser.ts`** — Regex-based intent detection from user messages
- **`services/chat/actionExecutor.ts`** — Executes parsed intents against form state
- **`services/chat/contextBuilder.ts`** — Builds project context string for AI requests
- **`services/chat/quickActions.ts`** — Step-aware quick action buttons

### Data Layer
- `chatHistory Json?` field on `Proposal` model in Prisma schema
- Messages: `{ id, role, content, timestamp }`

## Intent Types
| Intent | Example | Action |
|--------|---------|--------|
| `set_margin` | "Set margin to 30%" | Updates all screens + recalculates |
| `set_bond_rate` | "Change bond to 2%" | Updates bond rate |
| `set_tax_rate` | "Set tax to 8%" | Updates tax rate override |
| `add_screen` | "Add a new screen" | Appends manual screen |
| `add_quote_item` | "Add a quote item" | Appends empty quote item |
| `export_pdf` | "Export the PDF" | Directs to Step 4 |
| `export_csv` | "Download audit CSV" | Directs to audit table |
| `find_product` | "Recommend a product" | Passes to AI for recommendation |
| `explain_pricing` | "How is price calculated?" | Passes to AI for explanation |
| `general_question` | Any question | Passes to AI with project context |

## Quick Actions Per Step
- **Step 1**: Project setup help, Excel vs manual, format guidance
- **Step 2**: Add screen, product recommendations, sizing help, document modes
- **Step 3**: Margin presets, pricing formula, competitiveness check
- **Step 4**: Export options, share link, pre-export checklist
- **Mirror Mode**: Mirror Mode explanation, typo editing, alternate tagging

## AI Provider Chain
1. **Kimi K2.5** via Puter.js (`puter.ai.chat` with model `moonshotai/kimi-k2.5`)
2. **AnythingLLM** fallback via workspace chat API
3. **Echo mode** if neither is available

## Context Building
Every AI request includes:
- Project name, client, document mode
- Mirror vs Intelligence mode
- Screen count + details (dims, pitch, margin)
- Global margin, bond rate, tax rate
- Audit summary (total cost, sell price, effective margin)
- Instructions for the AI persona

## Integration
To add the Copilot to a page:
```tsx
import CopilotPanel from "@/app/components/chat/CopilotPanel";
import { getQuickActionsForStep } from "@/services/chat/quickActions";

<CopilotPanel
  quickActions={getQuickActionsForStep(currentStep, isMirrorMode)}
  onSendMessage={async (msg, history) => {
    // Build context, parse intent, execute or send to AI
    return responseText;
  }}
/>
```
