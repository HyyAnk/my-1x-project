import { createPortal } from "react-dom";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type BackgroundState = {
  element: HTMLElement;
  ariaHidden: string | null;
  inert: boolean;
};

export type AccessibleModalProps = {
  titleId: string;
  onDismiss: () => void;
  dismissalAllowed?: boolean;
  children: ReactNode;
};

function isolateBackground(modalBackdrop: HTMLElement): BackgroundState[] {
  const states = Array.from(document.body.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== modalBackdrop)
    .map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.hasAttribute("inert"),
    }));

  for (const { element } of states) {
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("inert", "");
  }
  return states;
}

function restoreBackground(states: BackgroundState[]): void {
  for (const { element, ariaHidden, inert } of states) {
    if (ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", ariaHidden);
    if (!inert) element.removeAttribute("inert");
  }
}

export function AccessibleModal({ titleId, onDismiss, dismissalAllowed = true, children }: AccessibleModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) return;
    const background = isolateBackground(backdrop);
    const initial = dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initial?.focus();
    return () => {
      restoreBackground(background);
      openerRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (dismissalAllowed) onDismiss();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div ref={backdropRef} className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="accessible-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
