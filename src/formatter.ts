import pc from "picocolors";
import type { LintReport } from "./types.js";

export interface FormatOptions {
  color?: boolean;
  verbose?: boolean;
  helpUrl?: string;
}

export function formatReport(report: LintReport, options: FormatOptions = {}): string {
  const useColor = options.color !== false;
  const red = useColor ? pc.red : (s: string) => s;
  const yellow = useColor ? pc.yellow : (s: string) => s;
  const green = useColor ? pc.green : (s: string) => s;
  const bold = useColor ? pc.bold : (s: string) => s;
  const dim = useColor ? pc.dim : (s: string) => s;

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
