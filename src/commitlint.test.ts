import { describe, it, expect } from "vitest";
import { lintCommit, parseCommit, conventionalPreset, rules, commitlint } from "./index.js";
import { runCommitlintCli } from "./rust.js";

describe("Rust-Backed Commit Linter Core", () => {
  it("passes valid conventional commit messages", () => {
    const validMessages = [
      "feat: add new button component",
      "fix(ui): resolve alignment issue on mobile",
      "docs: update README with installation steps",
      "refactor(core): simplify event handler logic",
      "test: add unit test for commit linter",
      "chore: release v1.0.0",
      "feat(deps-dev): upgrade vitest",
      "feat(i18n): support UTF-8 characters 🚀",
    ];

    for (const msg of validMessages) {
      const outcome = lintCommit(msg);
      expect(outcome.valid, `Expected "${msg}" to be valid`).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    }
  });

  it("fails invalid conventional commit messages", () => {
    const invalidMessages = [
      { msg: "ADD NEW FEATURE", expectedRule: "type-empty" },
      { msg: "feat: Add New Feature", expectedRule: "subject-case" },
      { msg: "feat: add new feature.", expectedRule: "subject-full-stop" },
      { msg: "INVALID_TYPE: add feature", expectedRule: "type-enum" },
      { msg: "FEAT: add feature", expectedRule: "type-case" },
    ];

    for (const { msg, expectedRule } of invalidMessages) {
      const outcome = lintCommit(msg);
      expect(outcome.valid, `Expected "${msg}" to fail`).toBe(false);
      const hasError = outcome.errors.some((err) => err.name === expectedRule);
      expect(hasError, `Expected rule ${expectedRule} to fail for "${msg}"`).toBe(true);
    }
  });
});

describe("Programmatic API Exports", () => {
  it("exports parseCommit correctly", () => {
    const parsed = parseCommit("feat(ui)!: add button\n\nBody message");
    expect(parsed.type).toBe("feat");
    expect(parsed.scope).toBe("ui");
    expect(parsed.subject).toBe("add button");
  });

  it("exports conventionalPreset and rules", () => {
    expect(conventionalPreset).toBeDefined();
    expect(conventionalPreset.rules).toBeDefined();
    expect(rules["type-enum"]).toBeDefined();
  });
});

describe("Vite Plugin & Middleware", () => {
  it("initializes plugin with default options", () => {
    const plugin = commitlint();
    expect(plugin.name).toBe("vite-plus-commitlint");
    expect(plugin.configureServer).toBeDefined();
  });

  it("handles middleware validation request", () => {
    const plugin = commitlint();
    let handler: any;
    const fakeServer: any = {
      middlewares: {
        use: (path: string, fn: any) => {
          if (path === "/__commitlint/validate") {
            handler = fn;
          }
        },
      },
    };

    (plugin.configureServer as (server: any) => void)(fakeServer);
    expect(handler).toBeDefined();

    let _statusCode = 200;
    let responseData = "";
    let headers: Record<string, string> = {};

    const fakeReq: any = {
      method: "POST",
      on: (event: string, cb: any) => {
        if (event === "data") cb(JSON.stringify({ message: "feat: valid message" }));
        if (event === "end") cb();
      },
    };
    const fakeRes: any = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      end: (data: string) => {
        responseData = data;
      },
    };

    handler(fakeReq, fakeRes);
    const parsed = JSON.parse(responseData);
    expect(parsed.valid).toBe(true);
  });

  it("handles middleware error for invalid request payload", () => {
    const plugin = commitlint();
    let handler: any;
    const fakeServer: any = {
      middlewares: {
        use: (path: string, fn: any) => {
          if (path === "/__commitlint/validate") {
            handler = fn;
          }
        },
      },
    };

    (plugin.configureServer as (server: any) => void)(fakeServer);

    let statusCode = 200;
    let responseData = "";

    const fakeReq: any = {
      method: "POST",
      on: (event: string, cb: any) => {
        if (event === "data") cb("invalid json");
        if (event === "end") cb();
      },
    };
    const fakeRes: any = {
      statusCode: 200,
      setHeader: () => {},
      end: (data: string) => {
        responseData = data;
      },
    };
    Object.defineProperty(fakeRes, "statusCode", {
      set: (val: number) => {
        statusCode = val;
      },
      get: () => statusCode,
    });

    handler(fakeReq, fakeRes);
    expect(statusCode).toBe(400);
    const parsed = JSON.parse(responseData);
    expect(parsed.error).toBeDefined();
  });
});

describe("CLI Integration", () => {
  it("runs CLI with --print-config json without crashing", () => {
    const exitCode = runCommitlintCli(["--print-config", "json"]);
    expect(exitCode).toBe(0);
  });

  it("runs CLI with --version without crashing", () => {
    const exitCode = runCommitlintCli(["--version"]);
    expect(exitCode).toBe(0);
  });

  it("runs CLI with --help without crashing", () => {
    const exitCode = runCommitlintCli(["--help"]);
    expect(exitCode).toBe(0);
  });
});
