import type { ParsedCommit, ParserOptions, CommitNote, CommitReference } from "./types.js";

export function parseCommit(message: string, options?: ParserOptions): ParsedCommit {
  const raw = message;
  const lines = message.split(/\r?\n/);
  const headerLine = lines[0] || "";

  // 1. Revert check
  let revert: { header: string; hash?: string } | null = null;
  const revertMatch = /^revert\s+"?(.*?)"?\s*$/i.exec(headerLine);
  if (revertMatch) {
    revert = { header: revertMatch[1] };
  }

  // 2. Header parsing
  const headerPattern = options?.headerPattern || /^(\w*)(?:\((.*)\))?!?: (.*)$/;
  const headerCorr = options?.headerCorrespondence || ["type", "scope", "subject"];

  let type: string | null = null;
  let scope: string | null = null;
  let subject: string | null = null;

  const match = headerPattern.exec(headerLine);
  if (match) {
    const corrMap: Record<string, string> = {};
    headerCorr.forEach((field, index) => {
      corrMap[field] = match[index + 1] || "";
    });

    type = corrMap.type || null;
    scope = corrMap.scope || null;
    subject = corrMap.subject || null;
  }

  // 3. Body & Footer splitting
  const bodyLines: string[] = [];
  const footerLines: string[] = [];
  const notes: CommitNote[] = [];
  const references: CommitReference[] = [];

  let inFooter = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    const isFooterLine =
      /^BREAKING[ -]CHANGE:\s*(.*)/i.test(line) ||
      /^[\w-]+:\s+.*/.test(line) ||
      /^[\w-]+\s+#\d+/.test(line);

    if (isFooterLine && !inFooter && i > 1) {
      inFooter = true;
    }

    if (inFooter) {
      footerLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  const body = bodyLines.join("\n").trim() || null;
  const footer = footerLines.join("\n").trim() || null;

  // 4. Notes (BREAKING CHANGE)
  const breakingMatch = /(?:^|\n)BREAKING[ -]CHANGE:\s*([\s\S]*)/i.exec(message);
  if (breakingMatch) {
    notes.push({
      title: "BREAKING CHANGE",
      text: breakingMatch[1].trim(),
    });
  }

  // 5. References (e.g. Fixes #123, #123)
  const refRegex = /(?:([a-zA-Z0-9_-]+)\s+)?#(\d+)/g;
  let refMatch: RegExpExecArray | null;
  while ((refMatch = refRegex.exec(message)) !== null) {
    references.push({
      action: refMatch[1] || null,
      owner: null,
      repository: null,
      issue: refMatch[2],
      raw: refMatch[0],
      prefix: "#",
    });
  }

  // 6. Mentions (@user)
  const mentions: string[] = [];
  const mentionRegex = /@([a-zA-Z0-9_/-]+)/g;
  let mMatch: RegExpExecArray | null;
  while ((mMatch = mentionRegex.exec(message)) !== null) {
    mentions.push(mMatch[1]);
  }

  return {
    raw,
    header: headerLine || null,
    type,
    scope,
    subject,
    body,
    footer,
    notes,
    references,
    revert,
    mentions,
  };
}

export default parseCommit;
