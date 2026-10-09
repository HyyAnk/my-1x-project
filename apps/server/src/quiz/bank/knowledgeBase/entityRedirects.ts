import fs from "node:fs";
import path from "node:path";

/** Retired entity id (merged duplicate or relocated subject) mapped to the id that replaced it. */
export type EntityRedirectMap = ReadonlyMap<string, string>;

const REDIRECTS_FILENAME = "entity_redirects.json";
const MAX_REDIRECT_HOPS = 8;

/** The redirect table lives next to the entities folder: knowledge_base/entity_redirects.json. */
export function resolveEntityRedirectsPath(entitiesDir: string): string {
  return path.join(path.dirname(entitiesDir), REDIRECTS_FILENAME);
}

export function entityRedirectsFingerprint(entitiesDir: string): string {
  const redirectsPath = resolveEntityRedirectsPath(entitiesDir);
  if (!fs.existsSync(redirectsPath)) return "redirects:none";
  const stat = fs.statSync(redirectsPath);
  return `redirects:${stat.mtimeMs}:${stat.size}`;
}

export function loadEntityRedirects(entitiesDir: string): EntityRedirectMap {
  const redirectsPath = resolveEntityRedirectsPath(entitiesDir);
  if (!fs.existsSync(redirectsPath)) return new Map();
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(redirectsPath, "utf-8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return new Map();
    return new Map(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== entry[0]),
    );
  } catch {
    return new Map();
  }
}

/** Follows redirect chains (A -> B -> C) to the current id; stops on cycles or after a bounded number of hops. */
export function resolveEntityRedirect(id: string, redirects: EntityRedirectMap): string {
  let current = id;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    const next = redirects.get(current);
    if (!next || next === id) return current;
    current = next;
  }
  return current;
}
