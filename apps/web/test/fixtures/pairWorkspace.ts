import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntroOutroCategoryDetail } from "../../src/features/channel/components/introOutro/IntroOutroCategoryDetail";
import { introOutroApi } from "../../src/api/introOutroApi";
import type { IntroOutroStyle } from "@studio/shared";
import "../../src/styles.css";

function Preview() {
  const [open, setOpen] = useState(true);
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  if (!open) return createElement("button", { onClick: () => setOpen(true) }, "Open Style");
  return createElement(
    "main",
    { style: { padding: 20 } },
    createElement(IntroOutroCategoryDetail, {
      category: {
        style_preset_id: "preset_arcade_classic",
        name: "Arcade Classic",
        icon: "",
        total_count: styles.length,
        ready_count: styles.length,
      },
      styles,
      channelId: "channel",
      busyAction: null,
      onBack: () => setOpen(false),
      onUploaded: async () => {
        setStyles((await introOutroApi.listIntroOutroStyles("channel")).styles);
      },
      onPreview: () => undefined,
      onDelete: () => undefined,
      onAssignCategory: () => undefined,
    }),
  );
}
createRoot(document.getElementById("root")!).render(createElement(Preview));
