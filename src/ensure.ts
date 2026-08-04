import type { TargetCaseType } from './types.js';

export function toCase(input: string, target: TargetCaseType | string): string {
  switch (target) {
    case 'camel-case':
      return input
        .replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
    case 'kebab-case':
      return input
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    case 'snake-case':
      return input
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    case 'pascal-case':
      return input
        .replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
    case 'start-case':
      return input
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
    case 'upper-case':
    case 'uppercase':
      return input.toUpperCase();
    case 'sentence-case':
    case 'sentencecase':
      return input.charAt(0).toUpperCase() + input.slice(1);
    case 'lower-case':
    case 'lowercase':
    case 'lowerCase':
      return input.toLowerCase();
    default:
      throw new TypeError(`ensure.toCase: Unknown target case "${target}"`);
  }
}

export function ensureCase(raw: string = '', target: TargetCaseType | string = 'lowercase'): boolean {
  const input = String(raw)
    .replace(/`.*?`|".*?"|'.*?'/g, '')
    .trim();

  if (!input) return true;

  const transformed = toCase(input, target);
  if (transformed === '' || /^\d/.test(transformed)) {
    return true;
  }
  return transformed === input;
}

export function ensureEnum(value: any = '', enums: any[] = []): boolean {
  if (!value) return true;
  return enums.includes(value);
}

export function maxLength(input: string | null | undefined, max: number): boolean {
  if (input === null || input === undefined) return true;
  return String(input).length <= max;
}

export function minLength(input: string | null | undefined, min: number): boolean {
  if (input === null || input === undefined) return true;
  return String(input).length >= min;
}

export function maxLineLength(input: string | null | undefined, max: number): boolean {
  if (input === null || input === undefined) return true;
  return String(input).split(/\r?\n/).every((line) => line.length <= max);
}

export function notEmpty(input: any): boolean {
  if (input === null || input === undefined) return false;
  if (typeof input === 'string') return input.trim().length > 0;
  if (Array.isArray(input)) return input.length > 0;
  return true;
}
