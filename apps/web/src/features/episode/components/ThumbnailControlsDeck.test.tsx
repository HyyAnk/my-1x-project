import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThumbnailManifestSchema } from "@studio/shared";
import { ThumbnailControlsDeck } from "./ThumbnailControlsDeck";

function setup(generating = false, hookText = "", composition?: string) {
  const onGenerateThumbnail = vi.fn();
  const setSelectedLayout = vi.fn();
  render(
    <ThumbnailControlsDeck
      selectedLayout="auto"
      setSelectedLayout={setSelectedLayout}
      selectedBadge="auto"
      setSelectedBadge={vi.fn()}
      customHook=""
      setCustomHook={vi.fn()}
      manifest={ThumbnailManifestSchema.parse({
        episode_id: "episode",
        layout: "mega_grid",
        design_template: "big_object",
        hook_text: hookText,
        composition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })}
      hasAnyThumbnail={false}
      generating={generating}
      loading={false}
      onGenerateThumbnail={onGenerateThumbnail}
      onResetDefaults={vi.fn()}
    />,
  );
  return { onGenerateThumbnail, setSelectedLayout };
}

describe("thumbnail controls", () => {
  afterEach(cleanup);
  it("exposes compact labelled controls before the first generation", () => {
    const { setSelectedLayout, onGenerateThumbnail } = setup();
    expect(screen.getByRole("combobox", { name: "Layout" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Badge" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Headline" })).toBeTruthy();
    expect(screen.getByText("Editorial / Big Object")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Layout" }), { target: { value: "split_vs" } });
    expect(setSelectedLayout).toHaveBeenCalledWith("split_vs");
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(onGenerateThumbnail).toHaveBeenCalledOnce();
  });
  it("announces pending state and blocks duplicate generation", () => {
    const { onGenerateThumbnail } = setup(true);
    const button = screen.getByRole("button", { name: "Generating thumbnail" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(onGenerateThumbnail).not.toHaveBeenCalled();
  });
  it("shows the current headline as a hint without filling the manual headline", () => {
    setup(false, "WHO RIDES CATS?");
    const input = screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("Auto (current: WHO RIDES CATS?)");
  });
  it("names the composition of the active editorial thumbnail", () => {
    setup(false, "", "mascot_right");
    expect(screen.getByText("Editorial / Big Object · Mascot right")).toBeTruthy();
  });
});
