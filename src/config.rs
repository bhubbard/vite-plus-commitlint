use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize)]
pub struct LoadedConfig {
    pub rules: HashMap<String, Value>,
    pub help_url: Option<String>,
}

pub fn load_config(cwd: &str) -> LoadedConfig {
    let candidates = [
        format!("{}/.commitlintrc.json", cwd),
        format!("{}/commitlint.config.json", cwd),
        format!("{}/package.json", cwd),
    ];

    for path in &candidates {
        if Path::new(path).exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if let Ok(json) = serde_json::from_str::<Value>(&content) {
                    let rules_val = if path.ends_with("package.json") {
                        json.get("commitlint").and_then(|c| c.get("rules"))
                    } else {
                        json.get("rules")
                    };

                    let help_url =
                        json.get("helpUrl").and_then(|h| h.as_str().map(|s| s.to_string()));

                    if let Some(rules_obj) = rules_val.and_then(|r| r.as_object()) {
                        let mut rules = HashMap::new();
                        for (k, v) in rules_obj {
                            rules.insert(k.clone(), v.clone());
                        }
                        return LoadedConfig { rules, help_url };
                    }
                }
            }
        }
    }

    let default_raw = r#"{
        "body-leading-blank": [1, "always"],
        "footer-leading-blank": [1, "always"],
        "header-max-length": [2, "always", 72],
        "scope-case": [2, "always", "lower-case"],
        "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
        "subject-empty": [2, "never"],
        "subject-full-stop": [2, "never", "."],
        "type-case": [2, "always", "lower-case"],
        "type-empty": [2, "never"],
        "type-enum": [2, "always", ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"]]
    }"#;
    LoadedConfig {
        rules: serde_json::from_str(default_raw).unwrap(),
        help_url: None,
    }
}
