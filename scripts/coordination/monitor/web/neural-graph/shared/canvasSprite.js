import * as THREE from "three";

/**
 * Draws a rounded (or square fallback) chip background on a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} bgColor
 * @param {string} strokeColor
 * @param {number} lineWidth
 * @param {{ x: number, y: number, w: number, h: number, r: number }} box
 */
function drawChipBackground(ctx, bgColor, strokeColor, lineWidth, box) {
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(box.x, box.y, box.w, box.h, box.r);
  } else {
    ctx.rect(box.x, box.y, box.w, box.h);
  }
  ctx.fill();
  ctx.stroke();
}

/**
 * Renders centered single-line text on a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {string} font
 * @param {string} fillStyle
 * @param {number} centerX
 * @param {number} centerY
 */
function drawCenteredText(ctx, text, font, fillStyle, centerX, centerY) {
  ctx.shadowBlur = 0;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, centerY);
}

/**
 * Creates a THREE.CanvasTexture-backed Sprite from an offscreen canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {THREE.Sprite}
 */
function canvasTextureSprite(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  return new THREE.Sprite(spriteMat);
}

/**
 * Builds the rounded-label chip sprite for a zone macro-node.
 * @param {string} text
 * @returns {THREE.Sprite}
 */
export function createLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");

  drawChipBackground(ctx, "rgba(7, 10, 19, 0.88)", "rgba(0, 240, 255, 0.5)", 3, { x: 8, y: 8, w: 368, h: 80, r: 16 });
  drawCenteredText(ctx, text, "bold 30px 'JetBrains Mono', monospace, sans-serif", "#ffffff", 192, 48);

  const sprite = canvasTextureSprite(canvas);
  sprite.scale.set(16, 4, 1);
  return sprite;
}

/**
 * Builds the floating agent-name hologram tag attached to a cyber drone.
 * @param {string} agentName
 * @param {{ labelBorder: string, labelText: string, labelBg: string } | null} theme
 * @returns {THREE.Sprite}
 */
export function createAgentLabelSprite(agentName, theme = null) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const strokeColor = theme?.labelBorder || "#00f7ff";
  const textColor = theme?.labelText || "#a5f3fc";
  const bgColor = theme?.labelBg || "rgba(10, 20, 40, 0.94)";

  drawChipBackground(ctx, bgColor, strokeColor, 3.0, { x: 4, y: 4, w: 248, h: 56, r: 14 });
  const displayName = agentName.length > 14 ? agentName.slice(0, 12) + "…" : agentName;
  drawCenteredText(ctx, `🤖 ${displayName}`, "bold 22px 'JetBrains Mono', monospace", textColor, 128, 32);

  const sprite = canvasTextureSprite(canvas);
  // Compact tag size that doesn't dwarf the drone model
  sprite.scale.set(4.5, 1.15, 1);
  return sprite;
}
