import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LintOutcome } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, "../target/release/commitlint-rs");

export function lintCommit(message: string): LintOutcome {
  const res = spawnSync(binPath, [message, "--json"], { encoding: "utf-8" });
  if (res.stdout) {
    try {
      return JSON.parse(res.stdout.trim());
    } catch {
      // Fallback if parsing output fails
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

export function runCommitlintCli(args: string[] = process.argv.slice(2)): number {
  const res = spawnSync(binPath, args, { stdio: "inherit" });
  return res.status ?? 0;
}
