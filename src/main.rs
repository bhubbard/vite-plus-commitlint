use std::env;
use std::process;
use vite_plus_commitlint::config::load_config;
use vite_plus_commitlint::formatter::{format_report, FormatOptions};
use vite_plus_commitlint::linter::lint_commit;
use vite_plus_commitlint::reader::{read_commit_messages, read_stdin, ReadOptions};

fn main() {
    let args: Vec<String> = env::args().collect();
    let is_json = args.iter().any(|a| a == "--json");

    if args.len() > 1 && (args[1] == "--help" || args[1] == "-h") {
        println!(
            "commitlint-rs - Native Rust commit message linter\n\nUsage:\n  commitlint-rs \"feat: my commit\"\n  cat .git/COMMIT_EDITMSG | commitlint-rs"
        );
        process::exit(0);
    }

    let cwd = env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());
    let config = load_config(&cwd);

    let positional_args: Vec<String> = args
        .iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .cloned()
        .collect();

    let mut messages = Vec::new();

    if !positional_args.is_empty() {
        messages.push(positional_args.join(" "));
    } else {
        let stdin_msg = read_stdin();
        if !stdin_msg.is_empty() {
            messages.push(stdin_msg);
        } else {
            let options = ReadOptions {
                cwd: Some(cwd.clone()),
                edit: Some("true".to_string()),
                ..Default::default()
            };
            messages = read_commit_messages(&options);
        }
    }

    if messages.is_empty() {
        if is_json {
            println!("{{\"valid\":false,\"errors\":[{{\"valid\":false,\"level\":2,\"name\":\"input-empty\",\"message\":\"No commit messages found to lint.\"}}],\"warnings\":[]}}");
        } else {
            eprintln!("No commit messages found to lint.");
        }
        process::exit(1);
    }

    let mut total_errors = 0;
    let mut _total_warnings = 0;

    for msg in &messages {
        let outcome = lint_commit(msg, &config.rules);
        total_errors += outcome.errors.len();
        _total_warnings += outcome.warnings.len();

        if is_json {
            println!("{}", serde_json::to_string(&outcome).unwrap_or_default());
        } else {
            let output = format_report(
                &outcome,
                &FormatOptions {
                    color: true,
                    verbose: false,
                    help_url: config.help_url.clone(),
                },
            );

            if !output.is_empty() {
                println!("{}", output);
            }
        }
    }

    if total_errors > 0 {
        process::exit(1);
    }
}
