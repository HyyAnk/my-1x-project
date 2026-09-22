import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { IntroOutroScriptJobSchema, type IntroOutroScriptJob } from "@studio/shared";
import { IntroOutroScriptError } from "../errors.js";
import { IntroOutroScriptStorage, isMissingFile, safeScriptId } from "./storage.js";

export class IntroOutroJobStore {
  constructor(private readonly storage: IntroOutroScriptStorage) {}

  async save(job: IntroOutroScriptJob): Promise<IntroOutroScriptJob> {
    const root = path.join(await this.storage.channelRoot(job.channel_id), "jobs");
    await mkdir(root, { recursive: true });
    const parsed = IntroOutroScriptJobSchema.parse(job);
    await this.storage.repository.writeJsonAtomic(path.join(root, `${safeScriptId(job.job_id)}.json`), parsed);
    return parsed;
  }

  async get(channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
    const jobPath = path.join(await this.storage.channelRoot(channelId), "jobs", `${safeScriptId(jobId)}.json`);
    try {
      return IntroOutroScriptJobSchema.parse(JSON.parse(await readFile(jobPath, "utf8")));
    } catch (error) {
      if (isMissingFile(error)) throw new IntroOutroScriptError("Script job not found", "SCRIPT_JOB_NOT_FOUND");
      throw error;
    }
  }

  async list(channelId: string): Promise<IntroOutroScriptJob[]> {
    const jobsRoot = path.join(await this.storage.channelRoot(channelId), "jobs");
    const entries = await readdir(jobsRoot, { withFileTypes: true }).catch(() => []);
    const jobs = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => this.get(channelId, entry.name.slice(0, -5)).catch(() => null)),
    );
    return jobs.filter((job): job is IntroOutroScriptJob => Boolean(job));
  }

  async findByIdempotency(channelId: string, key: string): Promise<IntroOutroScriptJob | null> {
    return (await this.list(channelId)).find((job) => job.idempotency_key === key) ?? null;
  }
}
