import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const POPOVER_WIDTH_PX = 280;
const VIEWPORT_MARGIN_PX = 12;

type CustomizationPopoverProps = {
  title: string;
  children: ReactNode;
};

export function CustomizationPopover({ title, children }: CustomizationPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [align, setAlign] = useState<"left" | "right">("left");

  useLayoutEffect(() => {
    const anchor = anchorRef.current?.parentElement;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const overflowsRight = rect.left + POPOVER_WIDTH_PX + VIEWPORT_MARGIN_PX > window.innerWidth;
    setAlign(overflowsRight ? "right" : "left");
  }, []);

  return (
    <div ref={anchorRef} className={`customization-popover ${align === "right" ? "is-right" : ""}`} role="listbox" aria-label={title}>
      <div className="customization-popover-list">{children}</div>
    </div>
  );
}
