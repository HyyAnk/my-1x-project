import { describe, expect, it } from "vitest";
import { extractMarkdown } from "../src/tasks.js";

describe("markdown extraction", () => {
  it("preserves full document content when internal code blocks are present", () => {
    const raw = `# Episode Visual Bible\n\n## Palette\n- Blue and Gold\n\n## Continuity bundle CB-01 — Opening\n- Anchor-frame prompt:\n\`\`\`\nCAMERA: Wide\nACTION: Scene starts\n\`\`\`\n\n## Continuity bundle CB-02 — Second\n- Anchor-frame prompt: Direct prompt`;
    const result = extractMarkdown(raw, "# Fallback");
    expect(result).toContain("## Continuity bundle CB-01");
    expect(result).toContain("## Continuity bundle CB-02");
    expect(result).toContain("CAMERA: Wide");
  });

  it("unwraps markdown when outer fences encapsulate the entire document", () => {
    const raw = "```markdown\n# Episode Visual Bible\n\n## Safe motion\nAllowed motion\n```";
    const result = extractMarkdown(raw, "# Fallback");
    expect(result).toBe("# Episode Visual Bible\n\n## Safe motion\nAllowed motion");
  });
});
