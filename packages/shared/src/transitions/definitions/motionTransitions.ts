import { registerTransitionImplementation } from "../catalog.js";
import { registerTransition } from "../transitionRegistry.js";
import type { TransitionDefinition } from "../types.js";
import { energySlashTransition } from "./energySlash.js";
import { morphWipeTransition } from "./morphWipe.js";

export const DYNAMIC_MOTION_TRANSITIONS = [
  morphWipeTransition,
  energySlashTransition,
] as const;

export function registerMotionTransitions(): void {
  for (const impl of DYNAMIC_MOTION_TRANSITIONS) {
    registerTransitionImplementation(impl);

    const definition: TransitionDefinition = {
      id: impl.id,
      name: impl.name,
      description: `Kinematic dynamic motion stinger: ${impl.name}`,
      category: "universal",
      defaultDuration: impl.defaultDurationSeconds,
      minDuration: impl.minDurationSeconds,
      maxDuration: impl.maxDurationSeconds,
      cssClass: impl.cssClass,
      tag: "Motion",
      iconName: "Lightning",
    };
    registerTransition(definition);
  }
}
