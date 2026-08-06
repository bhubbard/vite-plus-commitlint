use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static REVERT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)^revert\s+"?(.*?)"?\s*$"#).unwrap());
static HEADER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"^([a-zA-Z0-9_-]+)(?:\((.*)\))?(!)?:\s*(.*)$"#).unwrap());
static BREAKING_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)(?:^|\n)BREAKING[ -]CHANGE:\s*([\s\S]*)"#).unwrap());
static REF_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?:([a-zA-Z0-9_-]+)\s+)?#(\d+)"#).unwrap());
static MENTION_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"@([a-zA-Z0-9_/-]+)"#).unwrap());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitNote {
    pub title: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitReference {
    pub action: Option<String>,
    pub owner: Option<String>,
    pub repository: Option<String>,
    pub issue: String,
    pub raw: String,
    pub prefix: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevertInfo {
    pub header: String,
    pub hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedCommit {
    pub raw: String,
    pub header: Option<String>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub scope: Option<String>,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub footer: Option<String>,
    pub notes: Vec<CommitNote>,
    pub references: Vec<CommitReference>,
    pub revert: Option<RevertInfo>,
    pub mentions: Vec<String>,
}

pub fn parse_commit(message: &str) -> ParsedCommit {
    let lines: Vec<&str> = message.lines().collect();
    let header_line = lines.first().copied().unwrap_or("").to_string();

    let mut revert = None;
    if let Some(caps) = REVERT_RE.captures(&header_line) {
        revert = Some(RevertInfo {
            header: caps.get(1).map_or("", |m| m.as_str()).to_string(),
            hash: None,
        });
    }

    let mut type_ = None;
    let mut scope = None;
    let mut subject = None;

    if let Some(caps) = HEADER_RE.captures(&header_line) {
        type_ = caps
            .get(1)
            .map(|m| m.as_str().to_string())
            .filter(|s| !s.is_empty());
        scope = caps
            .get(2)
            .map(|m| m.as_str().to_string())
            .filter(|s| !s.is_empty());
        subject = caps
            .get(4)
            .map(|m| m.as_str().to_string())
            .filter(|s| !s.is_empty());
    }

    let mut body_lines = Vec::new();
    let mut footer_lines = Vec::new();
    let mut in_footer = false;

    for (i, line) in lines.iter().enumerate().skip(1) {
        let is_footer = line.starts_with("BREAKING CHANGE:")
            || line.starts_with("BREAKING-CHANGE:")
            || (line.contains(':') && !line.starts_with(' '))
            || (line.contains('#') && line.split_whitespace().count() <= 3);

        if is_footer && !in_footer && i > 1 {
            in_footer = true;
        }

        if in_footer {
            footer_lines.push(*line);
        } else {
            body_lines.push(*line);
        }
    }

    let body_str = body_lines.join("\n").trim().to_string();
    let body = if body_str.is_empty() {
        None
    } else {
        Some(body_str)
    };

    let footer_str = footer_lines.join("\n").trim().to_string();
    let footer = if footer_str.is_empty() {
        None
    } else {
        Some(footer_str)
    };

    let mut notes = Vec::new();
    if let Some(caps) = BREAKING_RE.captures(message) {
        notes.push(CommitNote {
            title: "BREAKING CHANGE".to_string(),
            text: caps.get(1).map_or("", |m| m.as_str()).trim().to_string(),
        });
    }

    let mut references = Vec::new();
    for caps in REF_RE.captures_iter(message) {
        references.push(CommitReference {
            action: caps.get(1).map(|m| m.as_str().to_string()),
            owner: None,
            repository: None,
            issue: caps.get(2).map_or("", |m| m.as_str()).to_string(),
            raw: caps.get(0).map_or("", |m| m.as_str()).to_string(),
            prefix: "#".to_string(),
        });
    }

    let mut mentions = Vec::new();
    for caps in MENTION_RE.captures_iter(message) {
        mentions.push(caps.get(1).map_or("", |m| m.as_str()).to_string());
    }

    ParsedCommit {
        raw: message.to_string(),
        header: if header_line.is_empty() {
            None
        } else {
            Some(header_line)
        },
        type_,
        scope,
        subject,
        body,
        footer,
        notes,
        references,
        revert,
        mentions,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_conventional_commit() {
        let msg =
            "feat(scope): add new rust feature\n\nBody paragraph\n\nBREAKING CHANGE: breaks stuff";
        let parsed = parse_commit(msg);
        assert_eq!(parsed.type_.as_deref(), Some("feat"));
        assert_eq!(parsed.scope.as_deref(), Some("scope"));
        assert_eq!(parsed.subject.as_deref(), Some("add new rust feature"));
        assert_eq!(parsed.body.as_deref(), Some("Body paragraph"));
        assert_eq!(parsed.notes.len(), 1);
        assert_eq!(parsed.notes[0].title, "BREAKING CHANGE");
    }

    #[test]
    fn test_parse_revert_commit() {
        let msg = r#"revert "feat: add button""#;
        let parsed = parse_commit(msg);
        assert!(parsed.revert.is_some());
        assert_eq!(parsed.revert.unwrap().header, "feat: add button");
    }

    #[test]
    fn test_parse_references_and_mentions() {
        let msg = "fix(auth): resolve login crash\n\nCloses #42 and fixes #108. CC @octocat";
        let parsed = parse_commit(msg);
        assert_eq!(parsed.type_.as_deref(), Some("fix"));
        assert_eq!(parsed.scope.as_deref(), Some("auth"));
        assert_eq!(parsed.references.len(), 2);
        assert_eq!(parsed.references[0].issue, "42");
        assert_eq!(parsed.references[1].issue, "108");
        assert_eq!(parsed.mentions, vec!["octocat"]);
    }
}
