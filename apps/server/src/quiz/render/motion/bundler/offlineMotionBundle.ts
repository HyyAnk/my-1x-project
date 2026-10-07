import { generateDeterministicMotionRuntimeScript } from "../deterministicMotionScript.js";
import { generateMotionCssVariables, type MotionThemeContext } from "./motionAssetIsolation.js";

export interface MotionBundleOptions {
  theme?: MotionThemeContext;
  includeSvgSymbols?: boolean;
  extraStyles?: string;
}

/**
 * Compiles a self-contained offline motion bundle including deterministic scripts,
 * local CSS rules, and embedded SVG definitions.
 */
export function buildOfflineMotionBundle(options: MotionBundleOptions = {}): {
  styles: string;
  script: string;
  svgDefs: string;
} {
  const cssVars = generateMotionCssVariables(options.theme);

  const styles = `
.motion-container {
  ${cssVars}
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--motion-bg);
  color: var(--motion-text);
  font-family: inherit;
  box-sizing: border-box;
}

.motion-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.motion-glow-fx {
  filter: drop-shadow(0 0 16px var(--motion-glow));
}
${options.extraStyles || ""}
`.trim();

  const script = generateDeterministicMotionRuntimeScript();

  const svgDefs = options.includeSvgSymbols !== false
    ? `
<svg style="display:none;" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="motion-blur-fx" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
    <linearGradient id="motion-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--motion-primary)" />
      <stop offset="100%" stop-color="var(--motion-accent)" />
    </linearGradient>
  </defs>
</svg>
`.trim()
    : "";

  return { styles, script, svgDefs };
}
