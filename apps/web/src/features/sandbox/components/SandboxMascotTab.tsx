import type { MascotActionType, MascotProfile } from "@studio/shared";
import { MascotPicker } from "./MascotPicker";
import { SandboxChannelBrandControl } from "./SandboxChannelBrandControl";
import { MascotActionSelector } from "./MascotActionSelector";
import { MascotTransformControls } from "./MascotTransformControls";

export interface SandboxMascotTabProps {
  mascots: MascotProfile[];
  mascotId: string;
  setMascotId: (id: string) => void;
  mascotEnabled: boolean;
  setMascotEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  channelBrandName: string;
  setChannelBrandName: (name: string) => void;
  mascotAction: MascotActionType;
  setMascotAction: (action: MascotActionType) => void;
  mascotPosition: "bottom_left" | "bottom_right";
  setMascotPosition: (pos: "bottom_left" | "bottom_right") => void;
  mascotScale: number;
  setMascotScale: (scale: number | ((prev: number) => number)) => void;
  mascotOffsetX: number;
  setMascotOffsetX: (offset: number | ((prev: number) => number)) => void;
  mascotOffsetY: number;
  setMascotOffsetY: (offset: number | ((prev: number) => number)) => void;
  mascotFlipX: boolean;
  setMascotFlipX: (flipped: boolean | ((prev: boolean) => boolean)) => void;
}

export function SandboxMascotTab({
  mascots,
  mascotId,
  setMascotId,
  mascotEnabled,
  setMascotEnabled,
  channelBrandName,
  setChannelBrandName,
  mascotAction,
  setMascotAction,
  mascotPosition,
  setMascotPosition,
  mascotScale,
  setMascotScale,
  mascotOffsetX,
  setMascotOffsetX,
  mascotOffsetY,
  setMascotOffsetY,
  mascotFlipX,
  setMascotFlipX,
}: SandboxMascotTabProps) {
  return (
    <>
      <MascotPicker
        mascots={mascots}
        mascotId={mascotId}
        setMascotId={setMascotId}
        mascotEnabled={mascotEnabled}
        setMascotEnabled={setMascotEnabled}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <SandboxChannelBrandControl channelBrandName={channelBrandName} setChannelBrandName={setChannelBrandName} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <MascotActionSelector mascotAction={mascotAction} setMascotAction={setMascotAction} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <MascotTransformControls
        mascotPosition={mascotPosition}
        setMascotPosition={setMascotPosition}
        mascotScale={mascotScale}
        setMascotScale={setMascotScale}
        mascotOffsetX={mascotOffsetX}
        setMascotOffsetX={setMascotOffsetX}
        mascotOffsetY={mascotOffsetY}
        setMascotOffsetY={setMascotOffsetY}
        mascotFlipX={mascotFlipX}
        setMascotFlipX={setMascotFlipX}
      />
    </>
  );
}
