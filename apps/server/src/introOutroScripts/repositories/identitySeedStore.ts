import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CreativeSeedSchema, MascotStyleIdentityProfileSchema, type CreativeSeed, type MascotStyleIdentityProfile } from "@studio/shared";
import { IntroOutroScriptStorage, isMissingFile, safeScriptId } from "./storage.js";

export class IntroOutroIdentitySeedStore {
  constructor(private readonly storage: IntroOutroScriptStorage) {}

  async getIdentityProfile(mascotId: string, styleId: string): Promise<MascotStyleIdentityProfile | null> {
    const profilePath = this.storage.repository.resolvePath(
      "mascots",
      safeScriptId(mascotId),
      "intro_outro_identity",
      `${safeScriptId(styleId)}.json`,
    );
    try {
      return MascotStyleIdentityProfileSchema.parse(JSON.parse(await readFile(profilePath, "utf8")));
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async saveIdentityProfile(profile: MascotStyleIdentityProfile): Promise<MascotStyleIdentityProfile> {
    const parsed = MascotStyleIdentityProfileSchema.parse(profile);
    const profileDir = this.storage.repository.resolvePath("mascots", safeScriptId(profile.mascot_id), "intro_outro_identity");
    await mkdir(profileDir, { recursive: true });
    await this.storage.repository.writeJsonAtomic(path.join(profileDir, `${safeScriptId(profile.mascot_style_id)}.json`), parsed);
    return parsed;
  }

  async listCustomSeeds(channelId: string): Promise<CreativeSeed[]> {
    const seedsPath = path.join(await this.storage.channelRoot(channelId), "custom_seeds.json");
    try {
      const raw = JSON.parse(await readFile(seedsPath, "utf8")) as unknown;
      return Array.isArray(raw) ? raw.map((seed) => CreativeSeedSchema.parse(seed)) : [];
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
  }

  async saveCustomSeed(channelId: string, seed: CreativeSeed): Promise<CreativeSeed> {
    return this.storage.queue(`seeds:${channelId}`, async () => {
      const catalog = await this.listCustomSeeds(channelId);
      const latest = catalog.filter((item) => item.id === seed.id).sort((left, right) => right.revision - left.revision)[0];
      const parsed = CreativeSeedSchema.parse({
        ...seed,
        origin: "custom",
        revision: latest ? latest.revision + 1 : seed.revision,
      });
      const root = await this.storage.channelRoot(channelId);
      await mkdir(root, { recursive: true });
      await this.storage.repository.writeJsonAtomic(path.join(root, "custom_seeds.json"), [...catalog, parsed]);
      return parsed;
    });
  }
}
