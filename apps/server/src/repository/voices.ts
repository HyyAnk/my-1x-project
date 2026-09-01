import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  BUILTIN_DEFAULT_VOICE_ID,
  BUILTIN_DEFAULT_VOICE_PROFILE,
  VoiceProfileSchema,
  makeId,
  nowIso,
  type Channel,
  type VoiceProfile,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { STUDIO_RUNTIME_DIRECTORY } from "../runtimePaths.js";
import type { RepositoryRuntime } from "./runtime.js";

const BUILTIN_VOICE_ALIASES = new Set([BUILTIN_DEFAULT_VOICE_ID, "voice_733cff467b40478d", "voice_english_girl", "default"]);

export async function saveVoiceReference(
  this: RepositoryRuntime,
  channelId: string,
  content: Uint8Array,
): Promise<{ path: string; modified_at: string }> {
  const channel = await this.getChannel(channelId);
  const channelDirectory = this.resolvePath("channels", channel.slug);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(channelDirectory, assetsDirectory);
  const absolutePath = this.resolvePath("channels", channel.slug, "assets", "voice_reference.wav");
  await this.writeBinaryAtomic(absolutePath, content);
  await this.updateChannel(channelId, { voice_reference_path: `channels/${channel.slug}/assets/voice_reference.wav` });
  const metadata = await stat(absolutePath);
  return { path: `channels/${channel.slug}/assets/voice_reference.wav`, modified_at: metadata.mtime.toISOString() };
}

export async function listVoices(this: RepositoryRuntime): Promise<VoiceProfile[]> {
  await this.ensureBootstrap();
  const customVoices: VoiceProfile[] = [];
  try {
    const raw = JSON.parse(await readFile(path.join(this.roots.voices, "voices.json"), "utf8")) as unknown;
    if (Array.isArray(raw)) {
      for (const voice of raw) {
        const parsed = VoiceProfileSchema.parse(voice);
        if (!BUILTIN_VOICE_ALIASES.has(parsed.voice_id) && parsed.reference_path !== BUILTIN_DEFAULT_VOICE_PROFILE.reference_path) {
          customVoices.push(parsed);
        }
      }
      customVoices.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  } catch {
    // Fresh repository or unseeded custom voices.json returns empty custom list
  }
  return [VoiceProfileSchema.parse(BUILTIN_DEFAULT_VOICE_PROFILE), ...customVoices];
}

export async function getVoice(this: RepositoryRuntime, voiceId: string): Promise<VoiceProfile> {
  if (BUILTIN_VOICE_ALIASES.has(voiceId)) {
    return VoiceProfileSchema.parse(BUILTIN_DEFAULT_VOICE_PROFILE);
  }
  const voice = (await this.listVoices()).find((item) => item.voice_id === voiceId);
  if (!voice) throw new RepositoryError("Voice not found", "VOICE_NOT_FOUND");
  return voice;
}

export async function createVoiceProfile(
  this: RepositoryRuntime,
  name: string,
  referenceContent: Uint8Array,
  sampleContent: Uint8Array,
): Promise<VoiceProfile> {
  await this.ensureBootstrap();
  const voiceId = makeId("voice");
  const directory = this.resolvePath("voices", voiceId);
  await mkdir(directory, { recursive: true });
  const referencePath = `${STUDIO_RUNTIME_DIRECTORY}/voices/${voiceId}/reference.wav`;
  const samplePath = `${STUDIO_RUNTIME_DIRECTORY}/voices/${voiceId}/sample.wav`;
  await this.writeBinaryAtomic(path.join(directory, "reference.wav"), referenceContent);
  await this.writeBinaryAtomic(path.join(directory, "sample.wav"), sampleContent);
  const profile = VoiceProfileSchema.parse({
    voice_id: voiceId,
    name,
    reference_path: referencePath,
    sample_path: samplePath,
    created_at: nowIso(),
    is_builtin: false,
  });
  const customVoices = (await this.listVoices()).filter((item) => !item.is_builtin && item.voice_id !== BUILTIN_DEFAULT_VOICE_ID);
  await this.writeJsonAtomic(path.join(this.roots.voices, "voices.json"), [...customVoices, profile]);
  return profile;
}

export async function updateVoiceSample(this: RepositoryRuntime, voiceId: string, content: Uint8Array): Promise<VoiceProfile> {
  const voice = await this.getVoice(voiceId);
  if (voice.is_builtin || BUILTIN_VOICE_ALIASES.has(voiceId)) {
    throw new RepositoryError("Cannot modify built-in system voice sample", "BUILTIN_VOICE_IMMUTABLE");
  }
  await this.writeBinaryAtomic(this.resolveContextPath(voice.sample_path), content);
  return voice;
}

export async function deleteVoiceProfile(this: RepositoryRuntime, voiceId: string): Promise<void> {
  const voice = await this.getVoice(voiceId);
  if (voice.is_builtin || BUILTIN_VOICE_ALIASES.has(voiceId)) {
    throw new RepositoryError("Cannot delete built-in system voice", "BUILTIN_VOICE_IMMUTABLE");
  }
  const inUse = (await this.listChannels(true)).filter((channel) => channel.voice_reference_path === voice.reference_path);
  if (inUse.length > 0) throw new RepositoryError(`Voice is in use by ${inUse.length} channel(s)`, "VOICE_IN_USE");
  await this.removeTree(this.resolvePath("voices", voice.voice_id));
  const customVoices = (await this.listVoices()).filter(
    (item) => !item.is_builtin && item.voice_id !== voiceId && item.voice_id !== BUILTIN_DEFAULT_VOICE_ID,
  );
  await this.writeJsonAtomic(path.join(this.roots.voices, "voices.json"), customVoices);
}

export async function assignVoice(this: RepositoryRuntime, channelId: string, voiceId: string | null): Promise<Channel> {
  const voice = voiceId ? await this.getVoice(voiceId) : null;
  return this.updateChannel(channelId, { voice_reference_path: voice?.reference_path ?? null });
}

export async function getVoiceSampleFile(
  this: RepositoryRuntime,
  voiceId: string,
): Promise<{ absolutePath: string; size: number; modified_at: string }> {
  const voice = await this.getVoice(voiceId);
  const absolutePath = this.resolveContextPath(voice.sample_path);
  try {
    if (voice.is_builtin || voice.sample_path.startsWith("assets/")) {
      await this.assertRealPathInside(this.roots.assets, absolutePath);
    } else {
      await this.assertRealPathInside(this.roots.voices, absolutePath);
    }
    const metadata = await stat(absolutePath);
    return { absolutePath, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Voice preview not found", "VOICE_SAMPLE_NOT_FOUND");
  }
}
