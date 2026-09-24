import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MascotGreenScreenAuditModal } from "./MascotGreenScreenAuditModal";
import { LanguageProvider } from "../../../i18n";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
} from "@studio/shared";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

afterEach(() => {
  cleanup();
});

describe("MascotGreenScreenAuditModal", () => {
  const mockScanWithViolations: MascotGreenScreenAuditResponse = {
    mascotId: "mascot_1",
    mascotName: "Captain Quill",
    mode: "scan",
    summary: {
      totalChecked: 21,
      compliantCount: 19,
      violationCount: 2,
      missingRawCount: 1,
      transparencyCount: 1,
      insufficientChromaCount: 0,
    },
    violations: [
      {
        targetType: "style_anchor",
        mascotId: "mascot_1",
        mascotName: "Captain Quill",
        styleId: "core",
        styleName: "Core Style",
        rawImageUrl: "https://example.com/raw-anchor.png",
        imageUrl: "https://example.com/cutout-anchor.png",
        status: "violation",
        violationReason: "has_transparency",
        greenRatio: 0.12,
        details: "Native transparency detected along borders",
      },
      {
        targetType: "slot",
        mascotId: "mascot_1",
        mascotName: "Captain Quill",
        styleId: "core",
        styleName: "Core Style",
        state: "thinking",
        slotIndex: 3,
        status: "violation",
        violationReason: "missing_raw",
        details: "Raw green-screen master image missing",
      },
    ],
  };

  const mockScanAllCompliant: MascotGreenScreenAuditResponse = {
    mascotId: "mascot_1",
    mascotName: "Captain Quill",
    mode: "scan",
    summary: {
      totalChecked: 21,
      compliantCount: 21,
      violationCount: 0,
      missingRawCount: 0,
      transparencyCount: 0,
      insufficientChromaCount: 0,
    },
    violations: [],
  };

  const mockStatus: MascotGreenScreenAuditStatusResponse = {
    mascotId: "mascot_1",
    mascotName: "Captain Quill",
    isRepairing: false,
    activeBatchCount: 0,
  };

  it("does not render when isOpen is false", () => {
    render(
      <MascotGreenScreenAuditModal
        isOpen={false}
        onClose={vi.fn()}
        auditResult={null}
        auditStatus={null}
        isScanning={false}
        isRepairing={false}
        onScan={vi.fn()}
        onRepair={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.queryByTestId("mascot-audit-modal")).toBeNull();
  });

  it("renders correctly with violations and triggers repair", () => {
    const onScan = vi.fn();
    const onRepair = vi.fn();
    const onClose = vi.fn();
    const onOpenLightbox = vi.fn();

    render(
      <MascotGreenScreenAuditModal
        isOpen={true}
        onClose={onClose}
        mascotName="Captain Quill"
        auditResult={mockScanWithViolations}
        auditStatus={mockStatus}
        isScanning={false}
        isRepairing={false}
        onScan={onScan}
        onRepair={onRepair}
        onOpenLightbox={onOpenLightbox}
      />,
      { wrapper },
    );

    // Header check
    expect(screen.getByTestId("mascot-audit-modal")).toBeTruthy();
    expect(screen.getByText(/Captain Quill/i)).toBeTruthy();

    // Metrics check
    expect(screen.getByText("21")).toBeTruthy(); // total checked
    expect(screen.getByText("19")).toBeTruthy(); // compliant
    expect(screen.getByText("2")).toBeTruthy(); // violations

    // Violations list check
    expect(screen.getByText(/Style Anchor: Core Style/i)).toBeTruthy();
    expect(screen.getByText(/Slot #3 \(Thinking\) · Core Style/i)).toBeTruthy();

    // Lightbox click on thumbnail
    const thumbBtn = screen.getByLabelText(/Preview for Style Anchor: Core Style/i);
    fireEvent.click(thumbBtn);
    expect(onOpenLightbox).toHaveBeenCalledWith("https://example.com/raw-anchor.png");

    // Repair button click
    const fixBtn = screen.getByRole("button", { name: /Fix All Violations/i });
    fireEvent.click(fixBtn);
    expect(onRepair).toHaveBeenCalledTimes(1);

    // Scan Again click
    const scanBtn = screen.getByRole("button", { name: /Scan Again/i });
    fireEvent.click(scanBtn);
    expect(onScan).toHaveBeenCalledTimes(1);

    // Close button click
    const closeBtn = screen.getByTestId("mascot-audit-close-button");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders all compliant state when there are zero violations", () => {
    render(
      <MascotGreenScreenAuditModal
        isOpen={true}
        onClose={vi.fn()}
        auditResult={mockScanAllCompliant}
        auditStatus={mockStatus}
        isScanning={false}
        isRepairing={false}
        onScan={vi.fn()}
        onRepair={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText(/All Assets Compliant/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Fix All Violations/i })).toBeNull();
  });

  it("closes modal on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <MascotGreenScreenAuditModal
        isOpen={true}
        onClose={onClose}
        auditResult={mockScanWithViolations}
        auditStatus={mockStatus}
        isScanning={false}
        isRepairing={false}
        onScan={vi.fn()}
        onRepair={vi.fn()}
      />,
      { wrapper },
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays active repair banner when isRepairing is true", () => {
    render(
      <MascotGreenScreenAuditModal
        isOpen={true}
        onClose={vi.fn()}
        auditResult={mockScanWithViolations}
        auditStatus={{ ...mockStatus, isRepairing: true }}
        isScanning={false}
        isRepairing={true}
        onScan={vi.fn()}
        onRepair={vi.fn()}
      />,
      { wrapper },
    );

    expect(
      screen.getByText(/Regeneration jobs are currently running in the background/i),
    ).toBeTruthy();
  });
});
