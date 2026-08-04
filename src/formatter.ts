import type { LintReport } from "./types.js";

export interface FormatOptions {
  color?: boolean;
  verbose?: boolean;
  helpUrl?: string;
}

const color = {
  red: (s: string) => `\x1b[31m${s}\x1b[39m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
  green: (s: string) => `\x1b[32m${s}\x1b[39m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
};

const identity = (s: string) => s;

export function formatReport(report: LintReport, options: FormatOptions = {}): string {
  const useColor = options.color !== false;
  const red = useColor ? color.red : identity;
  const yellow = useColor ? color.yellow : identity;
  const green = useColor ? color.green : identity;
  const bold = useColor ? color.bold : identity;
  const dim = useColor ? color.dim : identity;

  const lines: string[] = [];

  for (const outcome of report.results) {
    if (outcome.valid && !options.verbose) continue;

    lines.push(`${bold("⧗")}   input: ${outcome.input.split("\n")[0]}`);

    for (const err of outcome.errors) {
      lines.push(`  ${red("✖")}   ${err.message} ${dim(`[${err.name}]`)}`);
    }
    for (const warn of outcome.warnings) {
      lines.push(`  ${yellow("⚠")}   ${warn.message} ${dim(`[${warn.name}]`)}`);
    }

    lines.push("");
  }

  if (report.errorCount > 0 || report.warningCount > 0) {
    const summary = `${report.errorCount} error(s), ${report.warningCount} warning(s)`;
    const colorizedSummary = report.errorCount > 0 ? red(summary) : yellow(summary);
    lines.push(`${bold("✖")}   found ${colorizedSummary}`);

    if (options.helpUrl) {
      lines.push(`${dim("ℹ")}   Get help: ${options.helpUrl}`);
    }
  } else if (options.verbose) {
    lines.push(`${green("✔")}   0 problems, 0 warnings`);
  }

  return lines.join("\n");
}

export default formatReport;
