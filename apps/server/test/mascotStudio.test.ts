import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { preflightQuizRender } from "../src/quiz/qa/preflight.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";
import { type MascotProfile, QuizV2Schema } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Studio Hub & Generator Pipeline", () => {
  it("executes complete lifecycle: CRUD, concept generation, sprite synthesis, upload, channel binding, and video composition", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-studio-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const app = await buildApp(root);
    try {
      // 1. Create a channel
      const channel = await app.repository.createChannel({
        name: "Wonder Quiz",
        description: "Trivia for kids",
        target_audience: "Kids 7-9",
        language: "English",
        market: "US",
        dna_mode: "quiz",
        group_id: "quiz",
      });

      // 2. Create a new Mascot
      const createRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots",
        payload: {
          name: "Milo the Owl",
          description: "A wise, witty owl with big eyes and red glasses",
          visual_style: "pixar_3d",
          master_prompt: "Cute wise baby owl with small red glasses",
          color_theme: "#06b6d4",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const createdMascot: MascotProfile = createRes.json().mascot;
      expect(createdMascot.id).toBeDefined();
      expect(createdMascot.name).toBe("Milo the Owl");
      expect(createdMascot.visual_style).toBe("pixar_3d");

      // 3. List Mascots
      const listRes = await app.server.inject({ method: "GET", url: "/api/mascots" });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().mascots.length).toBe(1);
      expect(listRes.json().mascots[0].id).toBe(createdMascot.id);

      // 4. Generate Master Concept Art (Procedural fallback when no API key)
      const conceptRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/generate-concept`,
        payload: { prompt: "Cute wise baby owl standing proudly" },
      });
      expect(conceptRes.statusCode).toBe(200);
      const conceptData = conceptRes.json();
      expect(conceptData.master_image_url).toContain(`/api/mascots/${createdMascot.id}/assets/`);
      expect(conceptData.mascot.master_image_url).toBe(conceptData.master_image_url);

      // 5. Generate State Action (e.g. wave and thinking with default 1 frame & motion_preset)
      const waveRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/generate-sprite`,
        payload: {
          action: "wave",
          frames_count: 1,
          fps: 8,
          loop: true,
        },
      });
      expect(waveRes.statusCode).toBe(200);
      const waveData = waveRes.json();
      expect(waveData.action_sprite.action).toBe("wave");
      expect(waveData.action_sprite.frames_count).toBe(1);
      expect(waveData.action_sprite.motion_preset).toBe("wave");
      expect(waveData.action_sprite.sprite_url).toBeDefined();

      const thinkRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/generate-sprite`,
        payload: {
          action: "thinking",
          frames_count: 1,
          fps: 8,
          loop: true,
        },
      });
      expect(thinkRes.statusCode).toBe(200);
      const thinkData = thinkRes.json();
      expect(thinkData.action_sprite.motion_preset).toBe("sway");

      // 6. Upload Custom State Image (1 frame)
      const uploadRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/upload-sprite`,
        payload: {
          action: "celebrate",
          data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
        },
      });
      expect(uploadRes.statusCode).toBe(200);
      const uploadData = uploadRes.json();
      expect(uploadData.action_sprite.action).toBe("celebrate");
      expect(uploadData.action_sprite.frames_count).toBe(1);
      expect(uploadData.action_sprite.motion_preset).toBe("jump");

      // 7. Get Mascot Detail
      const getRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${createdMascot.id}`,
      });
      expect(getRes.statusCode).toBe(200);
      const detailedMascot: MascotProfile = getRes.json().mascot;
      expect(detailedMascot.actions.wave?.sprite_url).toBeDefined();
      expect(detailedMascot.actions.thinking?.sprite_url).toBeDefined();
      expect(detailedMascot.actions.celebrate?.sprite_url).toBeDefined();

      // 8. Assign Mascot to Channel
      const assignRes = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/mascot`,
        payload: {
          mascot_id: createdMascot.id,
          config: {
            enabled: true,
            position: "bottom_left",
            scale: 1.1,
          },
        },
      });
      expect(assignRes.statusCode).toBe(200);
      const updatedChannel = assignRes.json().channel;
      expect(updatedChannel.mascot_id).toBe(createdMascot.id);
      expect(updatedChannel.mascot_config.position).toBe("bottom_left");
      expect(updatedChannel.mascot_config.scale).toBe(1.1);

      // Verify that listMascots now returns the assigned channel id
      const listAfterAssign = await app.server.inject({ method: "GET", url: "/api/mascots" });
      expect(listAfterAssign.json().mascots[0].assigned_channel_ids).toContain(channel.channel_id);

      // 8b. Calibrate Mascot Action Offsets (Phase 2 feature)
      const calibrateRes = await app.server.inject({
        method: "PATCH",
        url: `/api/mascots/${createdMascot.id}/actions/wave/calibrate`,
        payload: {
          offset_x: 8,
          offset_y: -4,
        },
      });
      expect(calibrateRes.statusCode).toBe(200);
      const calibratedAction = calibrateRes.json().action;
      expect(calibratedAction.offset_x).toBe(8);
      expect(calibratedAction.offset_y).toBe(-4);

      // 8c. Remove Background Endpoint Test
      const removeBgRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/remove-background`,
        payload: { target: "all" },
      });
      expect(removeBgRes.statusCode).toBe(200);
      const mattedMascot: MascotProfile = removeBgRes.json().mascot;
      expect(mattedMascot.id).toBe(createdMascot.id);

      // 8d. Export Mascot ZIP Package
      const exportRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${createdMascot.id}/export`,
      });
      expect(exportRes.statusCode).toBe(200);
      expect(exportRes.headers["content-type"]).toBe("application/zip");
      const zipRaw = exportRes.rawPayload;
      expect(zipRaw.length).toBeGreaterThan(50);

      // 8d. Import Mascot from ZIP Package
      const base64Zip = zipRaw.toString("base64");
      const importRes = await app.server.inject({
        method: "POST",
        url: "/api/mascots/import",
        payload: {
          data: `data:application/zip;base64,${base64Zip}`,
        },
      });
      expect(importRes.statusCode).toBe(201);
      const importedMascot: MascotProfile = importRes.json().mascot;
      expect(importedMascot.id).not.toBe(createdMascot.id);
      expect(importedMascot.name).toContain("Milo the Owl");
      expect(importedMascot.actions.wave?.sprite_url).toBeDefined();

      // 9. Build Candy Arcade Video Composition Bundle with Mascot
      const compositionBundle = buildCandyArcadeCompositionBundle({
        quiz: {
          schema_version: 2,
          episode_id: "ep_test",
          target_audience: "Kids",
          age_band: "7-9",
          language: "English",
          format: "multiple_choice",
          questions: [
            {
              id: "q1",
              number: 1,
              format: "multiple_choice",
              question: "What is the largest animal on Earth?",
              choices: [
                { id: "a", text: "Elephant" },
                { id: "b", text: "Blue Whale" },
                { id: "c", text: "Giraffe" },
              ],
              correct_choice_id: "b",
              explanation: "The Blue Whale is the largest mammal and animal.",
              visual_opportunity: "blue whale swimming in deep ocean",
              fun_fact: "A blue whale heart is the size of a car!",
              difficulty: 1,
              estimated_duration_seconds: 12,
            },
          ],
        },
        director: {
          episode_id: "ep_test",
          pacing: "standard",
          music_track: "upbeat",
          beats: [
            {
              question_id: "q1",
              archetype: "text_multiple_choice",
              palette_id: "palette_ocean",
              layout_id: "media_left_choices_right",
              motion_id: "smooth_drift",
              transition_id: "splash_wave",
            },
          ],
        },
        timeline: {
          duration_seconds: 18,
          events: [
            { at_seconds: 0, type: "question.enter", question_id: "q1" },
            { at_seconds: 2, type: "choices.enter", question_id: "q1" },
            { at_seconds: 4, type: "countdown.start", question_id: "q1" },
            { at_seconds: 9, type: "answer.reveal", question_id: "q1" },
            { at_seconds: 11, type: "reward.play", question_id: "q1" },
          ],
        },
        theme: "candy_arcade",
        audioPath: "./narration.wav",
        narrationDurationSeconds: 18,
        mascot: detailedMascot,
        mascotConfig: updatedChannel.mascot_config,
      });

      // Verify mascot HTML and CSS classes are present
      expect(compositionBundle.html).toContain("candy-mascot-container");
      expect(compositionBundle.html).toContain("mascot-sprite-play");
      expect(compositionBundle.html).toContain(
        ".quiz-question-clip .mascot-state-layer.state-thinking { opacity: 1; animation: phase-exit .001s linear var(--reveal-at) forwards; }",
      );
      expect(compositionBundle.html).toContain(
        ".quiz-question-clip .mascot-state-layer.state-celebrate { opacity: 0; animation: phase-enter .001s linear var(--reveal-at) forwards; }",
      );
      expect(compositionBundle.html).not.toContain(
        ".quiz-question-clip .mascot-state-layer.state-thinking { animation: phase-enter .001s linear var(--clip-start)",
      );

      // Verify intro and outro do NOT contain mascot DOM elements when show_in_intro and show_in_outro are false
      expect(compositionBundle.html).not.toContain('<div class="candy-mascot-container mascot-intro');
      expect(compositionBundle.html).not.toContain('<div class="candy-mascot-container mascot-outro');

      // Verify mascot does not generate redundant mascot SFX audio tags
      expect(compositionBundle.html).not.toContain("mascot-sfx");
      expect(compositionBundle.html).not.toContain("mascot-think-");
      expect(compositionBundle.html).not.toContain("mascot-react-");

      // Verify composition files for subcompositions contain the mascot layers outside game-stage
      const subCompKeys = Object.keys(compositionBundle.files);
      expect(subCompKeys.length).toBeGreaterThan(0);
      const questionSubComp = compositionBundle.files[subCompKeys[1] || subCompKeys[0]];
      expect(questionSubComp).toContain("candy-mascot-container");
      expect(questionSubComp).toContain("mascot-state-layer");
      expect(questionSubComp).toContain('</div></header><div class="game-stage"');
      expect(questionSubComp).toContain('</div><div class="candy-mascot-container');

      // 9b. Test QA Assessment & Preflight Mascot Integrity
      const dummyQuiz = QuizV2Schema.parse({
        schema_version: 2,
        episode_id: "ep_test",
        age_band: "7-9",
        language: "English",
        questions: [
          {
            id: "q1",
            number: 1,
            format: "multiple_choice",
            difficulty: 1,
            question: "What is the largest animal on Earth?",
            choices: [
              { id: "a", text: "Elephant" },
              { id: "b", text: "Blue Whale" },
              { id: "c", text: "Giraffe" },
            ],
            correct_choice_id: "b",
            explanation: "The Blue Whale is the largest mammal.",
            fun_fact: "",
            source_ids: ["src_1"],
            visual_opportunity: "",
            validation: { semantic_status: "validated", fact_locked: true, source_coverage: true },
          },
        ],
      });

      const qaAssessment = assessQuiz({
        quiz: dummyQuiz,
        mascot: detailedMascot,
        mascotConfig: updatedChannel.mascot_config,
      });
      // Detailed mascot has idle, wave, thinking, celebrate, but might miss point
      expect(qaAssessment.issues.some((i) => i.code === "mascot_pose_incomplete")).toBe(true);

      // 10. Delete Mascot and verify channel unlinking
      const deleteRes = await app.server.inject({
        method: "DELETE",
        url: `/api/mascots/${createdMascot.id}`,
      });
      expect(deleteRes.statusCode).toBe(200);

      const channelAfterDelete = await app.repository.getChannel(channel.channel_id);
      expect(channelAfterDelete.mascot_id).toBeNull();
    } finally {
      await app.server.close();
    }
  }, 30_000);

  it("passes referenceImageBase64 from master concept to generateGpti2ImageBytes when API key is active", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-ref-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const app = await buildApp(root);
    try {
      const { generateMascotActionSprite } = await import("../src/quiz/mascotService.js");
      const fakePngBytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      const mascot = await app.repository.saveMascot({
        name: "Test Milo",
        description: "Cute test owl",
        visual_style: "pixar_3d",
        master_prompt: "Cute test owl with red glasses",
        color_theme: "#06b6d4",
      });

      // Save master concept asset
      const masterUrl = await app.repository.saveMascotAsset(mascot.id, "master_concept_1.png", fakePngBytes);
      const mascotWithMaster = await app.repository.saveMascot({
        ...mascot,
        master_image_url: masterUrl,
      });

      // Mock global fetch to capture request
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | null = null;
      globalThis.fetch = vi.fn().mockImplementation((_url: string | URL | Request, init?: RequestInit) => {
        if (typeof init?.body === "string") {
          capturedBody = JSON.parse(init.body) as Record<string, unknown>;
        } else if (init?.body && typeof (init.body as unknown as { get: (k: string) => unknown }).get === "function") {
          const form = init.body as unknown as { get: (k: string) => unknown; has: (k: string) => boolean };
          capturedBody = {
            isFormData: true,
            prompt: form.get("prompt"),
            hasImage: form.has("image[]"),
            background: form.get("background"),
          };
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }],
              price_vnd: 50,
            }),
        } as unknown as Response);
      });

      try {
        const result = await generateMascotActionSprite(app.repository, mascotWithMaster, "wave", {
          enabled: true,
          api_key: "sk-mock-key",
          model: "gpt-image-2",
          provider: "gpti2",
          base_url: "https://gpti2.store",
          image_size: "1024x1024",
          quality: "low",
        });

        expect(result.action_sprite.action).toBe("wave");
        expect(capturedBody).toBeDefined();
        expect(capturedBody?.hasImage).toBe(true);
        expect(String(capturedBody?.prompt)).toContain("@1");
        expect(capturedBody?.background).toBe("opaque");
      } finally {
        globalThis.fetch = originalFetch;
      }
    } finally {
      await app.server.close();
    }
  });

  it("strictly enforces Studio Isolation Prompt Contract and AI Matting invariants", async () => {
    const { buildMascotConceptPrompt, buildMascotActionPrompt, validateMascotPromptContract, MASCOT_STUDIO_ISOLATION_TAGS } =
      await import("../src/quiz/mascotPromptContract.js");

    const mascot = {
      name: "Guardian Dragon",
      description: "A friendly baby emerald dragon with golden horns",
      visual_style: "pixar_3d" as const,
      master_prompt: "Cute baby dragon with large expressive emerald eyes",
      color_theme: "#10b981",
    };

    // 1. Concept prompt must contain mandatory studio isolation tokens and forbid character sheets / multiple views
    const conceptPrompt = buildMascotConceptPrompt(mascot);
    expect(conceptPrompt).toContain("floating character");
    expect(conceptPrompt).toContain("no ground shadow");
    expect(conceptPrompt).toContain("no floor");
    expect(conceptPrompt).toContain("solid neutral light gray background (#E8E8E8)");
    expect(conceptPrompt).toContain("high contrast studio rim lighting");
    expect(conceptPrompt).toContain("sharp clean silhouette");
    expect(conceptPrompt).toContain("single standalone character");
    expect(conceptPrompt).toContain("no character sheet");
    expect(conceptPrompt).toContain("no multiple angles");
    expect(conceptPrompt).toContain("no turnaround");
    expect(conceptPrompt).not.toContain("Master character sheet");
    expect(validateMascotPromptContract(conceptPrompt, false)).toBe(true);

    // 2. Action prompt with reference image must enforce @1 character continuity and studio isolation
    const actionWithRef = buildMascotActionPrompt(mascot, "thinking", {
      hasReferenceImage: true,
      prompt: "Đang gãi đầu suy nghĩ",
    });
    expect(actionWithRef).toContain("@1");
    expect(actionWithRef).toContain("Giữ nguyên nhân vật Guardian Dragon trong @1");
    expect(actionWithRef).toContain("floating character");
    expect(actionWithRef).toContain("no ground shadow");
    expect(actionWithRef).toContain("solid neutral light gray background (#E8E8E8)");
    expect(actionWithRef).toContain("no floor");
    expect(actionWithRef).toContain("no character sheet");
    expect(actionWithRef).toContain("no multiple angles");
    expect(validateMascotPromptContract(actionWithRef, true)).toBe(true);

    // 3. Action prompt without reference image must still enforce character DNA + studio isolation
    const actionWithoutRef = buildMascotActionPrompt(mascot, "celebrate", {
      hasReferenceImage: false,
    });
    expect(actionWithoutRef).toContain('Character: "Guardian Dragon"');
    expect(actionWithoutRef).toContain("floating character");
    expect(actionWithoutRef).toContain("no ground shadow");
    expect(actionWithoutRef).toContain("no character sheet");
    expect(validateMascotPromptContract(actionWithoutRef, false)).toBe(true);

    // 4. Invalid prompt missing isolation tokens is rejected by validator
    expect(validateMascotPromptContract("A regular cute dragon on grass", false)).toBe(false);
    expect(validateMascotPromptContract("Dragon dancing with @1 on a table", true)).toBe(false);
  });
});
