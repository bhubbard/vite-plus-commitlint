use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{self, Read};
use std::process;
use vite_plus_commitlint::linter::lint_commit;

fn get_default_rules() -> HashMap<String, Value> {
    let raw = r#"{
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
    serde_json::from_str(raw).unwrap()
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut message = String::new();

    if args.len() > 1 && (args[1] == "--help" || args[1] == "-h") {
        println!(
            "commitlint-rs - Native Rust commit message linter\n\nUsage:\n  commitlint-rs \"feat: my commit\"\n  cat .git/COMMIT_EDITMSG | commitlint-rs"
        );
        process::exit(0);
    }

    if args.len() > 1 && !args[1].starts_with('-') {
        message = args[1..].join(" ");
    } else {
        let _ = io::stdin().read_to_string(&mut message);
        if message.trim().is_empty() {
            if let Ok(content) = fs::read_to_string(".git/COMMIT_EDITMSG") {
                message = content;
            }
        }
    }

    let cleaned = message
        .lines()
        .filter(|line| !line.trim().starts_with('#'))
        .collect::<Vec<&str>>()
        .join("\n")
        .trim()
        .to_string();

    if cleaned.is_empty() {
        eprintln!("No commit message provided.");
        process::exit(1);
    }

    let rules = get_default_rules();
    let outcome = lint_commit(&cleaned, &rules);

    if !outcome.valid {
        eprintln!("⧗   input: {}", cleaned.lines().next().unwrap_or(""));
        for err in &outcome.errors {
            eprintln!("  ✖   {} [{}]", err.message, err.name);
        }
        for warn in &outcome.warnings {
            eprintln!("  ⚠   {} [{}]", warn.message, warn.name);
        }
        eprintln!(
            "\n✖   found {} error(s), {} warning(s)",
            outcome.errors.len(),
            outcome.warnings.len()
        );
        process::exit(1);
    } else {
        println!("✔   commit message valid");
    }
}
