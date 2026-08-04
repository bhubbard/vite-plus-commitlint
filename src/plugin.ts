import type { Plugin } from "vite";
import type { CommitlintPluginOptions } from "./types.js";
import { lintCommit } from "./rust.js";

export function commitlint(options: CommitlintPluginOptions = {}): Plugin {
  return {
    name: "vite-plus-commitlint",

    configureServer(server) {
      server.middlewares.use("/__commitlint/validate", (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const { message } = JSON.parse(body);
              const result = lintCommit(message);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              res.statusCode = 400;
              res.end(JSON.stringify({ error: errorMessage }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
        }
      });
    },

    async buildStart() {
      if (options.autoLintOnBuild) {
        const { spawnSync } = await import("node:child_process");
        const { getBinaryPath } = await import("./rust.js");
        const bin = getBinaryPath();
        const res = spawnSync(bin, ["--last", "--json"], { encoding: "utf-8" });
        let result: { valid: boolean } = { valid: true };
        if (res.stdout) {
          try {
            result = JSON.parse(res.stdout.trim());
          } catch {
            // Fallback
          }
        } else if (res.status !== 0) {
          result = { valid: false };
        }
        if (!result.valid && options.failOnError !== false) {
          this.error("[vite-plus-commitlint] Commit validation failed");
        }
      }
    },
  };
}

export const vitePlusCommitlint = commitlint;
export default commitlint;
