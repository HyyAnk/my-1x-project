import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { preflightQuizRender } from "../src/quiz/qa/preflight.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";
import type { MascotProfile } from "@studio/shared";

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

      // 5. Generate Sprite Action (e.g. wave and thinking)
      const waveRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/generate-sprite`,
        payload: {
          action: "wave",
          frames_count: 6,
          fps: 8,
          loop: true,
        },
      });
      expect(waveRes.statusCode).toBe(200);
      const waveData = waveRes.json();
      expect(waveData.action_sprite.action).toBe("wave");
      expect(waveData.action_sprite.frames_count).toBe(6);
      expect(waveData.action_sprite.sprite_url).toBeDefined();

      const thinkRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/generate-sprite`,
        payload: {
          action: "thinking",
          frames_count: 6,
          fps: 8,
          loop: true,
        },
      });
      expect(thinkRes.statusCode).toBe(200);

      // 6. Upload Custom Sprite Sheet
      const uploadRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${createdMascot.id}/upload-sprite`,
        payload: {
          action: "celebrate",
          data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          frames_count: 8,
          fps: 10,
          loop: true,
          frame_width: 256,
          frame_height: 256,
        },
      });
      expect(uploadRes.statusCode).toBe(200);
      const uploadData = uploadRes.json();
      expect(uploadData.action_sprite.action).toBe("celebrate");
      expect(uploadData.action_sprite.frames_count).toBe(8);

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
          episode_id: "ep_test",
          target_audience: "Kids",
          age_band: "7-9",
          language: "English",
          format: "multiple_choice",
          questions: [
            {
              id: "q1",
              number: 1,
              format: "text_multiple_choice",
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
              difficulty: "easy",
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
      expect(compositionBundle.html).toContain("anchor-bottom_left");
      expect(compositionBundle.html).toContain("has-mascot-left");

      // Verify mascot does not generate redundant mascot SFX audio tags
      expect(compositionBundle.html).not.toContain("mascot-sfx");
      expect(compositionBundle.html).not.toContain("mascot-think-");
      expect(compositionBundle.html).not.toContain("mascot-react-");

      // Verify composition files for subcompositions contain the mascot layers
      const subCompKeys = Object.keys(compositionBundle.files);
      expect(subCompKeys.length).toBeGreaterThan(0);
      const questionSubComp = compositionBundle.files[subCompKeys[1] || subCompKeys[0]];
      expect(questionSubComp).toContain("candy-mascot-container");
      expect(questionSubComp).toContain("mascot-state-layer");

      // 9b. Test QA Assessment & Preflight Mascot Integrity
      const dummyQuiz = {
        episode_id: "ep_test",
        target_audience: "Kids",
        age_band: "7-9" as const,
        format: "multiple_choice" as const,
        questions: [
          {
            id: "q1",
            number: 1,
            format: "text_multiple_choice" as const,
            question: "What is the largest animal on Earth?",
            choices: [
              { id: "a", text: "Elephant" },
              { id: "b", text: "Blue Whale" },
              { id: "c", text: "Giraffe" },
            ],
            correct_choice_id: "b",
            explanation: "The Blue Whale is the largest mammal.",
            source_ids: ["src_1"],
            validation: { fact_locked: true, checked_at: new Date().toISOString(), model: "test" },
          },
        ],
      };

      const qaAssessment = assessQuiz({
        quiz: dummyQuiz as any,
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
});
