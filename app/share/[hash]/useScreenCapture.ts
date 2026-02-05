"use client";

import { useCallback } from "react";

export function useScreenCapture() {
  const captureArea = useCallback(
    async (
      containerEl: HTMLElement,
      pinXRatio: number,
      pinYRatio: number
    ): Promise<string | null> => {
      try {
        const html2canvas = (await import("html2canvas")).default;

        const rect = containerEl.getBoundingClientRect();
        const scrollTop = containerEl.scrollTop || 0;
        const scrollLeft = containerEl.scrollLeft || 0;

        const pinXPx = pinXRatio * containerEl.scrollWidth;
        const pinYPx = pinYRatio * containerEl.scrollHeight;

        // Capture a 600x400 region centered on pin
        const captureW = 600;
        const captureH = 400;
        const captureX = Math.max(0, pinXPx - captureW / 2);
        const captureY = Math.max(0, pinYPx - captureH / 2);

        const canvas = await html2canvas(containerEl, {
          x: captureX,
          y: captureY,
          width: captureW,
          height: captureH,
          scale: 1,
          useCORS: true,
          logging: false,
          windowWidth: containerEl.scrollWidth,
          windowHeight: containerEl.scrollHeight,
        });

        return canvas.toDataURL("image/jpeg", 0.6);
      } catch (err) {
        console.error("[useScreenCapture] Capture failed:", err);
        return null;
      }
    },
    []
  );

  return { captureArea };
}
