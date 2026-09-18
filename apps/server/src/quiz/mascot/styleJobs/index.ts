/**
 * Mascot Style Generation Job Services Module
 *
 * Provides factory functions and exports for style background jobs.
 */

import type { RepositoryService } from "../../../repository.js";
import { MascotStyleJobRepository } from "./mascotStyleJobRepository.js";
import { MascotStyleJobManager } from "./mascotStyleJobManager.js";
import type { MascotStyleJobManagerOptions } from "./styleJobTypes.js";

export function createMascotStyleJobRepository(target: string | RepositoryService): MascotStyleJobRepository {
  return new MascotStyleJobRepository(target);
}

export function createMascotStyleJobManager(options: MascotStyleJobManagerOptions): MascotStyleJobManager {
  return new MascotStyleJobManager(options);
}

export { MascotStyleJobRepository, MascotStyleJobManager };
export * from "./styleJobTypes.js";
export * from "./mascotStyleJobStore.js";
