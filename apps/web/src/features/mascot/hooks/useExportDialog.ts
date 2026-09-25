import { useEffect, useRef } from "react";

export function useExportDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !node) return;
      const controls = [
        ...node.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), summary"),
      ].filter((element) => !element.closest("details:not([open])") || element.tagName === "SUMMARY");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    node?.showModal();
    node?.addEventListener("keydown", containFocus);
    return () => {
      node?.removeEventListener("keydown", containFocus);
      node?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return dialog;
}
