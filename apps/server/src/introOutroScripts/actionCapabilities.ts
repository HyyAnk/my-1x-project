export const ACTION_CAPABILITIES = [
  { capability: "locomotion", pattern: /\b(?:walks?|steps?|bounces?|jogs?|runs?|moves?|travels?|departs?|exits?|enters?|weight shift)\b/i },
  { capability: "waving", pattern: /\bwav(?:e|es|ing)\b/i },
  { capability: "pointing", pattern: /\b(?:points?|pointing|presents?|presenting|gestures? (?:toward|to))\b/i },
] as const;
