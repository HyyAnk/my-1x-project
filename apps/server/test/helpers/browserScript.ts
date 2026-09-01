import { runInNewContext } from "node:vm";

type BrowserScriptGlobals = Readonly<Record<string, unknown>>;

export function evaluateBrowserScript<TResult>(source: string, globals: BrowserScriptGlobals = {}): TResult {
  const context: Record<string, unknown> = { ...globals };
  const result: unknown = runInNewContext(source, context);
  return result as TResult;
}
