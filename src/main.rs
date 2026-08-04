use std::env;
use std::process;
use vite_plus_commitlint::config::load_config;
use vite_plus_commitlint::formatter::{format_report, FormatOptions};
use vite_plus_commitlint::linter::lint_commit;
use vite_plus_commitlint::parser::parse_commit;
use vite_plus_commitlint::reader::{read_commit_messages, read_stdin, ReadOptions};

fn main() {
    let raw_args: Vec<String> = env::args().collect();

    let mut is_json = false;
    let mut parse_mode = false;
    let mut print_config: Option<String> = None;
    let mut edit: Option<String> = None;
    let mut from: Option<String> = None;
    let mut to: Option<String> = None;
    let mut last = false;
    let mut from_last_tag = false;
    let mut strict = false;
    let mut color = true;
    let mut verbose = false;
    let mut quiet = false;
    let mut custom_cwd: Option<String> = None;

    let mut positional_args: Vec<String> = Vec::new();

    let mut i = 1;
    while i < raw_args.len() {
        let arg = &raw_args[i];
        match arg.as_str() {
            "--help" | "-h" => {
                println!(
                    "commitlint-rs - Native Rust commit message linter for Vite+\n\n\
                    Usage:\n  \
                      vite-plus-commitlint [message]\n  \
                      vite-plus-commitlint --edit [path]\n  \
                      vite-plus-commitlint --print-config json\n  \
                      vite-plus-commitlint --from <rev> --to <rev>\n\n\
                    Options:\n  \
                      -e, --edit [path]    Lint commit edit message file\n  \
                      --from <rev>         Lower end of the commit range to lint\n  \
                      --to <rev>           Upper end of the commit range to lint\n  \
                      --last               Lint last commit (HEAD~1..HEAD)\n  \
                      --from-last-tag      Lint commits from last tag to HEAD\n  \
                      --print-config [fmt] Print resolved config (json | text)\n  \
                      --strict             Exit with code 2 on warnings\n  \
                      --json               Output JSON format\n  \
                      --color / --no-color Enable/disable colored output\n  \
                      --quiet              Suppress output\n  \
                      --verbose            Show verbose lint details\n  \
                      -h, --help           Display help message"
                );
                process::exit(0);
            }
            "--json" => {
                is_json = true;
            }
            "--parse" => {
                parse_mode = true;
            }
            "--strict" => {
                strict = true;
            }
            "--color" => {
                color = true;
            }
            "--no-color" => {
                color = false;
            }
            "--quiet" | "-q" => {
                quiet = true;
            }
            "--verbose" | "-v" => {
                verbose = true;
            }
            "--last" => {
                last = true;
            }
            "--from-last-tag" => {
                from_last_tag = true;
            }
            "--edit" | "-e" => {
                if i + 1 < raw_args.len() && !raw_args[i + 1].starts_with('-') {
                    i += 1;
                    edit = Some(raw_args[i].clone());
                } else {
                    edit = Some("true".to_string());
                }
            }
            "--from" => {
                if i + 1 < raw_args.len() {
                    i += 1;
                    from = Some(raw_args[i].clone());
                }
            }
            "--to" => {
                if i + 1 < raw_args.len() {
                    i += 1;
                    to = Some(raw_args[i].clone());
                }
            }
            "--cwd" => {
                if i + 1 < raw_args.len() {
                    i += 1;
                    custom_cwd = Some(raw_args[i].clone());
                }
            }
            "--print-config" => {
                if i + 1 < raw_args.len() && !raw_args[i + 1].starts_with('-') {
                    i += 1;
                    print_config = Some(raw_args[i].clone());
                } else {
                    print_config = Some("json".to_string());
                }
            }
            _ => {
                if !arg.starts_with('-') {
                    positional_args.push(arg.clone());
                }
            }
        }
        i += 1;
    }

    let cwd = custom_cwd.unwrap_or_else(|| {
        env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string())
    });

    let config = load_config(&cwd);

    if let Some(fmt) = print_config {
        if fmt == "json" || is_json {
            println!(
                "{}",
                serde_json::to_string_pretty(&config).unwrap_or_default()
            );
        } else {
            println!("Rules: {:#?}", config.rules);
        }
        process::exit(0);
    }

    let mut messages = Vec::new();

    if !positional_args.is_empty() {
        messages.push(positional_args.join(" "));
    } else if edit.is_some() || from.is_some() || to.is_some() || last || from_last_tag {
        let read_opts = ReadOptions {
            cwd: Some(cwd.clone()),
            edit,
            from,
            to,
            last,
            from_last_tag,
            ..Default::default()
        };
        messages = read_commit_messages(&read_opts);
    } else {
        let stdin_msg = read_stdin();
        if !stdin_msg.is_empty() {
            messages.push(stdin_msg);
        } else {
            let read_opts = ReadOptions {
                cwd: Some(cwd.clone()),
                edit: Some("true".to_string()),
                ..Default::default()
            };
            messages = read_commit_messages(&read_opts);
        }
    }

    if messages.is_empty() {
        if is_json {
            println!("{{\"valid\":false,\"errors\":[{{\"valid\":false,\"level\":2,\"name\":\"input-empty\",\"message\":\"No commit messages found to lint.\"}}],\"warnings\":[]}}");
        } else if !quiet {
            eprintln!("No commit messages found to lint.");
        }
        process::exit(1);
    }

    if parse_mode {
        for msg in &messages {
            let parsed = parse_commit(msg);
            println!("{}", serde_json::to_string(&parsed).unwrap_or_default());
        }
        process::exit(0);
    }

    let mut total_errors = 0;
    let mut total_warnings = 0;

    for msg in &messages {
        let outcome = lint_commit(msg, &config.rules);
        total_errors += outcome.errors.len();
        total_warnings += outcome.warnings.len();

        if is_json {
            println!("{}", serde_json::to_string(&outcome).unwrap_or_default());
        } else if !quiet {
            let output = format_report(
                &outcome,
                &FormatOptions {
                    color,
                    verbose,
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
    } else if strict && total_warnings > 0 {
        process::exit(2);
    }
}
