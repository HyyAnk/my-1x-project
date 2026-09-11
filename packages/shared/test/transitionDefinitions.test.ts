import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
  computeCatalogRevision,
  getTransitionDefinition,
  listTransitionDefinitions,
  registerTransitionImplementation,
  resetTransitionCatalog,
} from "../src/transitions/catalog.js";
import { contextForDefinition } from "./helpers/transitionContext.js";

describe("Canonical Transition Definitions & Catalog (Task 2)", () => {
  const definitions = listTransitionDefinitions();

  it("registers at least 6 canonical transitions with unique IDs", () => {
    assert.ok(definitions.length >= 6);
    const ids = definitions.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  for (const definition of definitions) {
    describe(`Definition: ${definition.id}`, () => {
      it("has valid metadata and timing bounds", () => {
        assert.ok(definition.id.length > 0);
        assert.ok(definition.name.length > 0);
        assert.ok(definition.implementationRevision.length > 0);
        assert.ok(definition.placements.length > 0);
        assert.ok(definition.minDurationSeconds <= definition.maxDurationSeconds);
        assert.ok(definition.defaultDurationSeconds >= definition.minDurationSeconds);
        assert.ok(definition.defaultDurationSeconds <= definition.maxDurationSeconds);
      });

      it("renders markup deterministically without unseeded randomness", () => {
        const context = contextForDefinition(definition);
        const render1 = definition.renderMarkup(context);
        const render2 = definition.renderMarkup(context);
        assert.equal(render1, render2);
        assert.doesNotMatch(definition.styles, /Math\.random|Date\.now/);
      });

      it("escapes special HTML characters in context colors", () => {
        const maliciousContext = contextForDefinition(definition, {
          fromColor: 'red"><script>alert(1)</script>',
          toColor: "blue' onmouseover='alert(2)",
          inkColor: 'white&"<>',
        });
        const markup = definition.renderMarkup(maliciousContext);
        assert.doesNotMatch(markup, /<script>/);
        assert.doesNotMatch(markup, /onmouseover/);
      });
    });
  }

  it("computes a deterministic content-addressed catalog revision", () => {
    const rev1 = computeCatalogRevision();
    const rev2 = computeCatalogRevision();
    assert.equal(rev1, rev2);
    assert.equal(typeof rev1, "string");
    assert.equal(rev1.length, 64); // SHA-256 hex length
  });

  it("invalidates catalog revision when a definition changes", () => {
    const originalRev = computeCatalogRevision();
    registerTransitionImplementation({
      id: "temporary_test_effect",
      implementationRevision: "2.0.0",
      name: "Temporary Effect",
      placements: ["scene"],
      defaultDurationSeconds: 0.5,
      minDurationSeconds: 0.1,
      maxDurationSeconds: 1.0,
      cssClass: "transition-temp",
      handoff: { kind: "cover", progress: 0.5 },
      renderMarkup: () => "<div>temp</div>",
      styles: ".transition-temp { color: red; }",
    });

    const newRev = computeCatalogRevision();
    assert.notEqual(newRev, originalRev);

    resetTransitionCatalog();
    assert.equal(computeCatalogRevision(), originalRev);
  });
});
