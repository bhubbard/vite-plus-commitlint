import fs from 'node:fs';
import path from 'node:path';
import { x } from 'tinyexec';

export interface ReadOptions {
  cwd?: string;
  edit?: string | boolean;
  env?: string;
  from?: string;
  to?: string;
  last?: boolean;
  fromLastTag?: boolean;
  gitLogArgs?: string;
}

export async function readCommitMessages(options: ReadOptions = {}): Promise<string[]> {
  const cwd = options.cwd || process.cwd();

  // 1. Read from specified file or default edit message
  if (options.edit || options.env) {
    let filePath: string | null = null;
    if (options.env && process.env[options.env]) {
      filePath = process.env[options.env]!;
    } else if (typeof options.edit === 'string' && options.edit.length > 0) {
      filePath = path.isAbsolute(options.edit) ? options.edit : path.join(cwd, options.edit);
    } else {
      filePath = path.join(cwd, '.git', 'COMMIT_EDITMSG');
    }

    if (filePath && fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      // Strip comments (e.g. lines starting with '#')
      const cleaned = content
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n')
        .trim();
      return cleaned ? [cleaned] : [];
    }
  }

  // 2. Read git history using `git log`
  if (options.from || options.to || options.last || options.fromLastTag) {
    let from = options.from;
    const to = options.to || 'HEAD';

    if (options.last && !from) {
      from = 'HEAD~1';
    } else if (options.fromLastTag && !from) {
      try {
        const tagResult = await x('git', ['describe', '--tags', '--abbrev=0'], { nodeOptions: { cwd } });
        if (tagResult.exitCode === 0) {
          from = tagResult.stdout.trim();
        }
      } catch {
        from = 'HEAD~1';
      }
    }

    const args = ['log', '--format=%B%x1e'];
    if (from && to) {
      args.push(`${from}..${to}`);
    } else if (from) {
      args.push(`${from}..HEAD`);
    } else if (to) {
      args.push(to);
    }

    if (options.gitLogArgs) {
      args.push(...options.gitLogArgs.split(' ').filter(Boolean));
    }

    try {
      const result = await x('git', args, { nodeOptions: { cwd } });
      if (result.exitCode === 0) {
        return result.stdout
          .split('\x1e')
          .map((msg) => msg.trim())
          .filter(Boolean);
      }
    } catch {
      // Fallback
    }
  }

  return [];
}

export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  process.stdin.setEncoding('utf8');
  let result = '';
  for await (const chunk of process.stdin) {
    result += chunk;
  }
  return result.trim();
}
