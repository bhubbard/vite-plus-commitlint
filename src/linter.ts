import { CommitParser } from "conventional-commits-parser";
import type {
  ParsedCommit,
  RulesConfig,
  RuleConfigSeverity,
  RuleConfigCondition,
  LintOutcome,
  LintRuleOutcome,
  ParserOptions,
} from "./types.js";
import rulesRegistry from "./rules/index.js";

export function parseCommit(message: string, options?: ParserOptions): ParsedCommit {
  const parserOpts = {
    headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
    headerCorrespondence: ["type", "scope", "subject"],
    ...options,
  };
  const parser = new CommitParser(parserOpts as any);
  const parsed = parser.parse(message) as any;
  return {
    raw: message,
    header: parsed.header || message.split(/\r?\n/)[0] || null,
    type: parsed.type || null,
    scope: parsed.scope || null,
    subject: parsed.subject || null,
    body: parsed.body || null,
    footer: parsed.footer || null,
    notes: parsed.notes || [],
    references: parsed.references || [],
    revert: parsed.revert || null,
    mentions: parsed.mentions || [],
  };
}

export async function lintCommit(
  message: string,
  rulesConfig: RulesConfig = {},
  options: {
    parserOpts?: ParserOptions;
    defaultIgnores?: boolean;
    ignores?: Array<(msg: string) => boolean>;
  } = {},
): Promise<LintOutcome> {
  const trimmed = message.trim();

  // Handle ignores
  if (options.defaultIgnores !== false) {
    if (
      trimmed.startsWith("Fixup!") ||
      trimmed.startsWith("squash!") ||
      trimmed.startsWith("Merge ") ||
      trimmed.startsWith("Revert ")
    ) {
      return { input: message, valid: true, errors: [], warnings: [] };
    }
  }
  if (options.ignores && options.ignores.some((ignore) => ignore(message))) {
    return { input: message, valid: true, errors: [], warnings: [] };
  }

  const parsed = parseCommit(message, options.parserOpts);
  const errors: LintRuleOutcome[] = [];
  const warnings: LintRuleOutcome[] = [];

  for (const [ruleName, ruleConfig] of Object.entries(rulesConfig)) {
    if (!ruleConfig) continue;

    const level: RuleConfigSeverity = ruleConfig[0];
    if (level === 0) continue; // Disabled

    const when: RuleConfigCondition = ruleConfig[1] || "always";
    const value = ruleConfig[2];

    const ruleFn = rulesRegistry[ruleName];
    if (!ruleFn) {
      // Ignore unknown rule gracefully or flag warning
      continue;
    }

    try {
      const outcome = await ruleFn(parsed, when, value);
      const [valid, messageOverride] = outcome;
      if (!valid) {
        const item: LintRuleOutcome = {
          valid: false,
          level,
          name: ruleName,
          message: messageOverride || `Rule ${ruleName} failed`,
        };
        if (level === 2) {
          errors.push(item);
        } else if (level === 1) {
          warnings.push(item);
        }
      }
    } catch (err: any) {
      errors.push({
        valid: false,
        level: 2,
        name: ruleName,
        message: err.message || `Error executing rule ${ruleName}`,
      });
    }
  }

  return {
    input: message,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default lintCommit;
