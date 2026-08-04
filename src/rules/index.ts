import type { Rule } from "../types.js";
import {
  ensureCase,
  ensureEnum,
  maxLength,
  minLength,
  maxLineLength,
  notEmpty,
} from "../ensure.js";
import { xSync } from "tinyexec";

export const bodyCase: Rule<string | string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.body) return [true];
  const list = Array.isArray(value) ? value : [value];
  const passes =
    when === "always"
      ? list.some((target) => ensureCase(parsed.body!, target))
      : list.every((target) => !ensureCase(parsed.body!, target));
  return [passes, `body must ${when === "always" ? "" : "not "}be ${list.join(", ")}`.trim()];
};

export const bodyEmpty: Rule = (parsed, when = "always") => {
  const isPresent = notEmpty(parsed.body);
  const passes = when === "always" ? !isPresent : isPresent;
  return [passes, `body must ${when === "always" ? "be" : "not be"} empty`];
};

export const bodyFullStop: Rule<string> = (parsed, when = "always", value = ".") => {
  if (!parsed.body) return [true];
  const hasChar = parsed.body.endsWith(value);
  const passes = when === "always" ? hasChar : !hasChar;
  return [passes, `body must ${when === "always" ? "" : "not "}end with "${value}"`];
};

export const bodyLeadingBlank: Rule = (parsed, when = "always") => {
  if (!parsed.body) return [true];
  const raw = parsed.raw || "";
  const lines = raw.split(/\r?\n/);
  const hasBlank = lines.length > 1 && lines[1].trim() === "";
  const passes = when === "always" ? hasBlank : !hasBlank;
  return [passes, `body must ${when === "always" ? "" : "not "}have leading blank line`];
};

export const bodyMaxLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.body) return [true];
  return [maxLength(parsed.body, value), `body must not be longer than ${value} characters`];
};

export const bodyMaxLineLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.body) return [true];
  return [
    maxLineLength(parsed.body, value),
    `body's lines must not be longer than ${value} characters`,
  ];
};

export const bodyMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.body) return [true];
  return [minLength(parsed.body, value), `body must not be shorter than ${value} characters`];
};

export const breakingChangeExclamationMark: Rule = (parsed, when = "always") => {
  const { header, footer } = parsed;
  if (!header && !footer) return [true];
  const hasExclamation = !!header && /^(\w*)(?:\((.*)\))?!: (.*)$/.test(header);
  const hasBreaking = !!footer && /^BREAKING[ -]CHANGE:/m.test(footer);
  const check = hasExclamation === hasBreaking;
  const negated = when === "never";
  return [
    negated ? !check : check,
    `breaking changes ${negated ? "must not" : "must"} have both an exclamation mark in header and BREAKING CHANGE in footer`,
  ];
};

export const footerEmpty: Rule = (parsed, when = "always") => {
  const isPresent = notEmpty(parsed.footer);
  const passes = when === "always" ? !isPresent : isPresent;
  return [passes, `footer must ${when === "always" ? "be" : "not be"} empty`];
};

export const footerLeadingBlank: Rule = (parsed, when = "always") => {
  if (!parsed.footer) return [true];
  const raw = parsed.raw || "";
  const lines = raw.split(/\r?\n/);
  const hasBlank = lines.some((l, idx) => idx > 1 && l.trim() === "" && idx < lines.length - 1);
  const passes = when === "always" ? hasBlank : !hasBlank;
  return [passes, `footer must ${when === "always" ? "" : "not "}have leading blank line`];
};

export const footerMaxLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.footer) return [true];
  return [maxLength(parsed.footer, value), `footer must not be longer than ${value} characters`];
};

export const footerMaxLineLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.footer) return [true];
  return [
    maxLineLength(parsed.footer, value),
    `footer's lines must not be longer than ${value} characters`,
  ];
};

export const footerMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.footer) return [true];
  return [minLength(parsed.footer, value), `footer must not be shorter than ${value} characters`];
};

export const headerCase: Rule<string | string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.header || !/^[a-z]/i.test(parsed.header)) return [true];
  const list = Array.isArray(value) ? value : [value];
  const passes =
    when === "always"
      ? list.some((target) => ensureCase(parsed.header!, target))
      : list.every((target) => !ensureCase(parsed.header!, target));
  return [passes, `header must ${when === "always" ? "" : "not "}be ${list.join(", ")}`];
};

export const headerFullStop: Rule<string> = (parsed, when = "always", value = ".") => {
  if (!parsed.header) return [true];
  const hasChar = parsed.header.endsWith(value);
  const passes = when === "always" ? hasChar : !hasChar;
  return [passes, `header must ${when === "always" ? "" : "not "}end with "${value}"`];
};

export const headerMaxLength: Rule<number> = (parsed, _when = "always", value = 100) => {
  if (!parsed.header) return [true];
  return [
    maxLength(parsed.header, value),
    `header must not be longer than ${value} characters, current length is ${parsed.header.length}`,
  ];
};

export const headerMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.header) return [true];
  return [minLength(parsed.header, value), `header must not be shorter than ${value} characters`];
};

export const headerTrim: Rule = (parsed, when = "always") => {
  if (!parsed.header) return [true];
  const isTrimmed = parsed.header === parsed.header.trim();
  const passes = when === "always" ? isTrimmed : !isTrimmed;
  return [passes, `header must ${when === "always" ? "" : "not "}be trimmed`];
};

export const referencesEmpty: Rule = (parsed, when = "never") => {
  const notEmpty = parsed.references && parsed.references.length > 0;
  const negated = when === "always";
  return [negated ? !notEmpty : notEmpty, `references ${negated ? "must" : "may not"} be empty`];
};

export const scopeCase: Rule<string | string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.scope) return [true];
  const list = Array.isArray(value) ? value : [value];
  const passes =
    when === "always"
      ? list.some((target) => ensureCase(parsed.scope!, target))
      : list.every((target) => !ensureCase(parsed.scope!, target));
  return [passes, `scope must ${when === "always" ? "" : "not "}be ${list.join(", ")}`];
};

export const scopeDelimiterStyle: Rule<string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.scope) return [true];
  const delimiters = value.length ? value : ["/", "\\", ","];
  const rawDelimiters = parsed.scope.match(/[^A-Za-z0-9-_]+/g) || [];
  const scopeDelimiters = [...new Set(rawDelimiters.map((d) => (d.trim() === "," ? "," : d)))];
  const allowed = scopeDelimiters.every((d) => delimiters.includes(d));
  const isNever = when === "never";
  return [
    isNever ? !allowed : allowed,
    `scope delimiters must ${isNever ? "not " : ""}be one of [${delimiters.join(", ")}]`,
  ];
};

export const scopeEmpty: Rule = (parsed, when = "always") => {
  const isPresent = notEmpty(parsed.scope);
  const passes = when === "always" ? !isPresent : isPresent;
  return [passes, `scope must ${when === "always" ? "be" : "not be"} empty`];
};

export const scopeEnum: Rule<string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.scope) return [true];
  const passes = ensureEnum(parsed.scope, value);
  const result = when === "always" ? passes : !passes;
  return [result, `scope must ${when === "always" ? "" : "not "}be one of [${value.join(", ")}]`];
};

export const scopeMaxLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.scope) return [true];
  return [maxLength(parsed.scope, value), `scope must not be longer than ${value} characters`];
};

export const scopeMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.scope) return [true];
  return [minLength(parsed.scope, value), `scope must not be shorter than ${value} characters`];
};

export const signedOffBy: Rule<string> = (parsed, when = "always", value = "Signed-off-by:") => {
  const lines = (parsed.raw || "")
    .split(/\r?\n/)
    .filter(
      (ln) =>
        !ln.startsWith("#") &&
        !/^\(cherry picked from commit [0-9a-f]{7,64}\)$/i.test(ln.trim()) &&
        Boolean(ln),
    );
  const last = lines[lines.length - 1];
  const hasSignedOff = last ? last.startsWith(value) : false;
  const negated = when === "never";
  return [
    negated ? !hasSignedOff : hasSignedOff,
    `message ${negated ? "must not" : "must"} be signed off`,
  ];
};

export const subjectCase: Rule<string | string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.subject) return [true];
  const list = Array.isArray(value) ? value : [value];
  const passes =
    when === "always"
      ? list.some((target) => ensureCase(parsed.subject!, target))
      : list.every((target) => !ensureCase(parsed.subject!, target));
  return [passes, `subject must ${when === "always" ? "" : "not "}be ${list.join(", ")}`];
};

export const subjectEmpty: Rule = (parsed, when = "always") => {
  const isPresent = notEmpty(parsed.subject);
  const passes = when === "always" ? !isPresent : isPresent;
  return [passes, `subject must ${when === "always" ? "be" : "not be"} empty`];
};

export const subjectFullStop: Rule<string> = (parsed, when = "always", value = ".") => {
  if (!parsed.subject) return [true];
  const hasChar = parsed.subject.endsWith(value);
  const passes = when === "always" ? hasChar : !hasChar;
  return [passes, `subject must ${when === "always" ? "" : "not "}end with "${value}"`];
};

export const subjectMaxLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.subject) return [true];
  return [maxLength(parsed.subject, value), `subject must not be longer than ${value} characters`];
};

export const subjectMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.subject) return [true];
  return [minLength(parsed.subject, value), `subject must not be shorter than ${value} characters`];
};

export const subjectExclamationMark: Rule = (parsed, when = "always") => {
  if (!parsed.subject) return [true];
  const hasMark = parsed.subject.endsWith("!");
  const passes = when === "always" ? hasMark : !hasMark;
  return [passes, `subject must ${when === "always" ? "" : "not "}have exclamation mark`];
};

export const trailerExists: Rule<string> = (parsed, when = "always", value = "") => {
  try {
    const res = xSync("git", ["interpret-trailers", "--parse"], {
      nodeOptions: { input: parsed.raw || "" },
    });
    const count = (res.stdout || "").split(/\r?\n/).filter((ln) => ln.startsWith(value)).length;
    const hasTrailer = count > 0;
    const negated = when === "never";
    return [
      negated ? !hasTrailer : hasTrailer,
      `message ${negated ? "must not" : "must"} have "${value}" trailer`,
    ];
  } catch {
    return [true];
  }
};

export const typeCase: Rule<string | string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.type) return [true];
  const list = Array.isArray(value) ? value : [value];
  const passes =
    when === "always"
      ? list.some((target) => ensureCase(parsed.type!, target))
      : list.every((target) => !ensureCase(parsed.type!, target));
  return [passes, `type must ${when === "always" ? "" : "not "}be ${list.join(", ")}`];
};

export const typeEmpty: Rule = (parsed, when = "always") => {
  const isPresent = notEmpty(parsed.type);
  const passes = when === "always" ? !isPresent : isPresent;
  return [passes, `type must ${when === "always" ? "be" : "not be"} empty`];
};

export const typeEnum: Rule<string[]> = (parsed, when = "always", value = []) => {
  if (!parsed.type) return [true];
  const passes = ensureEnum(parsed.type, value);
  const result = when === "always" ? passes : !passes;
  return [result, `type must ${when === "always" ? "" : "not "}be one of [${value.join(", ")}]`];
};

export const typeMaxLength: Rule<number> = (parsed, _when = "always", value = Infinity) => {
  if (!parsed.type) return [true];
  return [maxLength(parsed.type, value), `type must not be longer than ${value} characters`];
};

export const typeMinLength: Rule<number> = (parsed, _when = "always", value = 0) => {
  if (!parsed.type) return [true];
  return [minLength(parsed.type, value), `type must not be shorter than ${value} characters`];
};

export const rules: Record<string, Rule> = {
  "body-case": bodyCase,
  "body-empty": bodyEmpty,
  "body-full-stop": bodyFullStop,
  "body-leading-blank": bodyLeadingBlank,
  "body-max-length": bodyMaxLength,
  "body-max-line-length": bodyMaxLineLength,
  "body-min-length": bodyMinLength,
  "breaking-change-exclamation-mark": breakingChangeExclamationMark,
  "footer-empty": footerEmpty,
  "footer-leading-blank": footerLeadingBlank,
  "footer-max-length": footerMaxLength,
  "footer-max-line-length": footerMaxLineLength,
  "footer-min-length": footerMinLength,
  "header-case": headerCase,
  "header-full-stop": headerFullStop,
  "header-max-length": headerMaxLength,
  "header-min-length": headerMinLength,
  "header-trim": headerTrim,
  "references-empty": referencesEmpty,
  "scope-case": scopeCase,
  "scope-delimiter-style": scopeDelimiterStyle,
  "scope-empty": scopeEmpty,
  "scope-enum": scopeEnum,
  "scope-max-length": scopeMaxLength,
  "scope-min-length": scopeMinLength,
  "signed-off-by": signedOffBy,
  "subject-case": subjectCase,
  "subject-empty": subjectEmpty,
  "subject-exclamation-mark": subjectExclamationMark,
  "subject-full-stop": subjectFullStop,
  "subject-max-length": subjectMaxLength,
  "subject-min-length": subjectMinLength,
  "trailer-exists": trailerExists,
  "type-case": typeCase,
  "type-empty": typeEmpty,
  "type-enum": typeEnum,
  "type-max-length": typeMaxLength,
  "type-min-length": typeMinLength,
};

export default rules;
