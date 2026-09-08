import { MascotPositionSection } from "./transform/MascotPositionSection";
import { MascotScaleSection } from "./transform/MascotScaleSection";
import { MascotOffsetSection } from "./transform/MascotOffsetSection";

export interface MascotTransformControlsProps {
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
  onResetDefaultPlacement?: () => void;
}

export function MascotTransformControls({
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
  onResetDefaultPlacement,
}: MascotTransformControlsProps) {
  return (
    <>
      <MascotPositionSection
        mascotPosition={mascotPosition}
        setMascotPosition={setMascotPosition}
        mascotFlipX={mascotFlipX}
        setMascotFlipX={setMascotFlipX}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <MascotScaleSection mascotScale={mascotScale} setMascotScale={setMascotScale} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <MascotOffsetSection
        mascotOffsetX={mascotOffsetX}
        setMascotOffsetX={setMascotOffsetX}
        mascotOffsetY={mascotOffsetY}
        setMascotOffsetY={setMascotOffsetY}
        onResetDefaultPlacement={onResetDefaultPlacement}
      />
    </>
  );
}
