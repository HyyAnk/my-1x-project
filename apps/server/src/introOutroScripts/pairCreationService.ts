import { randomUUID } from "node:crypto";
import { nowIso, type IntroOutroStyle } from "@studio/shared";
import type { z } from "zod";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { CreateIntroOutroStyleInputSchema } from "../routes/introOutro/introOutroSchemas.js";
import { parseIntroOutroVideoPayload } from "../routes/introOutro/introOutroPayload.js";
import { validateUploadScriptProvenance } from "../routes/introOutro/introOutroProvenance.js";
import { fingerprint } from "./fingerprint.js";
import { allocatePairName } from "./pairNumbering.js";
import { storePairClip } from "./pairClipStorage.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { IntroOutroScriptError } from "./errors.js";

type Input = z.output<typeof CreateIntroOutroStyleInputSchema>;

export class PairCreationService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly scripts: IntroOutroScriptRepository,
  ) {}

  async create(channelId: string, input: Input): Promise<IntroOutroStyle> {
    return this.scripts.withLock(`pair-create:${channelId}`, () => this.createLocked(channelId, input));
  }

  private async createLocked(channelId: string, input: Input): Promise<IntroOutroStyle> {
    const styleId = input.style_id ?? `style_${randomUUID()}`;
    const requestHash = fingerprint(input);
    const existing = await this.repository.getChannelIntroOutroStyle(channelId, styleId);
    if (existing) {
      if (existing.upload_fingerprint === requestHash) {
        await this.completeWorkspace(channelId, input);
        return existing;
      }
      throw new RepositoryError("Upload request ID already belongs to another pair", "VERSION_CONFLICT");
    }
    const project = input.script_project_id ? await this.scripts.getProject(channelId, input.script_project_id) : null;
    if (project && (project.style_preset_id !== input.style_preset_id || project.version !== input.script_project_version)) {
      throw new IntroOutroScriptError("The script draft changed. Refresh before uploading.", "VERSION_CONFLICT");
    }
    const clip = async (kind: "intro" | "outro") => {
      const provenance = await validateUploadScriptProvenance({
        scripts: this.scripts,
        channelId,
        stylePresetId: input.style_preset_id,
        clipKind: kind,
        provenance: input[`${kind}_script_provenance`],
      });
      const meta = await storePairClip(
        this.repository,
        channelId,
        styleId,
        kind,
        parseIntroOutroVideoPayload(input[`${kind}_data`]),
        input[`${kind}_filename`],
        input[`${kind}_mute_audio`],
      );
      return { ...meta, ...(provenance ? { script_provenance: provenance } : {}), script_text: input[`${kind}_script_text`] };
    };
    let style: IntroOutroStyle;
    try {
      const intro = await clip("intro");
      const outro = await clip("outro");
      style = {
        schema_version: 2,
        style_id: styleId,
        channel_id: channelId,
        style_preset_id: input.style_preset_id ?? null,
        name: input.auto_name ? await allocatePairName(this.repository, channelId, input.style_preset_id!) : input.name!,
        status: "active",
        intro,
        outro,
        transition_type: input.auto_name ? "stinger_swipe" : input.transition_type,
        transition_duration_seconds: input.auto_name ? 0.5 : input.transition_duration_seconds,
        audio_mode: input.auto_name ? "use_video_audio" : input.audio_mode,
        upload_fingerprint: requestHash,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      await this.repository.saveChannelIntroOutroStyle(channelId, style);
    } catch (error) {
      await this.repository.deleteChannelIntroOutroStyle(channelId, styleId);
      throw error;
    }
    await this.completeWorkspace(channelId, input);
    return style;
  }

  private async completeWorkspace(channelId: string, input: Input): Promise<void> {
    if (input.script_project_id && input.script_project_version) {
      try {
        await this.scripts.updateProject(channelId, input.script_project_id, input.script_project_version, (current) => ({
          ...current,
          archived: true,
        }));
      } catch (error) {
        if (!(error instanceof IntroOutroScriptError && error.code === "VERSION_CONFLICT")) throw error;
      }
    }
  }
}
