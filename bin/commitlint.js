#!/usr/bin/env node
import process from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveConfig } from '../dist/loader.js';
import { readCommitMessages, readStdin } from '../dist/reader.js';
import { lintCommit } from '../dist/linter.js';
import { formatReport } from '../dist/formatter.js';
import type { LintReport } from '../dist/types.js';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .options({
      color: {
        alias: 'c',
        default: true,
        description: 'toggle colored output',
        type: 'boolean',
      },
      config: {
        alias: 'g',
        description: 'path to the config file',
        type: 'string',
      },
      'print-config': {
        choices: ['', 'text', 'json'],
        description: 'print resolved config',
        type: 'string',
      },
      cwd: {
        alias: 'd',
        default: process.cwd(),
        description: 'directory to execute in',
        type: 'string',
      },
      edit: {
        alias: 'e',
        description: 'read commit message from file or .git/COMMIT_EDITMSG',
        type: 'string',
      },
      env: {
        alias: 'E',
        description: 'check message in path given by environment variable',
        type: 'string',
      },
      from: {
        alias: 'f',
        description: 'lower end of commit range to lint',
        type: 'string',
      },
      'from-last-tag': {
        description: 'use last tag as lower end of commit range',
        type: 'boolean',
      },
      gitLogArgs: {
        description: 'additional git log arguments',
        type: 'string',
      },
      last: {
        alias: 'l',
        description: 'analyze last commit',
        type: 'boolean',
      },
      quiet: {
        alias: 'q',
        default: false,
        description: 'toggle console output',
        type: 'boolean',
      },
      to: {
        alias: 't',
        description: 'upper end of commit range to lint',
        type: 'string',
      },
      verbose: {
        alias: 'V',
        type: 'boolean',
        description: 'enable verbose output',
      },
      strict: {
        alias: 's',
        type: 'boolean',
        description: 'enable strict mode (exit code 2 for warnings, 3 for errors)',
      },
    })
    .help('help')
    .alias('h', 'help')
    .parse();

  const cwd = (argv.cwd as string) || process.cwd();
  const config = await resolveConfig(cwd, argv.config as string | undefined);

  if (typeof argv['print-config'] === 'string') {
    if (argv['print-config'] === 'json') {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.dir(config, { depth: null, colors: argv.color !== false });
    }
    process.exit(0);
  }

  let messages: string[] = [];

  // If input via stdin
  const stdinMsg = await readStdin();
  if (stdinMsg) {
    messages = [stdinMsg];
  } else {
    messages = await readCommitMessages({
      cwd,
      edit: argv.edit as string | boolean | undefined,
      env: argv.env as string | undefined,
      from: argv.from as string | undefined,
      to: argv.to as string | undefined,
      last: argv.last as boolean | undefined,
      fromLastTag: argv['from-last-tag'] as boolean | undefined,
      gitLogArgs: argv.gitLogArgs as string | undefined,
    });
  }

  if (messages.length === 0) {
    console.error('No commit messages found to lint.');
    process.exit(1);
  }

  const results = await Promise.all(
    messages.map((msg) =>
      lintCommit(msg, config.rules, {
        parserOpts: config.parserPreset?.parserOpts,
      })
    )
  );

  const report: LintReport = results.reduce<LintReport>(
    (info, result) => {
      info.valid = result.valid ? info.valid : false;
      info.errorCount += result.errors.length;
      info.warningCount += result.warnings.length;
      info.results.push(result);
      return info;
    },
    { valid: true, errorCount: 0, warningCount: 0, results: [] }
  );

  const output = formatReport(report, {
    color: argv.color as boolean,
    verbose: argv.verbose as boolean,
    helpUrl: config.helpUrl,
  });

  if (!argv.quiet && output) {
    console.log(output);
  }

  if (argv.strict) {
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
