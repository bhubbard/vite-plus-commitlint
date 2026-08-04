export enum RuleConfigSeverity {
  Disabled = 0,
  Warning = 1,
  Error = 2,
}

export type RuleConfigCondition = 'always' | 'never';

export type TargetCaseType =
  | 'lower-case'
  | 'upper-case'
  | 'camel-case'
  | 'kebab-case'
  | 'pascal-case'
  | 'sentence-case'
  | 'start-case'
  | 'snake-case';

export type RuleOutcome = [boolean, string?];

export interface ParsedCommit {
  raw?: string;
  header: string | null;
  type: string | null;
  scope: string | null;
  subject: string | null;
  body: string | null;
  footer: string | null;
  notes: Array<{ name: string; text: string }>;
  references: Array<{ action?: string; owner?: string; repository?: string; issue: string; raw: string }>;
  revert?: { header?: string; hash?: string } | null;
  mentions?: string[];
}

export type Rule<Value = any> = (
  parsed: ParsedCommit,
  condition?: RuleConfigCondition,
  value?: Value
) => RuleOutcome | Promise<RuleOutcome>;

export type RuleConfig<Value = any> =
  | [RuleConfigSeverity]
  | [RuleConfigSeverity, RuleConfigCondition]
  | [RuleConfigSeverity, RuleConfigCondition, Value];

export type RulesConfig = Record<string, RuleConfig>;

export interface ParserOptions {
  headerPattern?: RegExp;
  headerCorrespondence?: string[];
  referenceActions?: string[];
  issuePrefixes?: string[];
  noteKeywords?: string[];
  fieldPattern?: RegExp;
  revertPattern?: RegExp;
  revertCorrespondence?: string[];
  commentChar?: string;
}

export interface UserConfig {
  extends?: string[];
  parserPreset?: string | { parserOpts?: ParserOptions };
  rules?: RulesConfig;
  ignores?: Array<(commit: string) => boolean>;
  defaultIgnores?: boolean;
  helpUrl?: string;
}

export interface QualifiedConfig {
  extends: string[];
  parserPreset?: { parserOpts?: ParserOptions };
  rules: RulesConfig;
  ignores?: Array<(commit: string) => boolean>;
  defaultIgnores?: boolean;
  helpUrl?: string;
}

export interface LintRuleOutcome {
  valid: boolean;
  level: RuleConfigSeverity;
  name: string;
  message: string;
}

export interface LintOutcome {
  input: string;
  valid: boolean;
  errors: LintRuleOutcome[];
  warnings: LintRuleOutcome[];
}

export interface LintReport {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  results: LintOutcome[];
}

export interface CommitlintPluginOptions extends UserConfig {
  /** Automatically lint current commit message on build start */
  autoLintOnBuild?: boolean;
  /** Git commit edit file path or flag (default: .git/COMMIT_EDITMSG) */
  edit?: string | boolean;
  /** Fail Vite build on lint errors (default: true) */
  failOnError?: boolean;
  /** Enable colored output (default: true) */
  color?: boolean;
  /** Quiet mode */
  quiet?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

export interface CliFlags {
  color?: boolean;
  config?: string;
  defaultConfig?: boolean;
  printConfig?: 'text' | 'json';
  cwd?: string;
  edit?: string | boolean;
  env?: string;
  extends?: string[];
  helpUrl?: string;
  from?: string;
  fromLastTag?: boolean;
  gitLogArgs?: string;
  last?: boolean;
  format?: string;
  parserPreset?: string;
  quiet?: boolean;
  to?: string;
  verbose?: boolean;
  strict?: boolean;
}
