import type { MascotActionType } from "@studio/shared";

/**
 * Generates an ultra-crisp procedural SVG fallback converted to PNG-like SVG data
 */
export function generateProceduralMascotArt(
  name: string,
  color: string,
  _state?: string,
  options?: { greenScreen?: boolean },
): Uint8Array {
  const primaryColor = color || "#06b6d4";
  const bgRect = options?.greenScreen
    ? '<rect width="512" height="512" fill="#00FF00"/>'
    : '<rect width="512" height="512" rx="64" fill="none"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  ${bgRect}
  <ellipse cx="256" cy="460" rx="140" ry="24" fill="rgba(0,0,0,0.15)"/>
  <g filter="url(#shadow)">
    <!-- Ears -->
    <circle cx="160" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="160" cy="140" r="28" fill="#fbcfe8"/>
    <circle cx="352" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="352" cy="140" r="28" fill="#fbcfe8"/>
    
    <!-- Body -->
    <ellipse cx="256" cy="330" rx="130" ry="115" fill="url(#bodyGrad)"/>
    <ellipse cx="256" cy="345" rx="80" ry="70" fill="#ffffff" opacity="0.9"/>
    
    <!-- Head -->
    <circle cx="256" cy="220" r="115" fill="url(#bodyGrad)"/>
    
    <!-- Cheeks -->
    <circle cx="185" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    <circle cx="327" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    
    <!-- Eyes -->
    <ellipse cx="205" cy="210" rx="16" ry="22" fill="#0f172a"/>
    <circle cx="211" cy="202" r="7" fill="#ffffff"/>
    <circle cx="202" cy="218" r="3" fill="#ffffff"/>
    
    <ellipse cx="307" cy="210" rx="16" ry="22" fill="#0f172a"/>
    <circle cx="313" cy="202" r="7" fill="#ffffff"/>
    <circle cx="304" cy="218" r="3" fill="#ffffff"/>
    
    <!-- Nose & Mouth -->
    <ellipse cx="256" cy="238" rx="10" ry="7" fill="#0f172a"/>
    <path d="M 244 248 Q 256 262 268 248" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
    
    <!-- Star Badge / Charm -->
    <path d="M 256 310 L 264 326 L 282 328 L 268 340 L 272 358 L 256 348 L 240 358 L 244 340 L 230 328 L 248 326 Z" fill="#fbbf24"/>
  </g>
  <text x="256" y="475" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="24" fill="#334155">${name.slice(0, 16)}</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

export interface ProceduralArtOptions {
  composition?: "full_body" | "half_body_16_9";
  greenScreen?: boolean;
}

/**
 * Generates a 16:9 large half-body procedural source artwork for Step 2.
 * Canvas is 1280x720, centered neutral placement, lower body continuing beyond bottom edge,
 * head/ears/hands inside safe margins, chroma key green background (#00FF00), no floor or pedestal.
 */
export function generateProceduralSourceArt(name: string, color: string, state: "thinking" | "celebrate"): Uint8Array {
  return generateProceduralStateArt(name, color, state, 1, { composition: "half_body_16_9" });
}

/**
 * Generates an expressive procedural SVG state artwork for quiz stages
 */
export function generateProceduralStateArt(
  name: string,
  color: string,
  action: MascotActionType,
  _framesCount: number = 1,
  options?: ProceduralArtOptions,
): Uint8Array {
  const primaryColor = color || "#06b6d4";
  const isHalfBody16x9 = options?.composition === "half_body_16_9";

  if (isHalfBody16x9) {
    // 16:9 Canvas (1280x720) with large half-body composition centered at cx=640,
    // positioned in lower-middle frame with top 1/3 (~240px) headroom for animation jump safety
    let armLeft = `<ellipse cx="440" cy="580" rx="48" ry="32" fill="${primaryColor}"/>`;
    let armRight = `<ellipse cx="840" cy="580" rx="48" ry="32" fill="${primaryColor}"/>`;
    let mouth = `<path d="M 610 470 Q 640 500 670 470" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>`;
    let eyeLeft = `<ellipse cx="560" cy="410" rx="24" ry="32" fill="#0f172a"/><circle cx="570" cy="398" r="10" fill="#ffffff"/><circle cx="556" cy="422" r="5" fill="#ffffff"/>`;
    const eyeRight = `<ellipse cx="720" cy="410" rx="24" ry="32" fill="#0f172a"/><circle cx="730" cy="398" r="10" fill="#ffffff"/><circle cx="716" cy="422" r="5" fill="#ffffff"/>`;
    let extraDecor = "";

    if (action === "thinking") {
      armRight = `<g transform="translate(730, 500) rotate(-70)"><ellipse cx="0" cy="0" rx="60" ry="28" fill="${primaryColor}"/></g>`;
      eyeLeft = `<ellipse cx="560" cy="400" rx="24" ry="26" fill="#0f172a"/><circle cx="568" cy="390" r="9" fill="#ffffff"/>`;
      extraDecor = `<text x="790" y="270" font-size="56">❓</text>`;
    } else if (action === "celebrate") {
      armLeft = `<g transform="translate(420, 440) rotate(-45)"><ellipse cx="0" cy="0" rx="64" ry="30" fill="${primaryColor}"/></g>`;
      armRight = `<g transform="translate(860, 440) rotate(45)"><ellipse cx="0" cy="0" rx="64" ry="30" fill="${primaryColor}"/></g>`;
      mouth = `<path d="M 600 455 Q 640 515 680 455 Z" fill="#e11d48"/>`;
    }

    const svg16x9 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bodyGrad169_${action}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="shadow169_${action}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>
  <!-- Flat chroma key green studio backdrop for effortless matting -->
  <rect width="1280" height="720" fill="#00FF00"/>
  <g filter="url(#shadow169_${action})">
    <!-- Ears safely within top margins with 1/3 headroom (y >= 240) -->
    <circle cx="510" cy="300" r="60" fill="${primaryColor}"/>
    <circle cx="510" cy="300" r="36" fill="#fbcfe8"/>
    <circle cx="770" cy="300" r="60" fill="${primaryColor}"/>
    <circle cx="770" cy="300" r="36" fill="#fbcfe8"/>

    <!-- Large Lower Torso continuing beyond bottom edge (cy=680, rx=240, ry=210, extends to y=890) -->
    <ellipse cx="640" cy="680" rx="240" ry="210" fill="url(#bodyGrad169_${action})"/>
    <ellipse cx="640" cy="700" rx="150" ry="120" fill="#ffffff" opacity="0.9"/>

    <!-- Arms -->
    ${armLeft}
    ${armRight}

    <!-- Large Head centered at cx=640, cy=430 -->
    <circle cx="640" cy="430" r="165" fill="url(#bodyGrad169_${action})"/>

    <!-- Cheeks -->
    <circle cx="530" cy="470" r="26" fill="#f43f5e" opacity="0.5"/>
    <circle cx="750" cy="470" r="26" fill="#f43f5e" opacity="0.5"/>

    <!-- Eyes -->
    ${eyeLeft}
    ${eyeRight}

    <!-- Nose & Mouth -->
    <ellipse cx="640" cy="450" rx="16" ry="11" fill="#0f172a"/>
    ${mouth}

    <!-- Star Badge / Charm -->
    <path d="M 640 565 L 652 589 L 678 592 L 658 610 L 664 636 L 640 622 L 616 636 L 622 610 L 602 592 L 628 589 Z" fill="#fbbf24"/>
    ${extraDecor}
  </g>
</svg>`;
    return Buffer.from(svg16x9, "utf8");
  }

  let armLeft = `<ellipse cx="140" cy="330" rx="26" ry="18" fill="${primaryColor}"/>`;
  let armRight = `<ellipse cx="372" cy="330" rx="26" ry="18" fill="${primaryColor}"/>`;
  let mouth = `<path d="M 238 250 Q 256 266 274 250" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
  let eyeLeft = `<ellipse cx="205" cy="210" rx="16" ry="22" fill="#0f172a"/><circle cx="211" cy="202" r="7" fill="#ffffff"/><circle cx="202" cy="218" r="3" fill="#ffffff"/>`;
  let eyeRight = `<ellipse cx="307" cy="210" rx="16" ry="22" fill="#0f172a"/><circle cx="313" cy="202" r="7" fill="#ffffff"/><circle cx="304" cy="218" r="3" fill="#ffffff"/>`;
  let extraDecor = "";

  if (action === "wave" || action === "outro") {
    armRight = `<g transform="translate(372, 230) rotate(-45)"><ellipse cx="0" cy="0" rx="34" ry="18" fill="${primaryColor}"/><circle cx="24" cy="0" r="10" fill="#fbcfe8"/></g>`;
    mouth = `<path d="M 234 246 Q 256 274 278 246 Z" fill="#f43f5e" stroke="#0f172a" stroke-width="4"/>`;
    extraDecor = `<text x="420" y="190" font-size="36" fill="#fbbf24">✨</text>`;
  } else if (action === "thinking") {
    armRight = `<g transform="translate(310, 260) rotate(-75)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    eyeLeft = `<ellipse cx="205" cy="204" rx="16" ry="18" fill="#0f172a"/><circle cx="209" cy="198" r="6" fill="#ffffff"/>`;
    eyeRight = `<ellipse cx="307" cy="204" rx="16" ry="18" fill="#0f172a"/><circle cx="311" cy="198" r="6" fill="#ffffff"/>`;
    mouth = `<path d="M 242 254 Q 256 248 270 254" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="360" y="140" font-size="44" font-weight="bold" fill="#fbbf24">❓</text>`;
  } else if (action === "celebrate") {
    armLeft = `<g transform="translate(130, 220) rotate(50)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    armRight = `<g transform="translate(382, 220) rotate(-50)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    eyeLeft = `<path d="M 190 216 Q 206 194 222 216" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>`;
    eyeRight = `<path d="M 292 216 Q 308 194 324 216" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>`;
    mouth = `<path d="M 230 244 Q 256 280 282 244 Z" fill="#f43f5e" stroke="#0f172a" stroke-width="4"/>`;
  } else if (action === "oops") {
    armLeft = `<g transform="translate(170, 160) rotate(110)"><ellipse cx="0" cy="0" rx="36" ry="18" fill="${primaryColor}"/></g>`;
    mouth = `<path d="M 240 258 Q 256 242 272 258" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="350" y="150" font-size="40">💧</text>`;
  } else if (action === "point") {
    armRight = `<g transform="translate(380, 270) rotate(-10)"><ellipse cx="20" cy="0" rx="42" ry="16" fill="${primaryColor}"/><rect x="54" y="-4" width="28" height="8" rx="4" fill="#fbbf24"/></g>`;
    mouth = `<path d="M 240 248 Q 256 268 272 248" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    extraDecor = `<text x="430" y="275" font-size="32">👉</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bodyGrad_${action}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="shadow_${action}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  ${options?.greenScreen ? '<rect width="512" height="512" fill="#00FF00"/>' : '<rect width="512" height="512" rx="64" fill="none"/>'}
  <ellipse cx="256" cy="460" rx="140" ry="24" fill="rgba(0,0,0,0.15)"/>
  <g filter="url(#shadow_${action})">
    <!-- Ears -->
    <circle cx="160" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="160" cy="140" r="28" fill="#fbcfe8"/>
    <circle cx="352" cy="140" r="48" fill="${primaryColor}"/>
    <circle cx="352" cy="140" r="28" fill="#fbcfe8"/>
    
    <!-- Body -->
    <ellipse cx="256" cy="330" rx="130" ry="115" fill="url(#bodyGrad_${action})"/>
    <ellipse cx="256" cy="345" rx="80" ry="70" fill="#ffffff" opacity="0.9"/>
    
    <!-- Arms -->
    ${armLeft}
    ${armRight}
    
    <!-- Head -->
    <circle cx="256" cy="220" r="115" fill="url(#bodyGrad_${action})"/>
    
    <!-- Cheeks -->
    <circle cx="185" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    <circle cx="327" cy="250" r="16" fill="#f43f5e" opacity="0.5"/>
    
    <!-- Eyes -->
    ${eyeLeft}
    ${eyeRight}
    
    <!-- Nose & Mouth -->
    <ellipse cx="256" cy="238" rx="10" ry="7" fill="#0f172a"/>
    ${mouth}
    
    <!-- Star Badge / Charm -->
    <path d="M 256 310 L 264 326 L 282 328 L 268 340 L 272 358 L 256 348 L 240 358 L 244 340 L 230 328 L 248 326 Z" fill="#fbbf24"/>
    ${extraDecor}
  </g>
</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * @deprecated Test/legacy fallback only. V2 authoring does not generate sprite
 * strips; keep this helper so old fixtures and imported manifests remain readable.
 */
export function generateProceduralSpriteStrip(name: string, color: string, action: MascotActionType, framesCount: number): Uint8Array {
  const frameWidth = 256;
  const frameHeight = 256;
  const totalWidth = frameWidth * framesCount;
  const primaryColor = color || "#06b6d4";

  const framesSvg: string[] = [];

  for (let i = 0; i < framesCount; i++) {
    const offsetX = i * frameWidth;
    const progress = i / (framesCount - 1 || 1);

    let bounceY = 0;
    let armAngle = 0;
    let eyeScale = 1;

    if (action === "wave") {
      armAngle = Math.sin(progress * Math.PI * 2) * 35;
      bounceY = Math.abs(Math.sin(progress * Math.PI)) * -10;
    } else if (action === "thinking") {
      armAngle = -20 + progress * 10;
      bounceY = Math.sin(progress * Math.PI) * 4;
    } else if (action === "celebrate") {
      bounceY = -Math.abs(Math.sin(progress * Math.PI * 2)) * 25;
      armAngle = 45;
      eyeScale = 1.2;
    } else if (action === "idle") {
      bounceY = Math.sin(progress * Math.PI * 2) * 4;
    }

    framesSvg.push(`
      <g transform="translate(${offsetX}, ${bounceY})">
        <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" fill="none"/>
        <ellipse cx="128" cy="225" rx="60" ry="10" fill="rgba(0,0,0,0.12)"/>
        
        <circle cx="85" cy="75" r="24" fill="${primaryColor}"/>
        <circle cx="171" cy="75" r="24" fill="${primaryColor}"/>
        
        <ellipse cx="128" cy="170" rx="65" ry="55" fill="${primaryColor}"/>
        <ellipse cx="128" cy="180" rx="40" ry="35" fill="#ffffff" opacity="0.9"/>
        
        <circle cx="128" cy="115" r="58" fill="${primaryColor}"/>
        <circle cx="95" cy="128" r="8" fill="#f43f5e" opacity="0.5"/>
        <circle cx="161" cy="128" r="8" fill="#f43f5e" opacity="0.5"/>
        
        <ellipse cx="105" cy="110" rx="8" ry="${11 * eyeScale}" fill="#0f172a"/>
        <circle cx="108" cy="106" r="3.5" fill="#ffffff"/>
        <ellipse cx="151" cy="110" rx="8" ry="${11 * eyeScale}" fill="#0f172a"/>
        <circle cx="154" cy="106" r="3.5" fill="#ffffff"/>
        
        <g transform="translate(180, 160) rotate(${armAngle})">
          <ellipse cx="15" cy="0" rx="18" ry="10" fill="${primaryColor}"/>
        </g>
        <g transform="translate(76, 160) rotate(${-armAngle / 2})">
          <ellipse cx="-15" cy="0" rx="18" ry="10" fill="${primaryColor}"/>
        </g>
        
        <circle cx="128" cy="124" r="4" fill="#0f172a"/>
        <path d="M 122 130 Q 128 136 134 130" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
        
        <text x="128" y="248" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#64748b">F${i + 1}</text>
      </g>
    `);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${frameHeight}" width="${totalWidth}" height="${frameHeight}">
    <rect width="${totalWidth}" height="${frameHeight}" fill="none"/>
    ${framesSvg.join("")}
  </svg>`;

  return Buffer.from(svg, "utf8");
}
