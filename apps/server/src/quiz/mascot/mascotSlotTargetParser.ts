import type { MascotActionType } from "@studio/shared";

export interface MascotStyleSlotTarget {
  /** Optional style identifier. If omitted, uses active_style_id or default/first style. */
  style_id?: string;
  styleId?: string;
  /** State to target ("thinking" | "celebrate") */
  state?: "thinking" | "celebrate";
  /** Slot index (1..10). If omitted, targets all filled slots in the specified state/style */
  slot_index?: number;
  slotIndex?: number;
}

export type MascotMattingTarget =
  | "master"
  | "all"
  | MascotActionType
  | MascotStyleSlotTarget
  | `style:${string}:${"thinking" | "celebrate"}:${number}`
  | `slot:${string}:${"thinking" | "celebrate"}:${number}`
  | `${string}:${"thinking" | "celebrate"}:${number}`;

export interface ParsedStyleSlotTarget {
  styleId?: string;
  state?: "thinking" | "celebrate";
  slotIndex?: number;
}

/**
 * Parses target into a structured style slot target if applicable
 */
export function parseStyleSlotTarget(target: unknown): ParsedStyleSlotTarget | null {
  if (!target) return null;

  if (typeof target === "object" && target !== null) {
    const obj = target as Record<string, unknown>;
    const rawState = typeof obj.state === "string" ? obj.state.toLowerCase() : undefined;
    const state = rawState === "thinking" || rawState === "celebrate" ? rawState : undefined;
    const rawSlot = obj.slot_index ?? obj.slotIndex;
    const slotIndex = typeof rawSlot === "number" ? rawSlot : typeof rawSlot === "string" ? parseInt(rawSlot, 10) : undefined;
    const styleId = (obj.style_id ?? obj.styleId) as string | undefined;

    if (state !== undefined || styleId !== undefined || (slotIndex !== undefined && !isNaN(slotIndex))) {
      return {
        styleId: styleId ? String(styleId) : undefined,
        state,
        slotIndex: slotIndex !== undefined && !isNaN(slotIndex) ? slotIndex : undefined,
      };
    }
    return null;
  }

  if (typeof target === "string") {
    const trimmed = target.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return parseStyleSlotTarget(parsed);
      } catch {
        // Not valid JSON, continue with regex parsing
      }
    }

    // Pattern 1: style:<styleId>:<state>:<slotIndex> or slot:<styleId>:<state>:<slotIndex> or <styleId>:<state>:<slotIndex>
    const matchFull = trimmed.match(/^(?:style|slot)?:?([^:]+):(thinking|celebrate):([0-9]+)$/i);
    if (matchFull) {
      return {
        styleId: matchFull[1],
        state: matchFull[2].toLowerCase() as "thinking" | "celebrate",
        slotIndex: parseInt(matchFull[3], 10),
      };
    }

    // Pattern 2: style:<state>:<slotIndex> or slot:<state>:<slotIndex> or <state>:<slotIndex>
    const matchShort = trimmed.match(/^(?:style|slot)?:?(thinking|celebrate):([0-9]+)$/i);
    if (matchShort) {
      return {
        state: matchShort[1].toLowerCase() as "thinking" | "celebrate",
        slotIndex: parseInt(matchShort[2], 10),
      };
    }

    // Pattern 3: style:<styleId>:(thinking|celebrate) or slot:<styleId>:(thinking|celebrate)
    const matchStyleState = trimmed.match(/^(?:style|slot):([^:]+):(thinking|celebrate)$/i);
    if (matchStyleState) {
      return {
        styleId: matchStyleState[1],
        state: matchStyleState[2].toLowerCase() as "thinking" | "celebrate",
      };
    }

    // Pattern 4: style:<styleId>
    const matchStyleOnly = trimmed.match(/^style:([^:]+)$/i);
    if (matchStyleOnly) {
      return {
        styleId: matchStyleOnly[1],
      };
    }

    // Pattern 5: slot:<slotIndex>
    const matchSlotOnly = trimmed.match(/^slot:([0-9]+)$/i);
    if (matchSlotOnly) {
      return {
        slotIndex: parseInt(matchSlotOnly[1], 10),
      };
    }
  }

  return null;
}
