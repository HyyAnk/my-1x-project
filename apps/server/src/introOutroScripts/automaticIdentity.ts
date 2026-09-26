import { nowIso, type MascotStyleIdentityProfile } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { resolveIntroOutroContext, type ResolvedIntroOutroContext } from "./contextResolver.js";
import { IntroOutroScriptError } from "./errors.js";
import { analyzeMascotStyleIdentity } from "./identityAnalyzer.js";
import type { IntroOutroScriptRepository } from "./repository.js";

type Input = {
  repository: RepositoryService;
  scripts: IntroOutroScriptRepository;
  client: LLMClient;
  model: string;
  channelId: string;
  stylePresetId: string;
  mascotStyleId?: string;
  force: boolean;
  signal: AbortSignal;
  onProgress: (step: string) => Promise<void>;
};

export async function prepareAutomaticIdentity(
  input: Input,
): Promise<ResolvedIntroOutroContext & { identity: MascotStyleIdentityProfile }> {
  const initial = await resolveIntroOutroContext(input);
  return input.scripts.withLock(`identity:${initial.mascot.id}:${initial.style.id}`, async () => {
    input.signal.throwIfAborted();
    const context = await resolveIntroOutroContext(input);
    const reusable = context.identity && context.publicContext.identity_status !== "stale";
    if (!input.force && reusable) {
      const identity = context.identity!;
      if (identity.status === "ready" || identity.status === "reviewed") return { ...context, identity };
      input.signal.throwIfAborted();
      const accepted = await input.scripts.saveIdentityProfile({ ...identity, status: "ready", updated_at: nowIso() });
      return { ...context, identity: accepted };
    }
    await input.onProgress("Analyzing identity");
    const analyzed = await analyzeMascotStyleIdentity(inputWithContext(input, context));
    input.signal.throwIfAborted();
    const latest = await resolveIntroOutroContext(input);
    if (
      latest.mascot.id !== context.mascot.id ||
      latest.style.id !== context.style.id ||
      latest.mascotReference.sha256 !== context.mascotReference.sha256 ||
      latest.style.style_revision !== context.style.style_revision ||
      latest.identity?.updated_at !== context.identity?.updated_at
    ) {
      throw new IntroOutroScriptError("Mascot style changed during analysis. Retry generation.", "IDENTITY_PROFILE_STALE");
    }
    input.signal.throwIfAborted();
    const identity = await input.scripts.saveIdentityProfile({ ...analyzed, status: "ready", reviewed_at: null });
    return { ...latest, identity };
  });
}

function inputWithContext(input: Input, context: ResolvedIntroOutroContext) {
  return { client: input.client, context, model: input.model, signal: input.signal };
}
