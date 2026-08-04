use std::fs;
use std::io::{self, Read};
use std::process::Command;

#[derive(Default)]
pub struct ReadOptions {
    pub cwd: Option<String>,
    pub edit: Option<String>,
    pub env: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub last: bool,
    pub from_last_tag: bool,
    pub git_log_args: Option<String>,
}

pub fn read_commit_messages(options: &ReadOptions) -> Vec<String> {
    let cwd = options.cwd.as_deref().unwrap_or(".");

    if let Some(edit) = &options.edit {
        let path = if edit == "true" || edit.is_empty() {
            format!("{}/.git/COMMIT_EDITMSG", cwd)
        } else {
            edit.clone()
        };
        if let Ok(content) = fs::read_to_string(&path) {
            let cleaned = content
                .lines()
                .filter(|l| !l.trim().starts_with('#'))
                .collect::<Vec<&str>>()
                .join("\n")
                .trim()
                .to_string();
            if !cleaned.is_empty() {
                return vec![cleaned];
            }
        }
    }

    if options.from.is_some() || options.to.is_some() || options.last || options.from_last_tag {
        let mut from = options.from.clone();
        let to = options.to.as_deref().unwrap_or("HEAD");

        if options.last && from.is_none() {
            from = Some("HEAD~1".to_string());
        } else if options.from_last_tag && from.is_none() {
            if let Ok(out) = Command::new("git")
                .args(["describe", "--tags", "--abbrev=0"])
                .current_dir(cwd)
                .output()
            {
                if out.status.success() {
                    from = Some(String::from_utf8_lossy(&out.stdout).trim().to_string());
                }
            }
            if from.is_none() {
                from = Some("HEAD~1".to_string());
            }
        }

        let mut args = vec!["log".to_string(), "--format=%B%x1e".to_string()];
        if let Some(f) = &from {
            args.push(format!("{}..{}", f, to));
        }

        if let Ok(out) = Command::new("git").args(&args).current_dir(cwd).output() {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                return stdout
                    .split('\x1e')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
            }
        }
    }

    Vec::new()
}

pub fn read_stdin() -> String {
    let mut buffer = String::new();
    let _ = io::stdin().read_to_string(&mut buffer);
    buffer.trim().to_string()
}
