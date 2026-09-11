import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useState } from "react";
import { render, act } from "@testing-library/react";
import type {
  TransitionArtifactManifest,
  TransitionPreviewStatus,
} from "@studio/shared";
import { useTransitionPreview } from "./useTransitionPreview";
import * as api from "../services/transitionPreviewApi";

describe("useTransitionPreview hook contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ensures old results cannot replace a newer selection", async () => {
    const mockManifestA: TransitionArtifactManifest = {
      schemaVersion: 1,
      artifactId: "art_a",
      artifactSha256: "artifact_a_sha",
      inputFingerprint: "fp_a",
      catalogRevision: "cat_rev_1",
      engineSnapshotHash: "engine_hash",
      sourceKind: "sample",
      currentness: "matches-request",
      width: 1920,
      height: 1080,
      frameCount: 30,
      fps: { numerator: 30, denominator: 1 },
      timeBase: { numerator: 1, denominator: 30 },
      instances: [
        {
          instanceId: "inst_a",
          id: "brush_wave",
          implementationRevision: "1.0.0",
          placement: "scene",
          startFrame: 0,
          boundaryFrame: 15,
          endFrameExclusive: 30,
          durationFrames: 30,
          effectiveDurationSeconds: 1.0,
          fps: { numerator: 30, denominator: 1 },
          timingAdjustment: "none",
        },
      ],
      reviewWindow: { firstFrame: 0, lastFrameInclusive: 29, boundaryFrame: 15 },
      frames: Array.from({ length: 30 }, (_, i) => ({
        index: i,
        pts: i,
      })),
    };

    const mockManifestB: TransitionArtifactManifest = {
      schemaVersion: 1,
      artifactId: "art_b",
      artifactSha256: "artifact_b_sha",
      inputFingerprint: "fp_b",
      catalogRevision: "cat_rev_1",
      engineSnapshotHash: "engine_hash",
      sourceKind: "sample",
      currentness: "matches-request",
      width: 1920,
      height: 1080,
      frameCount: 30,
      fps: { numerator: 30, denominator: 1 },
      timeBase: { numerator: 1, denominator: 30 },
      instances: [
        {
          instanceId: "inst_b",
          id: "bubble_splash",
          implementationRevision: "1.0.0",
          placement: "scene",
          startFrame: 0,
          boundaryFrame: 15,
          endFrameExclusive: 30,
          durationFrames: 30,
          effectiveDurationSeconds: 1.0,
          fps: { numerator: 30, denominator: 1 },
          timingAdjustment: "none",
        },
      ],
      reviewWindow: { firstFrame: 0, lastFrameInclusive: 29, boundaryFrame: 15 },
      frames: Array.from({ length: 30 }, (_, i) => ({
        index: i,
        pts: i,
      })),
    };

    let resolveReqA: (value: TransitionPreviewStatus) => void;
    let resolveReqB: (value: TransitionPreviewStatus) => void;

    const promiseReqA = new Promise<TransitionPreviewStatus>((res) => {
      resolveReqA = res;
    });
    const promiseReqB = new Promise<TransitionPreviewStatus>((res) => {
      resolveReqB = res;
    });

    vi.spyOn(api, "requestTransitionPreview").mockImplementation((req) => {
      if (req.selection.id === "brush_wave") {
        return promiseReqA;
      }
      if (req.selection.id === "bubble_splash") {
        return promiseReqB;
      }
      return Promise.reject(new Error("Unexpected"));
    });

    vi.spyOn(api, "fetchTransitionManifest").mockImplementation((artifactId) => {
      if (artifactId === "art_a") return Promise.resolve(mockManifestA);
      if (artifactId === "art_b") return Promise.resolve(mockManifestB);
      return Promise.reject(new Error("Unknown artifact"));
    });

    vi.spyOn(api, "cancelTransitionJob").mockResolvedValue({
      jobId: "job_a",
      status: "cancelled",
      revision: 1,
      requestId: "req_a",
      fingerprint: "fp_a",
    });

    let currentArtifact: () => any = () => null;
    let currentSelection: () => string = () => "";
    let chooseTransition: (id: string) => void = () => {};

    function TestHarness() {
      const [sel, setSel] = useState("brush_wave");
      const preview = useTransitionPreview({
        selection: { id: sel, durationSeconds: 1.0 },
        source: {
          kind: "sample",
          sampleRevision: "sample-v1",
          sandboxInput: { aspect_ratio: "16:9", theme: "candy_arcade" },
        },
        catalogRevision: "cat_rev_1",
        debounceMs: 10,
      });

      currentArtifact = () => preview.artifact;
      currentSelection = () => sel;
      chooseTransition = (id: string) => setSel(id);

      return <div data-testid="preview-state">{preview.state.kind}</div>;
    }

    render(<TestHarness />);

    expect(currentSelection()).toBe("brush_wave");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    act(() => {
      chooseTransition("bubble_splash");
    });
    expect(currentSelection()).toBe("bubble_splash");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Complete bubble_splash first (artifactB)
    await act(async () => {
      resolveReqB!({
        jobId: "job_b",
        status: "ready",
        artifactId: "art_b",
        manifestUrl: "/manifest_b",
        videoUrl: "/video_b",
        fingerprint: "fp_b",
        revision: 1,
        requestId: "req_b",
      });
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(currentArtifact()?.artifactId).toBe("art_b");
    expect(currentSelection()).toBe("bubble_splash");

    // Complete brush_wave later (artifactA)
    await act(async () => {
      resolveReqA!({
        jobId: "job_a",
        status: "ready",
        artifactId: "art_a",
        manifestUrl: "/manifest_a",
        videoUrl: "/video_a",
        fingerprint: "fp_a",
        revision: 1,
        requestId: "req_a",
      });
      await new Promise((r) => setTimeout(r, 20));
    });

    // Older result MUST NOT replace newer selection
    expect(currentArtifact()?.artifactId).toBe("art_b");
    expect(currentSelection()).toBe("bubble_splash");
  });
});