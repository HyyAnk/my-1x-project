import type { MascotRenderAspectRatio } from "@studio/shared";

export type SubComposition = {
  id: string;
  start: string;
  duration: string;
  trackIndex: string;
  revealAt?: string;
  transitionInstance?: string;
  className?: string;
  html: string;
};

export function requiredAttribute(tag: string, name: string): string {
  const value = tag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];
  if (!value) throw new Error(`Candy Arcade clip is missing ${name}`);
  return value;
}

export function rootRelativeSubCompositionAssets(html: string): string {
  return html
    .replace(/\b(src|poster)=(["'])\.\//g, "$1=$2")
    .replace(/\b(src|poster)=(["'])\/(mascot-assets\/)/g, "$1=$2$3")
    .replace(/url\((['"]?)\.\//g, "url($1")
    .replace(/url\((['"]?)\/(mascot-assets\/)/g, "url($1$2");
}

export function sanitizeSubCompositionRootStyle(openingTag: string): string {
  if (/\sstyle="([^"]*)"/.test(openingTag)) {
    return openingTag.replace(/\sstyle="([^"]*)"/, (_, styleContent: string) => {
      if (/--clip-start:\s*[^;]+;?/.test(styleContent)) {
        const sanitized = styleContent.replace(/--clip-start:\s*[^;]+;?/, "--clip-start: 0s;");
        return ` style="${sanitized}"`;
      }
      const trimmed = styleContent.trim();
      const separator = trimmed.length > 0 && !trimmed.endsWith(";") ? ";" : "";
      return ` style="--clip-start: 0s; ${trimmed}${separator}"`;
    });
  }
  return openingTag.replace(/>$/, ' style="--clip-start: 0s;">');
}

export function toSubComposition(clip: string, aspectRatio: MascotRenderAspectRatio = "16:9"): SubComposition {
  const openingTag = clip.match(/^<section\b[^>]*>/)?.[0];
  if (!openingTag) throw new Error("Candy Arcade clip must start with a section element");
  const id = requiredAttribute(openingTag, "id");
  const start = requiredAttribute(openingTag, "data-start");
  const duration = requiredAttribute(openingTag, "data-duration");
  const trackIndex = requiredAttribute(openingTag, "data-track-index");
  const revealAt = openingTag.match(/\sdata-reveal-at="([^"]+)"/)?.[1];
  const transitionInstance = openingTag.match(/\sdata-transition-instance="([^"]+)"/)?.[1];
  const className = openingTag.match(/\sclass="([^"]+)"/)?.[1];
  const sanitizedTag = sanitizeSubCompositionRootStyle(openingTag);
  const sceneRoot = sanitizedTag
    .replace(/\sdata-start="[^"]*"/g, "")
    .replace(/\sdata-duration="[^"]*"/g, "")
    .replace(/\sdata-track-index="[^"]*"/g, "")
    .replace(
      />$/,
      ` data-composition-id="${id}" data-no-timeline data-width="${aspectRatio === "9:16" ? 1080 : 1920}" data-height="${aspectRatio === "9:16" ? 1920 : 1080}" data-aspect-ratio="${aspectRatio}">`,
    );
  const body = rootRelativeSubCompositionAssets(clip.replace(openingTag, sceneRoot));
  return {
    id,
    start,
    duration,
    trackIndex,
    revealAt,
    transitionInstance,
    className,
    html: `<template id="${id}-template">${body}</template>`,
  };
}

export function subCompositionMount(scene: SubComposition): string {
  const revealAttr = scene.revealAt ? ` data-reveal-at="${scene.revealAt}"` : "";
  const instanceAttr = scene.transitionInstance ? ` data-transition-instance="${scene.transitionInstance}"` : "";
  const classAttr = scene.className ? ` class="sub-composition ${scene.className}"` : ' class="sub-composition"';
  return `<div id="${scene.id}-mount"${classAttr} data-composition-id="${scene.id}" data-composition-src="compositions/${scene.id}.html" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="${scene.trackIndex}"${revealAttr}${instanceAttr} data-no-timeline></div>`;
}
