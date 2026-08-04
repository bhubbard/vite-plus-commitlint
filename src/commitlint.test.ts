import { describe, it, expect } from "vitest";
import { lintCommit, parseCommit } from "./linter.js";
import { conventionalPreset } from "./presets/conventional.js";
import { rules } from "./rules/index.js";

describe("Conventional Commit Ruleset", () => {
  it("passes valid conventional commit messages", async () => {
    const validMessages = [
      "feat: add new button component",
      "fix(ui): resolve alignment issue on mobile",
      "docs: update README with installation steps",
      "refactor(core): simplify event handler logic",
      "test: add unit test for commit linter",
      "chore: release v1.0.0",
    ];

    for (const msg of validMessages) {
      const outcome = await lintCommit(msg, conventionalPreset.rules);
      expect(outcome.valid, `Expected "${msg}" to be valid`).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    }
  });

  it("fails invalid conventional commit messages", async () => {
    const invalidMessages = [
      { msg: "ADD NEW FEATURE", expectedRule: "type-empty" },
      { msg: "feat: Add New Feature", expectedRule: "subject-case" },
      { msg: "feat: add new feature.", expectedRule: "subject-full-stop" },
      { msg: "INVALID_TYPE: add feature", expectedRule: "type-enum" },
      { msg: "FEAT: add feature", expectedRule: "type-case" },
    ];

    for (const { msg, expectedRule } of invalidMessages) {
      const outcome = await lintCommit(msg, conventionalPreset.rules);
      expect(outcome.valid, `Expected "${msg}" to fail`).toBe(false);
      const hasError = outcome.errors.some((err) => err.name === expectedRule);
      expect(hasError, `Expected rule ${expectedRule} to fail for "${msg}"`).toBe(true);
    }
  });
});

describe("Commit Parser", () => {
  it("correctly parses conventional commit structure", () => {
    const parsed = parseCommit("feat(auth): add OAuth2 login flow");
    expect(parsed.type).toBe("feat");
    expect(parsed.scope).toBe("auth");
    expect(parsed.subject).toBe("add OAuth2 login flow");
    expect(parsed.header).toBe("feat(auth): add OAuth2 login flow");
  });
});

describe("Rules Registry", () => {
  it("contains all core rules", () => {
    expect(rules["type-enum"]).toBeDefined();
    expect(rules["header-max-length"]).toBeDefined();
    expect(rules["subject-empty"]).toBeDefined();
    expect(rules["subject-case"]).toBeDefined();
    expect(rules["subject-full-stop"]).toBeDefined();
  });
});
