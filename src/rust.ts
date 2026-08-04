import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { LintOutcome, ParsedCommit } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getBinaryPath(): string {
  if (process.env.COMMITLINT_BIN && fs.existsSync(process.env.COMMITLINT_BIN)) {
    return process.env.COMMITLINT_BIN;
  }

  const exeName = process.platform === "win32" ? "commitlint-rs.exe" : "commitlint-rs";
  const candidates = [
    path.resolve(__dirname, "./bin", exeName),
    path.resolve(__dirname, "../dist/bin", exeName),
    path.resolve(__dirname, "../target/release", exeName),
    path.resolve(__dirname, "../target/debug", exeName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      if (process.platform !== "win32") {
        try {
          const mode = fs.statSync(candidate).mode;
          if ((mode & 0o111) === 0) {
            fs.chmodSync(candidate, 0o755);
          }
        } catch {
          // Ignore read-only filesystem errors
        }
      }
      return candidate;
    }
  }

  return exeName;
}

export function lintCommit(message: string): LintOutcome {
  const bin = getBinaryPath();
  const res = spawnSync(bin, [message, "--json"], { encoding: "utf-8" });
  if (res.stdout) {
    try {
      return JSON.parse(res.stdout.trim());
    } catch {
      // Fallback
    }
  }
  return {
    input: message,
    valid: res.status === 0,
    errors:
      res.status !== 0
        ? [
            {
              valid: false,
              level: 2,
              name: "lint-failed",
              message: res.stderr?.trim() || "Linting failed",
            },
          ]
        : [],
    warnings: [],
  };
}

export function parseCommit(message: string): ParsedCommit {
  const bin = getBinaryPath();
  const res = spawnSync(bin, ["--parse", message], { encoding: "utf-8" });
  if (res.stdout) {
    try {
      return JSON.parse(res.stdout.trim());
    } catch {
      // Fallback
    }
  }
  return {
    raw: message,
    header: message.split("\n")[0] || null,
    type: null,
    scope: null,
    subject: null,
    body: null,
    footer: null,
    notes: [],
    references: [],
    mentions: [],
  };
}

export function runCommitlintCli(args: string[] = process.argv.slice(2)): number {
  const bin = getBinaryPath();
  const res = spawnSync(bin, args, { stdio: "inherit" });
  return res.status ?? 0;
}
