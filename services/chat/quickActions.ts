/**
 * Quick Actions Bar — P68
 *
 * Context-aware action buttons that appear in the Copilot panel.
 * Different actions are shown depending on the current wizard step.
 */

export interface QuickAction {
    label: string;
    prompt: string;
    icon?: string; // optional icon hint
}

/**
 * Get quick actions for the current wizard step.
 */
export function getQuickActionsForStep(step: number, isMirrorMode: boolean): QuickAction[] {
    if (isMirrorMode) {
        return MIRROR_MODE_ACTIONS;
    }

    switch (step) {
        case 1:
            return STEP1_ACTIONS;
        case 2:
            return STEP2_ACTIONS;
        case 3:
            return STEP3_ACTIONS;
        case 4:
            return STEP4_ACTIONS;
        default:
            return GENERAL_ACTIONS;
    }
}

const STEP1_ACTIONS: QuickAction[] = [
    { label: "🏗️ Help me set up this project", prompt: "What information do I need to fill in for Step 1 to get started?" },
    { label: "📊 Should I upload Excel or start manually?", prompt: "What's the difference between uploading an Excel estimate vs starting manually?" },
    { label: "📋 What Excel format do you accept?", prompt: "What format should my Excel estimate be in for the parser to work correctly?" },
];

const STEP2_ACTIONS: QuickAction[] = [
    { label: "➕ Add a new screen", prompt: "Add a new screen" },
    { label: "🔍 Recommend a product for indoor lobby", prompt: "Recommend an LED product for a 15ft x 8ft indoor lobby display" },
    { label: "📐 Help me size a display", prompt: "How do I determine the right pixel pitch and dimensions for my display?" },
    { label: "🏷️ What document modes are available?", prompt: "Explain the difference between Budget, Proposal, and LOI document modes" },
];

const STEP3_ACTIONS: QuickAction[] = [
    { label: "📊 Set margin to 25%", prompt: "Set margin to 25%" },
    { label: "📊 Set margin to 35%", prompt: "Set margin to 35%" },
    { label: "💰 Explain the pricing formula", prompt: "Explain how the Natalia Divisor Model calculates the sell price from cost and margin" },
    { label: "📈 How competitive is my pricing?", prompt: "Based on the current margin and total, how competitive is this proposal?" },
];

const STEP4_ACTIONS: QuickAction[] = [
    { label: "📄 What export options do I have?", prompt: "What are all the export options available in Step 4?" },
    { label: "🔗 How does the share link work?", prompt: "How does the share link work and what does the client see?" },
    { label: "✅ Pre-export checklist", prompt: "Give me a checklist of things to verify before exporting the final PDF" },
];

const MIRROR_MODE_ACTIONS: QuickAction[] = [
    { label: "🪞 What is Mirror Mode?", prompt: "Explain what Mirror Mode does and how it differs from Intelligence Mode" },
    { label: "✏️ Can I edit line item descriptions?", prompt: "How do I fix typos in the pricing table descriptions from the Excel?" },
    { label: "🏷️ How do I mark alternates?", prompt: "How do I mark a line item as an alternate so it's excluded from the total?" },
];

const GENERAL_ACTIONS: QuickAction[] = [
    { label: "❓ What can you help with?", prompt: "What can you help me with in this proposal tool?" },
    { label: "🧮 Explain the math engine", prompt: "Explain how the ANC pricing math engine works" },
    { label: "📦 What products are in the catalog?", prompt: "What LED display products are available in the catalog?" },
];
