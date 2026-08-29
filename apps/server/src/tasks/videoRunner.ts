import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { MASCOT_CANVAS_SIZES, nowIso, resolveChannelBrandName, type MascotProfile, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { buildQuizComposition } from "../quiz/render/buildComposition.js";
import { HyperframesRenderer } from "../quiz/render/hyperframesRenderer.js";
import { preflightQuizRender } from "../quiz/qa/preflight.js";
import { inspectRenderedVideo } from "../quiz/qa/postRenderQa.js";
import { formatHyperframesCheckFailure, hasHyperframesContrastIssue, parseHyperframesCheckReport } from "../quiz/qa/hyperframesQuality.js";
import { healCompositionContrast } from "../quiz/qa/contrastHealer.js";
import { resolveQuizAssets } from "../quiz/assets/resolveQuizAssets.js";
import { hasNonEmptyFile } from "./artifactFiles.js";
import { readRenderCheckpoint, writeRenderCheckpoint } from "./checkpoints.js";
import { renderSourceFingerprint } from "./fingerprints.js";
import type { TaskManagerRuntime } from "./runtime.js";
import { copyCandyArcadeFonts, resolveCandyArcadeFonts } from "../quiz/render/candyArcade/candyArcadeFonts.js";
import { prepareLocalizedMascot } from "./video/mascotLocalization.js";
import { prepareSoundtrack } from "./video/soundtrackPreparation.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const quizRenderer = new HyperframesRenderer();

export async function runVideoTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "render_video" };
  try {
    const renderAspectRatio = this.videoConfig.aspect_ratio;
    const renderCanvas = MASCOT_CANVAS_SIZES[renderAspectRatio];
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing Quiz composition",
      progress_percent: 5,
    });
    if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
    const episode = await this.repository.getEpisode(task.channel_id, task.episode_id);
    const channel = await this.repository.getChannel(task.channel_id);
    const scenes = await this.repository.readScenes(task.channel_id, task.episode_id);
    if (!(await this.hasValidNarrationAsset(task.channel_id, task.episode_id, episode.narration_asset_path)))
      throw new RepositoryError("Generate the Chatterbox narration before rendering video", "NARRATION_REQUIRED");
    if (scenes.length === 0) throw new RepositoryError("Generate Quiz scenes before rendering video", "SCENES_REQUIRED");
    const narration = await this.repository.getEpisodeAudioFile(
      task.channel_id,
      task.episode_id,
      path.basename(episode.narration_asset_path!),
    );
    const renderRoot = this.repository.resolvePath("runtime", "hyperframes", episode.episode_id);
    await mkdir(renderRoot, { recursive: true });
    const compositionPath = path.join(renderRoot, "index.html");
    const outputPath = path.join(renderRoot, "quiz-video.mp4");
    const renderAudioPath = path.join(renderRoot, "narration.wav");
    await copyFile(narration.absolutePath, renderAudioPath);
    const quizV2 = await this.repository.readQuiz(task.channel_id, task.episode_id);
    const directorPlan = await this.repository.readDirectorPlan(task.channel_id, task.episode_id);
    const assetPlan = await this.repository.readAssetPlan(task.channel_id, task.episode_id);
    const voicePlan = await this.repository.readVoicePlan(task.channel_id, task.episode_id);
    const timeline = await this.repository.readQuizTimeline(task.channel_id, task.episode_id);
    const completeQuizV2 =
      quizV2 && directorPlan && assetPlan && voicePlan && timeline
        ? { quiz: quizV2, director: directorPlan, assetPlan, voicePlan, timeline }
        : null;
    if (channel.engine === "quiz" && !completeQuizV2 && !episode.video_asset_path) {
      throw new RepositoryError("Quiz V2 artifacts are required before rendering a new Quiz video", "QUIZ_V2_REQUIRED");
    }
    let assetResolution = await this.repository.readQuizAssetResolution(task.channel_id, task.episode_id);
    if (completeQuizV2 && !assetResolution) {
      await this.update(task.task_id, { progress_message: "Quiz · preparing visual assets", progress_percent: 10 });
      assetResolution = (
        await resolveQuizAssets({
          repository: this.repository,
          channelId: task.channel_id,
          episodeId: task.episode_id,
          plan: completeQuizV2.assetPlan,
          activeEngine: this.activeEngine,
          antigravityClient: this.antigravity,
          imageConfig: { api_key: this.imageConfig.api_key, model: this.imageConfig.model },
        })
      ).resolution;
    }
    // HyperFrames only discovers local media inside the composition directory.
    const renderAssetDirectory = path.join(renderRoot, "quiz-images");
    await mkdir(renderAssetDirectory, { recursive: true });
    const resolvedAssetEntries: Array<readonly [string, string] | null> = await Promise.all(
      (assetResolution?.assets ?? []).map(async (asset) => {
        try {
          const sourcePath = await this.repository.resolveQuizAssetPath(task.channel_id, task.episode_id!, asset.path);
          const extension = path.extname(sourcePath) || ".png";
          const renderFilename = `${asset.asset_id}${extension}`;
          await copyFile(sourcePath, path.join(renderAssetDirectory, renderFilename));
          return [asset.asset_id, `./quiz-images/${renderFilename}`] as const;
        } catch {
          return null;
        }
      }),
    );
    const assetSources: Record<string, string> = Object.fromEntries(
      resolvedAssetEntries.filter((entry): entry is readonly [string, string] => entry !== null),
    );
    let preflightAssessment: ReturnType<typeof preflightQuizRender>["assessment"] | null = null;
    if (completeQuizV2) {
      const preflight = preflightQuizRender({
        quiz: completeQuizV2.quiz,
        director: completeQuizV2.director,
        assetPlan: completeQuizV2.assetPlan,
        resolvedAssets: assetResolution?.assets ?? [],
        voicePlan: completeQuizV2.voicePlan,
        timeline: completeQuizV2.timeline,
        measuredAudio: episode.narration_duration_seconds !== null,
      });
      preflightAssessment = preflight.assessment;
      await this.repository.writeQuizAssessment(task.channel_id, task.episode_id, preflight.assessment);
      if (!preflight.ok) {
        const blocker = preflight.assessment.issues.find((issue) => issue.severity === "blocker");
        throw new RepositoryError(
          "Quiz V2 preflight blocked render: " + (blocker?.message ?? "Resolve the reported QA blockers before rendering."),
          "QUIZ_PREFLIGHT_BLOCKED",
        );
      }
    }
    const bgmHistory = await this.repository.readBgmHistory(task.channel_id);
    const mascotProfile: MascotProfile | null = await prepareLocalizedMascot(channel, this.repository, renderRoot);

    let selectedBgmTrackId: string | null = null;
    let selectedBgmFilename: string | null = null;

    if (completeQuizV2) {
      const soundtrackResult = await prepareSoundtrack({
        renderRoot,
        narration,
        timeline: completeQuizV2.timeline,
        episode,
        bgmHistory,
        assetSources,
        onProgressMessage: async (message) => {
          await this.update(task.task_id, { progress_message: message, progress_percent: 15 });
        },
      });
      selectedBgmTrackId = soundtrackResult.selectedBgmTrackId;
      selectedBgmFilename = soundtrackResult.selectedBgmFilename;
    }

    const preparedQuizRender = completeQuizV2
      ? await quizRenderer.prepare({
          quiz: completeQuizV2.quiz,
          director: completeQuizV2.director,
          timeline: completeQuizV2.timeline,
          scenes,
          audioPath: "./soundtrack.wav",
          premixedAudio: true,
          aspectRatio: renderAspectRatio,
          theme: episode.quiz_config.visual_theme,
          narrationDurationSeconds: episode.narration_duration_seconds ?? undefined,
          assets: assetSources,
          bgmOptions: {
            recentTrackIds: bgmHistory.map((entry) => entry.track_id),
            seed: episode.episode_id,
          },
          mascot: mascotProfile,
          mascotConfig: channel.mascot_config,
          defaultThinkingBarStyle: episode.quiz_config?.thinking_bar_style,
          defaultQuestionBoxStyle: episode.quiz_config?.question_box_style,
          defaultAnswerCardStyle: episode.quiz_config?.answer_card_style,
          defaultCounterStyle: episode.quiz_config?.question_counter_style,
          defaultPaletteId: episode.quiz_config?.palette_id,
          channelBrandName: resolveChannelBrandName(episode.quiz_config?.channel_brand_name, channel.display_name),
        })
      : null;
    const html =
      preparedQuizRender?.html ??
      buildQuizComposition(episode.quiz_config, scenes, "./narration.wav", episode.narration_duration_seconds ?? undefined, {
        aspectRatio: renderAspectRatio,
      });
    await writeFile(compositionPath, html, "utf8");
    for (const [relativePath, content] of Object.entries(preparedQuizRender?.compositionFiles ?? {})) {
      const filePath = path.join(renderRoot, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    }
    const sfxTargetDir = path.join(renderRoot, "sfx");
    await mkdir(sfxTargetDir, { recursive: true });
    const sfxFiles = [
      "ui_pop.wav",
      "bubble_splash.wav",
      "lightning_brush.wav",
      "countdown_tick.wav",
      "countdown_final.wav",
      "correct_ding.wav",
      "correct_triumph.wav",
      "streak.wav",
    ];
    const sfxCandidates = [
      path.join(this.repository.rootDirectory, "templates", "sfx"),
      path.join(this.repository.rootDirectory, "assets", "audio", "sfx"),
      path.resolve("templates", "sfx"),
      path.resolve("assets", "audio", "sfx"),
    ];
    await Promise.all(
      sfxFiles.map(async (file) => {
        for (const candidateDir of sfxCandidates) {
          const candidateFile = path.join(candidateDir, file);
          try {
            await copyFile(candidateFile, path.join(sfxTargetDir, file));
            break;
          } catch {
            // try next candidate
          }
        }
      }),
    );
    const bgmTargetDir = path.join(renderRoot, "bgm");
    await mkdir(bgmTargetDir, { recursive: true });
    const bgmCandidates = [
      path.join(this.repository.rootDirectory, "assets", "audio", "bgm", "tracks"),
      path.resolve("assets", "audio", "bgm", "tracks"),
      path.join(this.repository.rootDirectory, "assets", "audio", "bgm"),
      path.resolve("assets", "audio", "bgm"),
    ];
    for (const candidateDir of bgmCandidates) {
      try {
        const entries = await readdir(candidateDir);
        const mp3s = entries.filter((entry) => entry.endsWith(".mp3"));
        if (mp3s.length > 0) {
          await Promise.all(mp3s.map((entry) => copyFile(path.join(candidateDir, entry), path.join(bgmTargetDir, entry))));
          break;
        }
      } catch {
        // try next candidate
      }
    }
    await copyCandyArcadeFonts(renderRoot, this.repository.rootDirectory);

    const fontFingerprints = resolveCandyArcadeFonts(this.repository.rootDirectory).map((font) => `${font.id}:${font.sha256}`);
    const sourceFingerprint = renderSourceFingerprint(
      html,
      narration.modified_at,
      narration.size,
      assetResolution?.assets ?? [],
      fontFingerprints,
    );
    const checkpointPath = path.join(renderRoot, "render-checkpoint.json");
    const checkpoint = await readRenderCheckpoint(checkpointPath);
    const layoutReady = checkpoint?.source_fingerprint === sourceFingerprint && checkpoint.check.status === "passed";
    if (layoutReady) {
      await this.update(task.task_id, { progress_message: "Video · layout and media checks already passed", progress_percent: 58 });
    } else {
      await this.update(task.task_id, { progress_message: "Video · checking layout and media", progress_percent: 58 });
      let checkOutput: string = "";
      const maxCheckAttempts = 2;
      const checkTimeoutMs = Number(process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000");
      const hyperframesEnv = {
        ...process.env,
        PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS: process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000",
        ...(process.env.HYPERFRAMES_BROWSER_PATH ? { HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH } : {}),
      };

      for (let attempt = 1; attempt <= maxCheckAttempts; attempt++) {
        const checkInvocation = getHyperframesInvocation(
          "check",
          renderRoot,
          "--json",
          "--samples",
          "5",
          "--timeout",
          String(checkTimeoutMs),
        );
        try {
          ({ stdout: checkOutput } = await execFileAsync(checkInvocation.command, checkInvocation.args, {
            cwd: this.repository.rootDirectory,
            timeout: 600_000,
            windowsHide: true,
            maxBuffer: 20 * 1024 * 1024,
            env: hyperframesEnv,
          }));
        } catch (error) {
          const failure = error as Error & { stdout?: string };
          const errorReport = parseHyperframesCheckReport(failure.stdout);
          if (attempt < maxCheckAttempts && hasHyperframesContrastIssue(errorReport)) {
            await this.update(task.task_id, { progress_message: "Video · auto-healing contrast issues...", progress_percent: 60 });
            await healCompositionContrast(renderRoot, errorReport);
            continue;
          }
          throw new RepositoryError(formatHyperframesCheckFailure(errorReport, failure.message), "QUIZ_COMPOSITION_CHECK_FAILED");
        }

        const checkReport = parseHyperframesCheckReport(checkOutput);
        if (hasHyperframesContrastIssue(checkReport)) {
          if (attempt < maxCheckAttempts) {
            await this.update(task.task_id, { progress_message: "Video · auto-healing contrast issues...", progress_percent: 60 });
            await healCompositionContrast(renderRoot, checkReport);
            continue;
          }
          throw new RepositoryError(formatHyperframesCheckFailure(checkReport), "QUIZ_COMPOSITION_CONTRAST_FAILED");
        }

        break;
      }
      await writeRenderCheckpoint(checkpointPath, {
        schema_version: 2,
        source_fingerprint: sourceFingerprint,
        check: { status: "passed" },
      });
    }
    let reusableRender = layoutReady && checkpoint?.render?.status === "passed" && (await hasNonEmptyFile(outputPath));
    if (reusableRender) {
      const existingProbe = await inspectRenderedVideo(outputPath, {
        width: renderCanvas.width,
        height: renderCanvas.height,
        fps: this.videoConfig.fps,
      });
      reusableRender = !existingProbe.issues.some((issue) => issue.severity === "blocker");
    }
    if (reusableRender) {
      await this.update(task.task_id, { progress_message: "Video · reusing verified MP4", progress_percent: 85 });
    } else {
      await this.update(task.task_id, { progress_message: "Video · rendering MP4 with narration", progress_percent: 65 });
      const browserTimeout = process.env.HYPERFRAMES_BROWSER_TIMEOUT_SECONDS || "300";
      const renderTimeoutMs = Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS) || 120 * 60_000;
      const hyperframesEnv = {
        ...process.env,
        PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS: process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000",
        PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS: process.env.PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS || "300000",
        PRODUCER_PLAYER_READY_TIMEOUT_MS: process.env.PRODUCER_PLAYER_READY_TIMEOUT_MS || "60000",
        PRODUCER_EXPERIMENTAL_FAST_CAPTURE: process.env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE || "true",
        ...(process.env.HYPERFRAMES_BROWSER_PATH ? { HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH } : {}),
      };
      const optimalWorkers = Math.max(2, Math.min(8, os.cpus().length ? Math.floor(os.cpus().length / 2) : 4));
      const renderInvocation = getHyperframesInvocation(
        "render",
        renderRoot,
        "--output",
        outputPath,
        "--fps",
        String(this.videoConfig.fps),
        "--quality",
        this.videoConfig.render_quality,
        "--workers",
        String(optimalWorkers),
        "--gpu",
        "--browser-gpu",
        "--browser-timeout",
        browserTimeout,
        "--strict",
        "--json",
      );
      await execFileAsync(renderInvocation.command, renderInvocation.args, {
        cwd: this.repository.rootDirectory,
        timeout: renderTimeoutMs,
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        env: hyperframesEnv,
      });
    }
    await this.update(task.task_id, { progress_message: "Video · verifying MP4 and audio track", progress_percent: 95 });
    const probe = await inspectRenderedVideo(outputPath, {
      width: renderCanvas.width,
      height: renderCanvas.height,
      fps: this.videoConfig.fps,
    });
    const renderBlocker = probe.issues.find((issue) => issue.severity === "blocker");
    if (renderBlocker) throw new RepositoryError(renderBlocker.message, "QUIZ_RENDER_QA_FAILED");
    await writeRenderCheckpoint(checkpointPath, {
      schema_version: 2,
      source_fingerprint: sourceFingerprint,
      check: { status: "passed" },
      render: { status: "passed" },
    });
    const duration = Number.parseFloat(probe.probe.format?.duration ?? "");
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Rendered MP4 has no readable duration");
    const degradedAssets = (assetResolution?.assets ?? []).filter((a) => a.degraded || a.fallback_tier === 3 || a.source === "fallback");
    const hasDegradedFallback = degradedAssets.length > 0;
    if (!selectedBgmFilename) {
      const bgmMatch = html.match(/src=["']\.\/bgm\/([^"']+)["']/);
      selectedBgmFilename = bgmMatch ? bgmMatch[1] : null;
      selectedBgmTrackId = selectedBgmFilename ? selectedBgmFilename.replace(/\.mp3$/i, "") : null;
    }
    const manifestPath = await this.repository.writeRenderManifest(
      task.channel_id,
      task.episode_id,
      JSON.stringify({
        engine: "hyperframes",
        quiz_engine_version: completeQuizV2 ? 2 : 1,
        schema_version: completeQuizV2 ? 2 : 1,
        composition: "runtime/hyperframes/" + episode.episode_id + "/index.html",
        source_fingerprints: {},
        question_count: episode.quiz_config.question_count,
        format: episode.quiz_config.quiz_format,
        duration_seconds: Number(duration.toFixed(3)),
        aspect_ratio: renderAspectRatio,
        resolution: { width: renderCanvas.width, height: renderCanvas.height },
        fps: this.videoConfig.fps,
        bgm_track_id: selectedBgmTrackId ?? undefined,
        bgm_filename: selectedBgmFilename ?? undefined,
        degraded: hasDegradedFallback,
        fallback_tier: hasDegradedFallback ? 3 : undefined,
        degraded_assets: hasDegradedFallback ? degradedAssets.map((a) => a.asset_id) : undefined,
        preflight: preflightAssessment
          ? {
              status: "passed",
              score: preflightAssessment.score,
              blockers: preflightAssessment.issues.filter((issue) => issue.severity === "blocker").length,
            }
          : { status: "legacy_skipped" },
        check: { status: "passed" },
        render: { status: "passed", output: "quiz-video.mp4" },
        post_render: {
          status: "passed",
          issues: probe.issues.length,
          streams:
            probe.probe.streams?.map((stream) => ({
              codec_type: stream.codec_type,
              width: stream.width,
              height: stream.height,
              r_frame_rate: stream.r_frame_rate,
            })) ?? [],
        },
        generated_at: nowIso(),
      }),
    );
    const videoPath = await this.repository.writeVideoArtifact(task.channel_id, task.episode_id, await readFile(outputPath));
    await this.repository.saveVideoMetadata(task.channel_id, task.episode_id, videoPath, Number(duration.toFixed(3)), manifestPath);
    await this.update(task.task_id, { progress_message: "Quiz video ready", progress_percent: 100 });
    await this.finish(task.task_id, "COMPLETED", null, [videoPath, manifestPath]);
    if (completeQuizV2?.quiz && completeQuizV2.quiz.questions.length > 0) {
      await this.repository.appendQuestionHistory(task.channel_id, task.episode_id, completeQuizV2.quiz.questions, undefined, task.task_id);
    }
    if (selectedBgmTrackId && selectedBgmFilename) {
      try {
        await this.repository.appendBgmHistory(task.channel_id, task.episode_id, selectedBgmTrackId, selectedBgmFilename);
      } catch {
        // Ignore non-fatal BGM history save error
      }
    }
    this.logger.ok("Quiz video rendered", { ...context, step: "render_video" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video render failed";
    if (task.episode_id) {
      await this.repository.removeQuestionHistoryEntries(task.channel_id, { renderTaskIds: [task.task_id] }).catch((historyError) => {
        this.logger.warn(`Question history rollback deferred: ${historyError instanceof Error ? historyError.message : "unknown error"}`, {
          ...context,
          step: "question_history_rollback",
        });
      });
    }
    await this.finish(task.task_id, "FAILED", message);
    this.logger.error(message, context);
  }
}

function getHyperframesInvocation(...args: string[]): { command: string; args: string[] } {
  try {
    const pkgJson = require.resolve("hyperframes/package.json");
    const binPath = path.join(path.dirname(pkgJson), "bin", "hyperframes.mjs");
    return {
      command: process.execPath,
      args: [binPath, ...args],
    };
  } catch {
    if (process.platform === "win32") {
      return {
        command: process.execPath,
        args: [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), "--yes", "hyperframes", ...args],
      };
    }
    return {
      command: "npx",
      args: ["--yes", "hyperframes", ...args],
    };
  }
}
