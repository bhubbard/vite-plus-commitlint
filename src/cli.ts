#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "node:util";
import { resolveConfig } from "./loader.js";
import { readCommitMessages, readStdin } from "./reader.js";
import { lintCommit } from "./linter.js";
import { formatReport } from "./formatter.js";
import type { LintReport } from "./types.js";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      color: { type: "boolean", short: "c", default: true },
      config: { type: "string", short: "g" },
      "print-config": { type: "string" },
      cwd: { type: "string", short: "d", default: process.cwd() },
      edit: { type: "string", short: "e" },
      env: { type: "string", short: "E" },
      from: { type: "string", short: "f" },
      "from-last-tag": { type: "boolean" },
      gitLogArgs: { type: "string" },
      last: { type: "boolean", short: "l" },
      quiet: { type: "boolean", short: "q", default: false },
      to: { type: "string", short: "t" },
      verbose: { type: "boolean", short: "V" },
      strict: { type: "boolean", short: "s" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
    tokens: false,
  });

  if (values.help) {
    console.log(`
commitlint - Lint commit messages

Options:
  -c, --color           toggle colored output [default: true]
  -g, --config          path to the config file
      --print-config    print resolved config (json|text)
  -d, --cwd             directory to execute in
  -e, --edit            read commit message from file or .git/COMMIT_EDITMSG
  -E, --env             check message in path given by environment variable
  -f, --from            lower end of commit range to lint
      --from-last-tag   use last tag as lower end of commit range
      --gitLogArgs      additional git log arguments
  -l, --last            analyze last commit
  -q, --quiet           toggle console output [default: false]
  -t, --to              upper end of commit range to lint
  -V, --verbose         enable verbose output
  -s, --strict          enable strict mode
  -h, --help            show help
`);
    process.exit(0);
  }

  const cwd = values.cwd || process.cwd();
  const config = await resolveConfig(cwd, values.config);

  if (typeof values["print-config"] === "string") {
    if (values["print-config"] === "json") {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.dir(config, { depth: null, colors: values.color !== false });
    }
    process.exit(0);
  }

  let messages: string[] = [];

  const stdinMsg = await readStdin();
  if (stdinMsg) {
    messages = [stdinMsg];
  } else {
    messages = await readCommitMessages({
      cwd,
      edit: values.edit,
      env: values.env,
      from: values.from,
      to: values.to,
      last: values.last,
      fromLastTag: values["from-last-tag"],
      gitLogArgs: values.gitLogArgs,
    });
  }

  if (messages.length === 0) {
    console.error("No commit messages found to lint.");
    process.exit(1);
  }

  const results = await Promise.all(
    messages.map((msg) =>
      lintCommit(msg, config.rules, {
        parserOpts: config.parserPreset?.parserOpts,
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

  const output = formatReport(report, {
    color: values.color,
    verbose: values.verbose,
    helpUrl: config.helpUrl,
  });

  if (!values.quiet && output) {
    console.log(output);
  }

  if (values.strict) {
    if (report.errorCount > 0) process.exit(3);
    if (report.warningCount > 0) process.exit(2);
  }

  if (!report.valid) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
