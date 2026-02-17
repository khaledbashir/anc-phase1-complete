import * as THREE from "three";

/**
 * Generate a canvas texture with client name text, LED grid overlay, and ANC branding.
 */
export function makeTextTexture(text: string, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030812"); grad.addColorStop(1, "#0a1628");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // Subtle LED pixel grid
  ctx.strokeStyle = "rgba(10,82,239,0.03)"; ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Main text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 72px 'Work Sans', sans-serif";
  ctx.fillStyle = "#0A52EF";
  ctx.shadowColor = "#0A52EF"; ctx.shadowBlur = 30;
  ctx.fillText(text || "ANC PARTNER", w / 2, h / 2 - 24);
  ctx.shadowBlur = 0;
  // Subtitle
  ctx.font = "300 24px 'Work Sans', sans-serif";
  ctx.fillStyle = "#03B8FF";
  ctx.fillText("PREMIUM LED DISPLAY", w / 2, h / 2 + 36);
  // Corner accents
  ctx.strokeStyle = "#0A52EF"; ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 60, 2); ctx.strokeRect(20, 20, 2, 40);
  ctx.strokeRect(w - 80, h - 22, 60, 2); ctx.strokeRect(w - 22, h - 60, 2, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Composite a logo image onto a dark canvas. Optionally uses screen blend mode
 * to remove white backgrounds.
 */
export function makeLogoTexture(img: HTMLImageElement, multiply: boolean, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#030812"; ctx.fillRect(0, 0, w, h);
  if (multiply) ctx.globalCompositeOperation = "screen";
  const scale = Math.min((w * 0.75) / img.width, (h * 0.75) / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Clone a texture and preserve RepeatWrapping + repeat vector from an old texture.
 * Used for ribbon/fascia zones that need tiled scrolling textures.
 */
export function cloneWithWrapping(
  newTex: THREE.CanvasTexture,
  repeatX: number,
  repeatY: number = 1
): THREE.CanvasTexture {
  const cloned = newTex.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.repeat.set(repeatX, repeatY);
  cloned.needsUpdate = true;
  return cloned;
}
