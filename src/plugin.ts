import type { Plugin } from "vite";
import type { CommitlintPluginOptions, QualifiedConfig, LintReport } from "./types.js";
import { resolveConfig } from "./loader.js";
import { lintCommit } from "./linter.ts";
import { readCommitMessages } from "./reader.js";
import { formatReport } from "./formatter.js";

export function commitlint(options: CommitlintPluginOptions = {}): Plugin {
  let resolvedConfig: QualifiedConfig;
  let rootCwd: string = process.cwd();

  return {
    name: "vite-plus-commitlint",

    async configResolved(config) {
      rootCwd = config.root || process.cwd();

      // Check if vite.config.ts has a top-level `commitlint` property
      const viteCommitlintConfig = (config as any).commitlint || {};
      const userSeed = {
        ...options,
        ...viteCommitlintConfig,
      };

      resolvedConfig = await resolveConfig(rootCwd, options.config, userSeed);
    },

    configureServer(server) {
      // Dev server middleware exposing endpoint /__commitlint/validate
      server.middlewares.use("/__commitlint/validate", async (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const { message } = JSON.parse(body);
              const result = await lintCommit(message, resolvedConfig.rules, {
                parserOpts: resolvedConfig.parserPreset?.parserOpts,
              });
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
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
        const messages = await readCommitMessages({
          cwd: rootCwd,
          edit: options.edit,
          last: true,
        });

        if (messages.length === 0) return;

        const results = await Promise.all(
          messages.map((msg) =>
            lintCommit(msg, resolvedConfig.rules, {
              parserOpts: resolvedConfig.parserPreset?.parserOpts,
            }),
          ),
        );

        const report: LintReport = results.reduce<LintReport>(
          (info, result) => {
            info.valid = result.valid ? info.valid : false;
            info.errorCount += result.errors.length;
            info.warningCount += result.warnings.length;
            info.results.push(result);
            return info;
          },
          { valid: true, errorCount: 0, warningCount: 0, results: [] },
        );

        if (!report.valid) {
          const output = formatReport(report, {
            color: options.color,
            verbose: options.verbose,
            helpUrl: resolvedConfig.helpUrl,
          });

          if (options.failOnError !== false) {
            this.error(`[vite-plus-commitlint]\n${output}`);
          } else {
            this.warn(`[vite-plus-commitlint]\n${output}`);
          }
        }
      }
    },
  };
}

export const vitePlusCommitlint = commitlint;
export default commitlint;
