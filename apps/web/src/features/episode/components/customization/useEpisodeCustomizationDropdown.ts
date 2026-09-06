import { useEffect, useState } from "react";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";

export type EpisodeCustomizationDropdownName =
  | "preset"
  | "questions"
  | "aspectRatio"
  | "visualStyle"
  | "mascotStyle"
  | "questionBox"
  | "answerCard"
  | "counterBadge"
  | "background"
  | "thinkingBar"
  | "palette"
  | "thumbnailRatio"
  | null;

export function useEpisodeCustomizationDropdown(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isPipelineRunning: boolean,
) {
  const [openDropdown, setOpenDropdown] = useState<EpisodeCustomizationDropdownName>(null);
  const [candidate, setCandidate] = useState<EpisodePreviewCandidate | null>(null);

  useEffect(() => {
    if (!openDropdown) setCandidate(null);
  }, [openDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const openPopover = containerRef.current?.querySelector(".customization-popover");
      if (!openPopover) {
        setOpenDropdown(null);
        return;
      }

      const activeDropdownContainer = openPopover.closest(".customization-dropdown-item");
      if (activeDropdownContainer && activeDropdownContainer.contains(target)) {
        return;
      }

      setOpenDropdown(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown, containerRef]);

  const toggleDropdown = (name: Exclude<EpisodeCustomizationDropdownName, null>) => {
    if (isPipelineRunning) return;
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  return {
    openDropdown,
    setOpenDropdown,
    candidate,
    setCandidate,
    toggleDropdown,
    closeDropdown,
  };
}
