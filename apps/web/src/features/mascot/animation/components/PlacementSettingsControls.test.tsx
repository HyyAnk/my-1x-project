import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PlacementSettingsControls } from "./PlacementSettingsControls";
import { MASCOT_DEFAULT_PLACEMENT, MASCOT_RECOMMENDED_PLACEMENT } from "@studio/shared";

afterEach(() => {
  cleanup();
});

describe("PlacementSettingsControls", () => {
  it("renders placement controls with active values", () => {
    const onChange = vi.fn();
    render(<PlacementSettingsControls placement={MASCOT_DEFAULT_PLACEMENT} onChangePlacement={onChange} />);

    expect(screen.getByText("Quiz Placement & Framing (16:9)")).toBeTruthy();
    expect(screen.getByText("Bottom Left (Default)")).toBeTruthy();
    expect(screen.getByText("Bottom Right")).toBeTruthy();
    expect(screen.getByLabelText("Render Scale")).toBeTruthy();
    expect(screen.getByLabelText("Offset X")).toBeTruthy();
    expect(screen.getByLabelText("Offset Y")).toBeTruthy();
  });

  it("updates anchor position to bottom_right on click", () => {
    const onChange = vi.fn();
    render(<PlacementSettingsControls placement={MASCOT_DEFAULT_PLACEMENT} onChangePlacement={onChange} />);

    fireEvent.click(screen.getByText("Bottom Right"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: "bottom_right",
      }),
    );
  });

  it("updates scale on range change", () => {
    const onChange = vi.fn();
    render(<PlacementSettingsControls placement={MASCOT_DEFAULT_PLACEMENT} onChangePlacement={onChange} />);

    const scaleInput = screen.getByLabelText("Render Scale");
    fireEvent.change(scaleInput, { target: { value: "1.5" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 1.5,
      }),
    );
  });

  it("resets to default placement and applies recommended placement on preset buttons", () => {
    const onChange = vi.fn();
    render(
      <PlacementSettingsControls
        placement={{
          anchor: "bottom_right",
          scale: 2.0,
          offset_x: 50,
          offset_y: -30,
          flip_x: true,
        }}
        onChangePlacement={onChange}
      />,
    );

    fireEvent.click(screen.getByText("Reset Default"));
    expect(onChange).toHaveBeenCalledWith(MASCOT_DEFAULT_PLACEMENT);

    fireEvent.click(screen.getByText("Recommended"));
    expect(onChange).toHaveBeenCalledWith(MASCOT_RECOMMENDED_PLACEMENT);
  });

  it("toggles alignment guides on guides button click", () => {
    const onToggleGuides = vi.fn();
    render(
      <PlacementSettingsControls
        placement={MASCOT_DEFAULT_PLACEMENT}
        onChangePlacement={vi.fn()}
        showGuides={false}
        onToggleGuides={onToggleGuides}
      />,
    );

    const guidesBtn = screen.getByTitle("Toggle Alignment Guides");
    fireEvent.click(guidesBtn);
    expect(onToggleGuides).toHaveBeenCalledTimes(1);
  });
});
