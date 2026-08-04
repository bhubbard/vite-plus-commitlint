import fs from "node:fs";
import path from "node:path";
import type { QualifiedConfig, UserConfig } from "./types.js";
import conventionalPreset from "./presets/conventional.js";

export async function resolveConfig(
  cwd: string = process.cwd(),
  configFile?: string,
  userSeed?: UserConfig,
): Promise<QualifiedConfig> {
  let loadedConfig: UserConfig = { ...conventionalPreset };

  // 1. Explicit config file provided
  if (configFile) {
    const fullPath = path.isAbsolute(configFile) ? configFile : path.join(cwd, configFile);
    if (fs.existsSync(fullPath)) {
      try {
        const module = await import(fullPath);
        const fileConfig = module.default || module;
        loadedConfig = mergeConfigs(loadedConfig, fileConfig);
      } catch {
        // Fallback
      }
    }
  } else {
    // 2. Check for legacy commitlint files in cwd
    const candidates = [
      "commitlint.config.js",
      "commitlint.config.mjs",
      "commitlint.config.ts",
      ".commitlintrc.json",
      ".commitlintrc.js",
    ];
    for (const candidate of candidates) {
      const fullPath = path.join(cwd, candidate);
      if (fs.existsSync(fullPath)) {
        try {
          if (candidate.endsWith(".json")) {
            const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
            loadedConfig = mergeConfigs(loadedConfig, json);
          } else {
            const module = await import(fullPath);
            const fileConfig = module.default || module;
            loadedConfig = mergeConfigs(loadedConfig, fileConfig);
          }
          break;
        } catch {
          // Continue to next candidate
        }
      }
    }
  }

  // 3. User seed override from vite.config.ts or plugin options
  if (userSeed) {
    loadedConfig = mergeConfigs(loadedConfig, userSeed);
  }

  return {
    extends: loadedConfig.extends || [],
    parserPreset:
      typeof loadedConfig.parserPreset === "object" ? loadedConfig.parserPreset : undefined,
    rules: loadedConfig.rules || conventionalPreset.rules!,
    ignores: loadedConfig.ignores,
    defaultIgnores: loadedConfig.defaultIgnores ?? true,
    helpUrl: loadedConfig.helpUrl || "https://commitlint.js.org/",
  };
}

export function mergeConfigs(base: UserConfig, override: UserConfig): UserConfig {
  return {
    ...base,
    ...override,
    rules: {
      ...base.rules,
      ...override.rules,
    },
    extends: [...(base.extends || []), ...(override.extends || [])],
  };
}
