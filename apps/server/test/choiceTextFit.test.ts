import { describe, expect, it } from "vitest";
import { CANDY_ARCADE_FONTS, candyArcadeFontReadinessScript } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import {
  resolveChoiceGroupFit,
  type ChoiceGroupFitResult,
  type ResolveChoiceGroupFitInput,
} from "../src/quiz/render/choices/choiceTextFitPolicy.js";
import { choiceTextFitScript } from "../src/quiz/render/choices/choiceTextFitScript.js";
import { evaluateBrowserScript } from "./helpers/browserScript.js";

type ChoiceFitSummary = { groups: number; overflowGroups: number };

type ChoiceFitApi = {
  resolveChoiceGroupFit: (input: ResolveChoiceGroupFitInput) => ChoiceGroupFitResult;
  fitChoiceGroups: () => ChoiceFitSummary;
};

describe("Choice text fit policy & browser measurement", () => {
  describe("Group-fit algorithm policy", () => {
    it("uses the maximum one-line size when every answer fits", () => {
      expect(
        resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 2,
          multilineGain: 6,
          fits: (size, lines) => lines === 1 && size <= 64,
        }),
      ).toEqual({ fontSize: 64, lines: 1, status: "fit" });
    });

    it("returns one shared size constrained by the longest answer", () => {
      expect(
        resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 1,
          multilineGain: 6,
          fits: (size) => size <= 43,
        }),
      ).toEqual({ fontSize: 43, lines: 1, status: "fit" });
    });

    it("keeps one line when two lines gain only five pixels", () => {
      expect(
        resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 2,
          multilineGain: 6,
          fits: (size, lines) => size <= (lines === 1 ? 34 : 39),
        }),
      ).toEqual({ fontSize: 34, lines: 1, status: "fit" });
    });

    it("uses two lines when they gain exactly six pixels", () => {
      expect(
        resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 2,
          multilineGain: 6,
          fits: (size, lines) => size <= (lines === 1 ? 34 : 40),
        }),
      ).toEqual({ fontSize: 40, lines: 2, status: "fit" });
    });

    it("returns the readable floor and overflow status when no mode fits", () => {
      expect(
        resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 2,
          multilineGain: 6,
          fits: () => false,
        }),
      ).toEqual({ fontSize: 24, lines: 2, status: "overflow" });
    });
  });

  describe("Browser script execution and DOM measurements", () => {
    it("emits executable browser code with the real fit policy", () => {
      const script = choiceTextFitScript();
      const api = evaluateBrowserScript<ChoiceFitApi>(`${script}; ({ resolveChoiceGroupFit, fitChoiceGroups });`);

      expect(script).toContain("const __name=(target)=>target;");
      expect(
        api.resolveChoiceGroupFit({
          minFontSize: 24,
          maxFontSize: 64,
          maxLines: 1,
          multilineGain: 6,
          fits: (size) => size <= 51,
        }),
      ).toEqual({ fontSize: 51, lines: 1, status: "fit" });
      expect(typeof api.fitChoiceGroups).toBe("function");
    });

    it("returns an empty summary when a document has no answer groups", () => {
      expect(
        evaluateBrowserScript<ChoiceFitSummary>(`${choiceTextFitScript()}; fitChoiceGroups();`, {
          document: { querySelectorAll: () => [] },
          getComputedStyle: () => ({}),
        }),
      ).toEqual({ groups: 0, overflowGroups: 0 });
    });

    it("applies one measured multiline size to the complete answer group", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 48, twoLineMax: 60 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.properties.get("--choice-fitted-font-size")).toBe("60px");
      expect(fixture.properties.get("--choice-fitted-line-height")).toBe("1.08");
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("2");
      expect(fixture.attributes.get("data-choice-fit-status")).toBe("fit");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("60");
    });

    it("keeps a true one-line fit when font ink extends beyond its line box", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, glyphOverflow: 4 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("64");
    });

    it("shrinks when the answer group expands beyond its allocated layout region", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, groupFitMax: 44 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("44");
    });

    it("shrinks when a visual card expands beyond its grid track", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, cardFitMax: 41 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("41");
    });

    it("ignores an outward visual transform when the logical card still fits", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, cardPaintScale: 1.03 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("64");
    });

    it("does not let an inward visual transform hide logical card overflow", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, cardFitMax: 44, cardPaintScale: 0.8 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("44");
    });

    it("measures direct-child offsets when the browser reports no offset parent", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64, groupFitMax: 43, offsetParentAvailable: false });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("43");
    });

    it("shrinks when rounded scroll metrics hide subpixel text overflow", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 42, twoLineMax: 41, subpixelOverflowAt: 42 });

      expect(runFitChoiceGroups(fixture)).toEqual({ groups: 1, overflowGroups: 0 });
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-font-size")).toBe("41");
    });

    it("clears partial measurements when reverting to tier CSS fallback", () => {
      const fixture = createMeasurementFixture({ oneLineMax: 64, twoLineMax: 64 });
      fixture.properties.set("--choice-fitted-font-size", "51px");
      fixture.properties.set("--choice-fitted-line-height", "1.08");
      fixture.attributes.set("data-choice-fit-lines", "2");
      fixture.attributes.set("data-choice-fit-font-size", "51");

      expect(
        evaluateBrowserScript<ChoiceFitSummary & { fallback: true; message: string }>(
          `${choiceTextFitScript()}; resetChoiceGroupsToFallback(new Error("measurement failed"));`,
          { document: fixture.document },
        ),
      ).toEqual({ groups: 1, overflowGroups: 0, fallback: true, message: "measurement failed" });
      expect(fixture.properties.has("--choice-fitted-font-size")).toBe(false);
      expect(fixture.properties.has("--choice-fitted-line-height")).toBe(false);
      expect(fixture.attributes.get("data-choice-fit-lines")).toBe("1");
      expect(fixture.attributes.get("data-choice-fit-status")).toBe("fallback");
      expect(fixture.attributes.has("data-choice-fit-font-size")).toBe(false);
    });
  });

  describe("Readiness gate integration", () => {
    it("keeps render readiness closed when an answer group cannot fit", async () => {
      const attributes = new Map([
        ["data-choice-fit-status", "pending"],
        ["data-choice-fit-lines", "1"],
      ]);
      const properties = new Map<string, string>();
      const surface = { clientHeight: 80 };
      const layoutRegion = {
        clientWidth: 300,
        clientHeight: 120,
        getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 120, width: 300, height: 120 }),
      };
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
        getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 120, width: 300, height: 120 }),
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
});

function runFitChoiceGroups(fixture: ReturnType<typeof createMeasurementFixture>): ChoiceFitSummary {
  return evaluateBrowserScript<ChoiceFitSummary>(`${choiceTextFitScript()}; fitChoiceGroups();`, {
    document: fixture.document,
    getComputedStyle: fixture.getComputedStyle,
  });
}

function createMeasurementFixture(options: {
  oneLineMax: number;
  twoLineMax: number;
  glyphOverflow?: number;
  groupFitMax?: number;
  cardFitMax?: number;
  groupPaintScale?: number;
  cardPaintScale?: number;
  offsetParentAvailable?: boolean;
  subpixelOverflowAt?: number;
}) {
  const properties = new Map<string, string>();
  const attributes = new Map<string, string>([
    ["data-choice-fit-status", "pending"],
    ["data-choice-fit-lines", "1"],
  ]);
  const surface = { clientHeight: 160 };
  const currentSize = () => Number.parseFloat(properties.get("--choice-fitted-font-size") ?? "0");
  const currentLines = () => Number(attributes.get("data-choice-fit-lines") ?? "1");
  const text = {
    clientWidth: 300,
    getBoundingClientRect: () => rectangle(0, 0, 300, currentSize() * 1.08),
    ownerDocument: {
      createRange: () => ({
        selectNodeContents: () => undefined,
        getBoundingClientRect: () =>
          rectangle(0, 0, options.subpixelOverflowAt && currentSize() >= options.subpixelOverflowAt ? 276.4 : 250, currentSize() * 1.08),
      }),
    },
    closest: () => surface,
    get scrollWidth() {
      const max = currentLines() === 1 ? options.oneLineMax : options.twoLineMax;
      return currentSize() <= max ? 300 : 360;
    },
    get scrollHeight() {
      return currentSize() * 1.08 * currentLines() + (options.glyphOverflow ?? 0);
    },
  };
  const layoutRegion = {
    clientWidth: 300,
    clientHeight: 200,
    getBoundingClientRect: () => rectangle(0, 0, 300, 200),
  };
  const groupLogicalWidth = () => (currentSize() <= (options.groupFitMax ?? Number.POSITIVE_INFINITY) ? 300 : 340);
  const group = {
    parentElement: layoutRegion,
    offsetParent: options.offsetParentAvailable === false ? null : layoutRegion,
    offsetLeft: 0,
    offsetTop: 0,
    clientWidth: 300,
    clientHeight: 200,
    get offsetWidth() {
      return groupLogicalWidth();
    },
    offsetHeight: 200,
    style: {
      setProperty: (name: string, value: string) => properties.set(name, value),
      removeProperty: (name: string) => properties.delete(name),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    getBoundingClientRect: () => scaledRectangle(groupLogicalWidth(), 200, options.groupPaintScale ?? 1),
    querySelectorAll: (selector: string) => (selector === ".choice-text" ? [text, text] : selector === ".choice-card" ? [card, card] : []),
  };
  const cardLogicalWidth = () => (currentSize() <= (options.cardFitMax ?? Number.POSITIVE_INFINITY) ? 300 : 330);
  const card = {
    parentElement: group,
    offsetParent: options.offsetParentAvailable === false ? null : group,
    offsetLeft: 0,
    offsetTop: 0,
    get offsetWidth() {
      return cardLogicalWidth();
    },
    offsetHeight: 200,
    getBoundingClientRect: () => rectangle(0, 0, cardLogicalWidth(), 200),
  };
  const tokens: Record<string, string> = {
    "--choice-fit-min": "24px",
    "--choice-fit-max": "64px",
    "--choice-fit-max-lines": "2",
    "--choice-fit-leading": "1.08",
    "--choice-fit-multiline-gain": "6px",
  };

  return {
    attributes,
    properties,
    document: { querySelectorAll: () => [group] },
    getComputedStyle: (element: unknown) => {
      if (element === group) return { getPropertyValue: (name: string) => tokens[name] ?? "" };
      if (element === surface) return { paddingTop: "10px", paddingBottom: "10px" };
      return { lineHeight: `${currentSize() * 1.08}px`, paddingLeft: "0px", paddingRight: "24px" };
    },
  };
}

function rectangle(left: number, top: number, right: number, bottom: number) {
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function scaledRectangle(width: number, height: number, scale: number) {
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  return rectangle((width - scaledWidth) / 2, (height - scaledHeight) / 2, (width + scaledWidth) / 2, (height + scaledHeight) / 2);
}
