"use client";

import { useEffect, useRef } from "react";

/**
 * Full-page AnythingLLM chat embed.
 *
 * Loads the AnythingLLM embed widget, auto-opens it on load,
 * and uses CSS overrides to make it fill the entire page
 * instead of rendering as a floating bubble widget.
 *
 * Widget DOM structure (from anythingllm-embed source):
 *   #anything-llm-embed-chat-container  — full-screen overlay (visible when open)
 *     #anything-llm-chat                — chat window (has maxWidth/maxHeight/margin)
 *   #anything-llm-embed-chat-button-container — bubble button (hidden when open)
 *
 * All widget classes are prefixed with "allm-" to avoid conflicts.
 */
export default function ChatPage() {
    const scriptLoaded = useRef(false);

    useEffect(() => {
        if (scriptLoaded.current) return;
        scriptLoaded.current = true;

        const script = document.createElement("script");
        script.setAttribute("data-embed-id", "17077243-b4ec-458e-a61e-d64f6d5a6736");
        script.setAttribute("data-base-api-url", "https://basheer-anything-llm.prd42b.easypanel.host/api/embed");
        script.setAttribute("data-open-on-load", "on");
        script.setAttribute("data-position", "bottom-left");
        script.setAttribute("data-assistant-name", "ANC Intelligence");
        script.setAttribute("data-window-height", "100%");
        script.setAttribute("data-window-width", "100%");
        script.setAttribute("data-text-size", "14");
        script.setAttribute("data-no-sponsor", "true");
        script.setAttribute("data-button-color", "#0A52EF");
        script.setAttribute("data-user-bg-color", "#0A52EF");
        script.setAttribute("data-assistant-bg-color", "#262637");
        script.setAttribute("data-greeting", "Describe your project. I'll run the full estimator questionnaire, generate pricing, and help you build proposals.");
        script.setAttribute("data-default-messages", "New client Indiana Fever 20x12 scoreboard at 4mm,Outdoor 40x15 LED for high school stadium,Quick ROM for 50x20 concert backdrop at 3.9mm");
        script.setAttribute("data-send-message-text", "Describe your project or ask a question...");
        script.src = "https://basheer-anything-llm.prd42b.easypanel.host/embed/anythingllm-chat-widget.min.js";

        document.body.appendChild(script);

        return () => {
            try {
                script.remove();
                // Remove widget-injected elements
                document.getElementById("anything-llm-embed-chat-container")?.remove();
                document.getElementById("anything-llm-embed-chat-button-container")?.remove();
                document.getElementById("anything-llm-chat")?.remove();
                // Remove the root the widget creates
                document.querySelectorAll("[id*='anything-llm']").forEach((el) => el.remove());
            } catch { /* ignore */ }
        };
    }, []);

    return (
        <>
            <style>{`
                /* ── Make AnythingLLM embed fill the entire chat area ── */

                /* The overlay container — fill the page */
                #anything-llm-embed-chat-container {
                    position: absolute !important;
                    inset: 0 !important;
                    z-index: 10 !important;
                }

                /* The chat window — remove max-width/height, margins, rounded corners */
                #anything-llm-chat {
                    max-width: 100% !important;
                    max-height: 100% !important;
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border-radius: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    inset: 0 !important;
                }

                /* Hide the bubble button entirely (it's conditionally rendered but just in case) */
                #anything-llm-embed-chat-button-container {
                    display: none !important;
                }
            `}</style>
            <div className="relative w-full h-screen overflow-hidden bg-[#1e1e2e]" />
        </>
    );
}
