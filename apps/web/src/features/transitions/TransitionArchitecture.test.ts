import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const WEB_SRC_DIR = path.resolve(__dirname, "../../");

function collectSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".turbo") {
        collectSourceFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      if (!entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe("Task 9: Static Architecture & AST Invariant Checks", () => {
  const sourceFiles = collectSourceFiles(WEB_SRC_DIR);

  it("proves zero imports of legacy preview or simulated transition modules across web src", () => {
    const forbiddenModulePatterns = [
      "transitionOverlayRenderer",
      "TransitionSceneA",
      "TransitionSceneB",
      "TransitionOverlay",
      "useTransitionPlayback",
      "TransitionPlaybackControls",
    ];

    const violations: { file: string; importModule: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            for (const forbidden of forbiddenModulePatterns) {
              if (moduleSpecifier.text.includes(forbidden)) {
                violations.push({ file: path.relative(WEB_SRC_DIR, filePath), importModule: moduleSpecifier.text });
              }
            }
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("proves no frontend components perform custom visual dispatch branches on transition IDs", () => {
    const canonicalCoreIds = ["crossfade", "stinger_swipe", "cut", "bubble_splash", "brush_wave", "lightning_brush"];
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of sourceFiles) {
      // Exclude tests or shared catalog definitions
      if (filePath.includes("catalog.ts") || filePath.includes("transition.schemas.ts")) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const checkNode = (node: ts.Node) => {
        // Look for switch statements switching on transitionId or transitionType with case clauses rendering visual elements
        if (ts.isSwitchStatement(node)) {
          const exprText = node.expression.getText(sourceFile);
          if (exprText.includes("transition") || exprText.includes("Transition")) {
            for (const clause of node.caseBlock.clauses) {
              if (ts.isCaseClause(clause)) {
                const caseExpr = clause.expression.getText(sourceFile).replace(/['"]/g, "");
                if (canonicalCoreIds.includes(caseExpr)) {
                  const { line } = sourceFile.getLineAndCharacterOfPosition(clause.getStart(sourceFile));
                  violations.push({
                    file: path.relative(WEB_SRC_DIR, filePath),
                    line: line + 1,
                    text: clause.getText(sourceFile).slice(0, 80),
                  });
                }
              }
            }
          }
        }
        ts.forEachChild(node, checkNode);
      };

      ts.forEachChild(sourceFile, checkNode);
    }

    expect(violations).toEqual([]);
  });

  it("proves zero duplicated effect allowlists in web components; all options derive from single catalog", () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const checkNode = (node: ts.Node) => {
        if (ts.isArrayLiteralExpression(node)) {
          const elements = node.elements;
          const stringElements = elements
            .filter((e) => ts.isStringLiteral(e))
            .map((e) => (e as ts.StringLiteral).text);

          // If an array literal hardcodes multiple known transition IDs
          const matches = stringElements.filter((str) =>
            ["stinger_swipe", "bubble_splash", "brush_wave", "lightning_brush"].includes(str),
          );

          if (matches.length >= 2) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            violations.push({
              file: path.relative(WEB_SRC_DIR, filePath),
              line: line + 1,
              text: node.getText(sourceFile).slice(0, 100),
            });
          }
        }
        ts.forEachChild(node, checkNode);
      };

      ts.forEachChild(sourceFile, checkNode);
    }

    expect(violations).toEqual([]);
  });

  it("proves zero independent frontend motion simulation math in web components", () => {
    // Check that no components calculate synthetic transition progress with sine/cosine or ease math
    const violations: { file: string; line: number; pattern: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const checkNode = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const callText = node.expression.getText(sourceFile);
          if (callText === "Math.sin" || callText === "Math.cos") {
            const relPath = path.relative(WEB_SRC_DIR, filePath);
            if (relPath.includes("transition")) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              violations.push({
                file: relPath,
                line: line + 1,
                pattern: node.getText(sourceFile),
              });
            }
          }
        }
        ts.forEachChild(node, checkNode);
      };

      ts.forEachChild(sourceFile, checkNode);
    }

    expect(violations).toEqual([]);
  });
});
