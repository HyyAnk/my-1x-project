import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { MascotLightboxModal } from "./MascotLightboxModal";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

describe("MascotLightboxModal", () => {
  it("does not render when imageUrl is null", () => {
    const { container } = render(<MascotLightboxModal imageUrl={null} onClose={vi.fn()} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("renders image, download link, and close button when imageUrl is provided", () => {
    const onClose = vi.fn();
    const testUrl = "https://example.com/mascot_large.png";

    render(
      <MascotLightboxModal imageUrl={testUrl} onClose={onClose} altText="Custom Mascot Preview" downloadFilename="my_custom_mascot.png" />,
      { wrapper },
    );

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe(testUrl);
    expect(img.getAttribute("alt")).toBe("Custom Mascot Preview");

    const downloadLink = screen.getByLabelText(/download/i);
    expect(downloadLink.getAttribute("href")).toBe(testUrl);
    expect(downloadLink.getAttribute("download")).toBe("my_custom_mascot.png");

    const closeBtn = screen.getByLabelText(/close/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking backdrop but not content", () => {
    const onClose = vi.fn();
    const { container } = render(<MascotLightboxModal imageUrl="https://example.com/image.png" onClose={onClose} />, { wrapper });

    const content = container.querySelector(".lightbox-content");
    expect(content).toBeTruthy();
    fireEvent.click(content!);
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector(".lightbox-backdrop");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
