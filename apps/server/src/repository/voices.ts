import { mkdir, readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { VoiceProfileSchema, makeId, nowIso, type Channel, type VoiceProfile } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function saveVoiceReference(this: RepositoryRuntime,channelId: string, content: Uint8Array): Promise<{ path: string; modified_at: string }> {
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
  try {
    const raw = JSON.parse(await readFile(path.join(this.roots.voices, "voices.json"), "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((voice) => VoiceProfileSchema.parse(voice)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

export async function getVoice(this: RepositoryRuntime,voiceId: string): Promise<VoiceProfile> {
  const voice = (await this.listVoices()).find((item) => item.voice_id === voiceId);
  if (!voice) throw new RepositoryError("Voice not found", "VOICE_NOT_FOUND");
  return voice;
}

export async function createVoiceProfile(this: RepositoryRuntime,name: string, referenceContent: Uint8Array, sampleContent: Uint8Array): Promise<VoiceProfile> {
  await this.ensureBootstrap();
  const voiceId = makeId("voice");
  const directory = this.resolvePath("voices", voiceId);
  await mkdir(directory, { recursive: true });
  const referencePath = `.documentary-studio/voices/${voiceId}/reference.wav`;
  const samplePath = `.documentary-studio/voices/${voiceId}/sample.wav`;
  await this.writeBinaryAtomic(path.join(directory, "reference.wav"), referenceContent);
  await this.writeBinaryAtomic(path.join(directory, "sample.wav"), sampleContent);
  const profile = VoiceProfileSchema.parse({ voice_id: voiceId, name, reference_path: referencePath, sample_path: samplePath, created_at: nowIso() });
  await this.writeJsonAtomic(path.join(this.roots.voices, "voices.json"), [...(await this.listVoices()), profile]);
  return profile;
}

export async function updateVoiceSample(this: RepositoryRuntime,voiceId: string, content: Uint8Array): Promise<VoiceProfile> {
  const voice = await this.getVoice(voiceId);
  await this.writeBinaryAtomic(this.resolveContextPath(voice.sample_path), content);
  return voice;
}

export async function deleteVoiceProfile(this: RepositoryRuntime,voiceId: string): Promise<void> {
  const voice = await this.getVoice(voiceId);
  const inUse = (await this.listChannels(true)).filter((channel) => channel.voice_reference_path === voice.reference_path);
  if (inUse.length > 0) throw new RepositoryError(`Voice is in use by ${inUse.length} channel(s)`, "VOICE_IN_USE");
  await this.removeTree(this.resolvePath("voices", voice.voice_id));
  await this.writeJsonAtomic(path.join(this.roots.voices, "voices.json"), (await this.listVoices()).filter((item) => item.voice_id !== voiceId));
}

export async function assignVoice(this: RepositoryRuntime,channelId: string, voiceId: string | null): Promise<Channel> {
  const voice = voiceId ? await this.getVoice(voiceId) : null;
  return this.updateChannel(channelId, { voice_reference_path: voice?.reference_path ?? null });
}

export async function getVoiceSampleFile(this: RepositoryRuntime,voiceId: string): Promise<{ absolutePath: string; size: number; modified_at: string }> {
  const voice = await this.getVoice(voiceId);
  const absolutePath = this.resolveContextPath(voice.sample_path);
  try {
    await this.assertRealPathInside(this.roots.voices, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Voice preview not found", "VOICE_SAMPLE_NOT_FOUND");
  }
}
