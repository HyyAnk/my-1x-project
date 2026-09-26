import {
  findMascotStyleByBuiltInPreset,
  resolveMascotStyle,
  type Channel,
  type IntroOutroScriptContext,
  type MascotProfile,
  type MascotStyle,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { IntroOutroScriptError } from "./errors.js";
import { resolveLogoReference, resolveMascotReference, type ResolvedReference } from "./referenceResolver.js";
import type { IntroOutroScriptRepository } from "./repository.js";

export type { ResolvedReference } from "./referenceResolver.js";

export type PreviewResolvedIntroOutroContext = {
  publicContext: IntroOutroScriptContext;
  channel: Channel;
  mascot: MascotProfile | null;
  style: MascotStyle | null;
  mascotReference: ResolvedReference | null;
  logoReference: ResolvedReference | null;
  identity: MascotStyleIdentityProfile | null;
};

export type ResolvedIntroOutroContext = Omit<PreviewResolvedIntroOutroContext, "mascot" | "style" | "mascotReference"> & {
  mascot: MascotProfile;
  style: MascotStyle;
  mascotReference: ResolvedReference;
};

type ResolveContextParams = {
  repository: RepositoryService;
  scripts: IntroOutroScriptRepository;
  channelId: string;
  stylePresetId: string;
  mascotStyleId?: string;
};

function resolveStyle(mascot: MascotProfile, stylePresetId: string, explicitStyleId?: string): MascotStyle {
  if (explicitStyleId) {
    const explicit = mascot.styles?.find((style) => style.id === explicitStyleId);
    if (!explicit) throw new IntroOutroScriptError("The selected mascot style does not exist", "MASCOT_STYLE_NOT_FOUND");
    return explicit;
  }
  const mapped = findMascotStyleByBuiltInPreset(mascot, stylePresetId);
  if (mapped) return mapped;
  if (stylePresetId === "uncategorized") return resolveMascotStyle(mascot, mascot.active_style_id);
  throw new IntroOutroScriptError("No mascot style is mapped to this Intro & Outro category", "MASCOT_STYLE_NOT_MAPPED");
}

function emptyPublicContext(channelId: string, stylePresetId: string): IntroOutroScriptContext {
  return {
    channel_id: channelId,
    style_preset_id: stylePresetId,
    mascot_id: null,
    mascot_name: null,
    mascot_style_id: null,
    mascot_style_name: null,
    mascot_style_revision: null,
    mascot_reference_url: null,
    logo_reference_url: null,
    identity_profile_id: null,
    identity_status: "missing",
    issues: [],
  };
}

export async function resolveIntroOutroContextPreview(params: ResolveContextParams): Promise<PreviewResolvedIntroOutroContext> {
  const { repository, scripts, channelId, stylePresetId } = params;
  const channel = await repository.getChannel(channelId);
  const publicContext = emptyPublicContext(channelId, stylePresetId);
  const logoReference = await resolveLogoReference(repository, channel).catch(() => null);
  publicContext.logo_reference_url = logoReference?.url ?? null;
  if (!logoReference) {
    publicContext.issues.push({
      code: "CHANNEL_LOGO_MISSING",
      message: "No channel logo is configured. Scripts will avoid logo interaction until one is added.",
      blocking: false,
    });
  }

  if (!channel.mascot_id) {
    publicContext.issues.unshift({
      code: "MASCOT_NOT_ASSIGNED",
      message: "Assign a mascot to this channel before generating scripts.",
      blocking: true,
    });
    return { publicContext, channel, mascot: null, style: null, mascotReference: null, logoReference, identity: null };
  }

  const mascot = await repository.getMascot(channel.mascot_id);
  publicContext.mascot_id = mascot.id;
  publicContext.mascot_name = mascot.name;
  let style: MascotStyle;
  try {
    style = resolveStyle(mascot, stylePresetId, params.mascotStyleId);
  } catch (error) {
    const scriptError = error instanceof IntroOutroScriptError ? error : null;
    publicContext.issues.unshift({
      code: scriptError?.code ?? "MASCOT_STYLE_NOT_MAPPED",
      message: scriptError?.message ?? "The mascot style could not be resolved.",
      blocking: true,
    });
    return { publicContext, channel, mascot, style: null, mascotReference: null, logoReference, identity: null };
  }

  publicContext.mascot_style_id = style.id;
  publicContext.mascot_style_name = style.name;
  publicContext.mascot_style_revision = style.style_revision ?? 1;
  const mascotReference = await resolveMascotReference(repository, mascot, style).catch(() => null);
  if (!mascotReference) {
    publicContext.issues.unshift({
      code: "STYLE_REFERENCE_MISSING",
      message: "Prepare an anchor image for the mascot style used by this category.",
      blocking: true,
    });
  } else {
    publicContext.mascot_reference_url = mascotReference.url;
  }

  const identity = await scripts.getIdentityProfile(mascot.id, style.id);
  const identityStatus = !identity
    ? "missing"
    : !mascotReference || identity.reference_sha256 !== mascotReference.sha256 || identity.style_revision !== (style.style_revision ?? 1)
      ? "stale"
      : identity.status;
  publicContext.identity_profile_id = identity?.profile_id ?? null;
  publicContext.identity_status = identityStatus;
  if (identityStatus !== "reviewed" && identityStatus !== "ready") {
    publicContext.issues.push({
      code: identityStatus === "stale" ? "IDENTITY_PROFILE_STALE" : "IDENTITY_REVIEW_REQUIRED",
      message:
        identityStatus === "stale"
          ? "The changed mascot style will be analyzed during generation."
          : "Mascot identity will be prepared during generation.",
      blocking: false,
    });
  }

  return { publicContext, channel, mascot, style, mascotReference, logoReference, identity };
}

export async function resolveIntroOutroContext(params: ResolveContextParams): Promise<ResolvedIntroOutroContext> {
  const preview = await resolveIntroOutroContextPreview(params);
  if (!preview.mascot || !preview.style || !preview.mascotReference) {
    const issue = preview.publicContext.issues.find((item) => item.blocking);
    throw new IntroOutroScriptError(issue?.message ?? "Mascot context is unavailable", issue?.code ?? "MASCOT_CONTEXT_UNAVAILABLE");
  }
  return preview as ResolvedIntroOutroContext;
}
