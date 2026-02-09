/**
 * Screenshot Capture Service — Client-Side Only
 *
 * Captures the current proposal viewport as a base64 JPEG image.
 * Used by the Kimi vision brain to "see" what the user sees.
 * Excludes the copilot panel itself from the capture.
 */

import html2canvas from "html2canvas";

/**
 * html2canvas v1.x cannot parse modern CSS color functions like
 * color(display-p3 ...), oklch(), lab(), lch(), etc. that Tailwind CSS v4 emits.
 *
 * The error "Attempting to parse an unsupported color function 'color'" is thrown
 * from html2canvas's internal CSS color parser (color$1.parse) when it encounters
 * a function name not in SUPPORTED_COLOR_FUNCTIONS (rgb, rgba, hsl, hsla only).
 *
 * Strategy: In the onclone callback, we rewrite all CSS custom properties and
 * stylesheet rules in the cloned DOM to replace unsupported color functions with
 * safe hex/transparent fallbacks BEFORE html2canvas resolves computed styles.
 */
const UNSUPPORTED_COLOR_FN_RE = /\b(?:color|oklch|oklab|lab|lch|hwb)\([^)]*\)/gi;

function sanitizeClonedStyles(doc: Document) {
    // 0. Rewrite raw <style> tag text — catches everything before html2canvas tokenizes CSS.
    //    This is the most critical step because html2canvas parses stylesheet text directly.
    doc.querySelectorAll("style").forEach((styleEl) => {
        if (styleEl.textContent && UNSUPPORTED_COLOR_FN_RE.test(styleEl.textContent)) {
            styleEl.textContent = styleEl.textContent.replace(UNSUPPORTED_COLOR_FN_RE, "transparent");
        }
    });

    // 1. Patch all stylesheet rules via CSSOM (where accessible)
    try {
        for (const sheet of Array.from(doc.styleSheets)) {
            try {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    if (rule instanceof CSSStyleRule && UNSUPPORTED_COLOR_FN_RE.test(rule.cssText)) {
                        // Rewrite the entire rule text
                        const fixed = rule.cssText.replace(UNSUPPORTED_COLOR_FN_RE, "transparent");
                        sheet.deleteRule(i);
                        sheet.insertRule(fixed, i);
                    }
                }
            } catch {
                // Cross-origin stylesheets throw SecurityError — safe to skip
            }
        }
    } catch {
        // styleSheets access can throw in some environments
    }

    // 2. Patch inline styles on every element
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.style?.cssText) return;
        if (UNSUPPORTED_COLOR_FN_RE.test(htmlEl.style.cssText)) {
            htmlEl.style.cssText = htmlEl.style.cssText.replace(UNSUPPORTED_COLOR_FN_RE, "transparent");
        }
    });

    // 3. Bake computed color-related styles as inline hex values on every element.
    //    This prevents html2canvas from re-resolving CSS custom properties that
    //    contain unsupported color functions.
    const COLOR_PROPS = [
        "color", "backgroundColor", "borderColor",
        "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
        "outlineColor", "textDecorationColor", "caretColor",
    ];
    all.forEach((el) => {
        const htmlEl = el as HTMLElement;
        try {
            const computed = doc.defaultView?.getComputedStyle(htmlEl);
            if (!computed) return;
            for (const prop of COLOR_PROPS) {
                const val = computed.getPropertyValue(
                    prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
                );
                if (val && UNSUPPORTED_COLOR_FN_RE.test(val)) {
                    htmlEl.style.setProperty(
                        prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
                        "transparent",
                        "important"
                    );
                }
            }
        } catch {
            // getComputedStyle can fail on detached elements — skip
        }
    });
}

/**
 * Capture the main content area (excluding the copilot panel) as a base64 JPEG.
 * Returns a data:image/jpeg;base64,... string ready for vision API consumption.
 */
export async function captureScreen(): Promise<string> {
    // Find the main content container — try multiple selectors
    const target =
        document.querySelector("main") ||
        document.querySelector(".proposal-page") ||
        document.querySelector("#__next > div > main") ||
        document.body;

    try {
        const canvas = await html2canvas(target as HTMLElement, {
            scale: 1, // full resolution — Kimi needs readable text
            useCORS: true, // handle cross-origin images (logos etc)
            logging: false,
            backgroundColor: "#ffffff",
            // Sanitize the cloned DOM before html2canvas parses CSS
            onclone: (_doc: Document, _el: HTMLElement) => {
                sanitizeClonedStyles(_doc);
            },
            // Exclude the copilot panel so it doesn't screenshot its own UI
            ignoreElements: (el: Element) => {
                return (
                    el.closest("[data-copilot-panel]") !== null ||
                    el.closest(".copilot-panel") !== null
                );
            },
        });

        // Convert to base64 JPEG — 0.85 quality balances readability vs size
        return canvas.toDataURL("image/jpeg", 0.85);
    } catch (err) {
        console.warn("[Screenshot] html2canvas failed, falling back to empty capture:", err);
        // Return a minimal 1x1 white pixel so the vision model gets *something*
        // and the copilot degrades to text-only context instead of crashing.
        const fallback = document.createElement("canvas");
        fallback.width = 1;
        fallback.height = 1;
        const ctx = fallback.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 1, 1);
        }
        return fallback.toDataURL("image/jpeg", 0.85);
    }
}
