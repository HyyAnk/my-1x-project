import type { AnimationState } from "@studio/shared";

export type MascotStudioActivityKind = "style_concepts" | "expressive_states" | "animation_processing";
export type MascotStudioActivityStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";

export interface MascotStudioActivityItem {
  id: string;
  kind: MascotStudioActivityKind;
  status: MascotStudioActivityStatus;
  isActive: boolean;
  styleId?: string;
  styleName?: string;
  state?: AnimationState;
  slotIndex?: number;
  completed: number;
  failed: number;
  total: number;
  percentage: number;
  updatedAt: string;
}
