export type VisualProxyRule = {
  id: string;
  pattern: RegExp;
  fullProxy: string;
  inlineProxy: string;
  category?: string;
  forbiddenKeywords?: string[];
};

export type VisualSanitizationResult = {
  original: string;
  sanitized: string;
  changed: boolean;
  matchedRules: string[];
};

export type VisualSafetyValidation = {
  safe: boolean;
  violations: string[];
};
