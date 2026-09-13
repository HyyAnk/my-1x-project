import {
  ListDashes,
  ListNumbers,
  SquareSplitHorizontal,
  type IconProps,
} from "@phosphor-icons/react";
import type { QuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";

export interface SandboxLayoutIconProps extends IconProps {
  icon: QuizLayoutUiDefinition["icon"];
  size?: number;
}

export function SandboxLayoutIcon({ icon, size = 18, ...props }: SandboxLayoutIconProps) {
  switch (icon) {
    case "split":
      return <SquareSplitHorizontal size={size} {...props} />;
    case "visual":
      return <ListNumbers size={size} {...props} />;
    case "stack":
      return <ListDashes size={size} {...props} />;
    default:
      return <SquareSplitHorizontal size={size} {...props} />;
  }
}

export const LayoutIcon = SandboxLayoutIcon;
