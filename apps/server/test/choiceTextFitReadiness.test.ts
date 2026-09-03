import { describe, expect, it } from "vitest";
import { CANDY_ARCADE_FONTS, candyArcadeFontReadinessScript } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { evaluateBrowserScript } from "./helpers/browserScript.js";

describe("choice text fit readiness gate", () => {
  it("keeps render readiness closed when an answer group cannot fit", async () => {
    const attributes = new Map([
      ["data-choice-fit-status", "pending"],
      ["data-choice-fit-lines", "1"],
    ]);
    const properties = new Map<string, string>();
    const surface = { clientHeight: 80 };
    const layoutRegion = { clientWidth: 300, clientHeight: 120 };
    const choice = {
      clientWidth: 240,
      scrollWidth: 320,
      scrollHeight: 28,
      closest: () => surface,
      getBoundingClientRect: () => ({ left: 0, right: 240, top: 0, bottom: 28, width: 240, height: 28 }),
      ownerDocument: {
        createRange: () => ({
          selectNodeContents: () => undefined,
          getBoundingClientRect: () => ({ left: 0, right: 320, top: 0, bottom: 28, width: 320, height: 28 }),
        }),
      },
    };
    const group = {
      parentElement: layoutRegion,
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 300,
      offsetHeight: 120,
      style: {
        setProperty: (name: string, value: string) => properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      querySelectorAll: (selector: string) => (selector === ".choice-text" ? [choice] : []),
    };
    const documentStub = {
      documentElement: { dataset: {} as Record<string, string> },
      fonts: { load: () => Promise.resolve([{}]), check: () => true, ready: Promise.resolve() },
      querySelectorAll: (selector: string) => (selector.startsWith(".choice-group") ? [group] : []),
    };
    const windowStub = { __renderReady: false, __playerReady: false } as {
      parent?: unknown;
      __renderReady: boolean;
      __playerReady: boolean;
      __fontReadyPromise?: Promise<unknown>;
      __fontStatus?: unknown;
    };
    windowStub.parent = windowStub;

    evaluateBrowserScript<void>(candyArcadeFontReadinessScript(), {
      window: windowStub,
      document: documentStub,
      getComputedStyle: (element: unknown) => {
        if (element === group) {
          return {
            getPropertyValue: (name: string) =>
              ({
                "--choice-fit-min": "24px",
                "--choice-fit-max": "24px",
                "--choice-fit-max-lines": "1",
                "--choice-fit-leading": "1.08",
                "--choice-fit-multiline-gain": "6px",
              })[name] ?? "",
          };
        }
        if (element === surface) return { paddingTop: "10px", paddingBottom: "10px" };
        return { lineHeight: "25.92px", paddingLeft: "0px", paddingRight: "0px" };
      },
    });

    if (!windowStub.__fontReadyPromise) throw new Error("Font readiness script did not expose its completion promise");
    await expect(windowStub.__fontReadyPromise).rejects.toThrow("QUIZ_CHOICE_TEXT_OVERFLOW");
    expect(windowStub.__renderReady).toBe(false);
    expect(windowStub.__playerReady).toBe(false);
    expect(windowStub.__fontStatus).toEqual({
      state: "error",
      message: "QUIZ_CHOICE_TEXT_OVERFLOW: 1 answer group could not fit",
      families: CANDY_ARCADE_FONTS.map((font) => font.family),
    });
  });
});
