import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { UploadMascotConceptResponse } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { mascotApi } from "../../../api/mascotApi";
import { MascotConceptUploader, type MascotConceptUploaderProps } from "./MascotConceptUploader";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockMascot: UploadMascotConceptResponse["mascot"] = {
  id: "mascot_upload_1",
  name: "Barnaby the Bear",
  description: "A cozy bear with a scarf",
  visual_style: "pixar_3d",
  master_prompt: "cozy baby bear",
  master_image_url: "https://example.com/barnaby.png",
  master_raw_image_url: "https://example.com/barnaby_raw.png",
  color_theme: "#06b6d4",
  concept_origin: "user_uploaded",
  actions: {},
  styles: [],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockUploadResponse: UploadMascotConceptResponse = {
  mascot: mockMascot,
  master_image_url: "https://example.com/barnaby.png",
  master_raw_image_url: "https://example.com/barnaby_raw.png",
  extracted_color: "#06b6d4",
  extracted_tags: ["bear", "scarf", "cozy"],
};

function renderUploader(props: Partial<MascotConceptUploaderProps> = {}) {
  const defaultProps: MascotConceptUploaderProps = {
    mascotId: "mascot_upload_1",
    name: "Barnaby the Bear",
    description: "A cozy bear with a scarf",
    colorTheme: "#06b6d4",
    visualStyle: "pixar_3d",
    onSuccess: vi.fn(),
    onNotice: vi.fn(),
    onMascotsChanged: vi.fn(),
    ...props,
  };

  return {
    ...render(<MascotConceptUploader {...defaultProps} />, { wrapper }),
    props: defaultProps,
  };
}

describe("MascotConceptUploader", () => {
  it("renders dropzone area, browse button, and file input with accepted formats", () => {
    renderUploader();

    expect(screen.getByTestId("concept-dropzone")).toBeTruthy();
    expect(screen.getByText(/Drag and drop your mascot concept image here/i)).toBeTruthy();
    expect(screen.getByText("Browse Files")).toBeTruthy();
    expect(screen.getByText(/PNG, JPG, WEBP up to 15MB/i)).toBeTruthy();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.getAttribute("accept")).toBe("image/png,image/jpeg,image/webp");
  });

  it("handles valid file selection, shows preview frame, and displays file details", async () => {
    renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const file = new File(["dummy-binary-content"], "mascot_concept.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("uploader-preview-container")).toBeTruthy();
      expect(screen.getByTestId("concept-preview-image")).toBeTruthy();
    });

    expect(screen.getByText("mascot_concept.png")).toBeTruthy();
    expect(screen.getByText(/image\/png/i)).toBeTruthy();

    const previewImg = screen.getByTestId("concept-preview-image") as HTMLImageElement;
    expect(previewImg).toBeTruthy();
    expect(previewImg.getAttribute("alt")).toBe("mascot_concept.png");
  });

  it("toggles auto-matting checkbox (default true)", async () => {
    renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const file = new File(["sample"], "character.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("auto-matting-toggle")).toBeTruthy();
    });

    const checkbox = screen.getByTestId("auto-matting-toggle") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("triggers mascotApi.uploadMascotConcept and calls onSuccess callback on upload", async () => {
    const uploadSpy = vi.spyOn(mascotApi, "uploadMascotConcept").mockResolvedValue(mockUploadResponse);
    const { props } = renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const file = new File(["image-bytes"], "hero.webp", { type: "image/webp" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("upload-concept-submit-btn")).toBeTruthy();
      expect(screen.getByTestId("concept-preview-image")).toBeTruthy();
    });

    const uploadBtn = screen.getByTestId("upload-concept-submit-btn") as HTMLButtonElement;
    expect(uploadBtn.disabled).toBe(false);

    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledTimes(1);
    });

    expect(uploadSpy).toHaveBeenCalledWith(
      "mascot_upload_1",
      expect.objectContaining({
        mime_type: "image/webp",
        auto_matting: true,
        name: "Barnaby the Bear",
      }),
    );

    expect(props.onSuccess).toHaveBeenCalledWith(mockUploadResponse);
    expect(props.onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "good",
      }),
    );
  });

  it("rejects invalid file type and emits error notice", async () => {
    const { props } = renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const invalidFile = new File(["text data"], "notes.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(props.onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "bad",
        message: expect.stringMatching(/invalid image format/i),
      }),
    );

    // Dropzone should still be active, preview should not open
    expect(screen.getByTestId("concept-dropzone")).toBeTruthy();
    expect(screen.queryByTestId("uploader-preview-container")).toBeNull();
  });

  it("rejects oversized file (>15MB) and emits error notice", async () => {
    const { props } = renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const largeFile = new File(["content"], "giant.png", { type: "image/png" });
    Object.defineProperty(largeFile, "size", { value: 16 * 1024 * 1024 }); // 16MB

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(props.onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "bad",
        message: expect.stringMatching(/exceeds 15MB/i),
      }),
    );

    expect(screen.getByTestId("concept-dropzone")).toBeTruthy();
    expect(screen.queryByTestId("uploader-preview-container")).toBeNull();
  });

  it("discards selected file and returns to dropzone when clicking clear button", async () => {
    renderUploader();

    const fileInput = screen.getByTestId("concept-file-input") as HTMLInputElement;
    const file = new File(["sample"], "avatar.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("clear-upload-btn")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("clear-upload-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("concept-dropzone")).toBeTruthy();
      expect(screen.queryByTestId("uploader-preview-container")).toBeNull();
    });
  });

  it("handles dragover, dragleave, and drop events on dropzone", async () => {
    renderUploader();

    const dropzone = screen.getByTestId("concept-dropzone");

    fireEvent.dragOver(dropzone);
    expect(dropzone.classList.contains("is-drag-over")).toBe(true);

    fireEvent.dragLeave(dropzone);
    expect(dropzone.classList.contains("is-drag-over")).toBe(false);

    const file = new File(["drop-image"], "dropped.png", { type: "image/png" });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("uploader-preview-container")).toBeTruthy();
    });
    expect(screen.getByText("dropped.png")).toBeTruthy();
  });
});
