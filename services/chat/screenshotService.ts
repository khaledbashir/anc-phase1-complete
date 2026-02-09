/**
 * Screenshot Capture Service — Client-Side Only
 *
 * Captures the current proposal viewport as a base64 JPEG image.
 * Used by the Kimi vision brain to "see" what the user sees.
 * Excludes the copilot panel itself from the capture.
 */

import html2canvas from "html2canvas";

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

    const canvas = await html2canvas(target as HTMLElement, {
        scale: 0.5, // half resolution — faster, smaller payload
        useCORS: true, // handle cross-origin images (logos etc)
        logging: false,
        backgroundColor: "#ffffff",
        // Exclude the copilot panel so it doesn't screenshot its own UI
        ignoreElements: (el: Element) => {
            return (
                el.closest("[data-copilot-panel]") !== null ||
                el.closest(".copilot-panel") !== null
            );
        },
    });

    // Convert to base64 JPEG (much smaller than PNG)
    return canvas.toDataURL("image/jpeg", 0.6);
}
