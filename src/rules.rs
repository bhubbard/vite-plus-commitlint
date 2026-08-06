use crate::parser::ParsedCommit;
use regex::Regex;
use serde_json::Value;
use std::sync::LazyLock;

static EXCLAMATION_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"^(\w*)(?:\((.*)\))?!: (.*)$"#).unwrap());
static BREAKING_FOOTER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?m)^BREAKING[ -]CHANGE:"#).unwrap());

pub fn ensure_case(target: &str, case: &str) -> bool {
    match case {
        "lower-case" | "lowercase" => target == target.to_lowercase(),
        "upper-case" | "uppercase" => target == target.to_uppercase(),
        "camel-case" => {
            let mut chars = target.chars();
            if let Some(first) = chars.next() {
                first.is_lowercase()
                    && !target.contains('-')
                    && !target.contains('_')
                    && !target.contains(' ')
            } else {
                true
            }
        }
        "kebab-case" => {
            target == target.to_lowercase() && !target.contains('_') && !target.contains(' ')
        }
        "snake-case" => {
            target == target.to_lowercase() && !target.contains('-') && !target.contains(' ')
        }
        "pascal-case" => {
            let mut chars = target.chars();
            if let Some(first) = chars.next() {
                first.is_uppercase()
                    && !target.contains('-')
                    && !target.contains('_')
                    && !target.contains(' ')
            } else {
                true
            }
        }
        "sentence-case" | "sentencecase" => {
            let mut chars = target.chars();
            if let Some(first) = chars.next() {
                let rest: String = chars.collect();
                first.is_uppercase() && rest == rest.to_lowercase()
            } else {
                true
            }
        }
        "start-case" => target.split_whitespace().all(|word| {
            let mut chars = word.chars();
            if let Some(first) = chars.next() {
                first.is_uppercase()
            } else {
                true
            }
        }),
        _ => true,
    }
}

pub fn ensure_enum(target: &str, enum_list: &[String]) -> bool {
    enum_list.iter().any(|item| item == target)
}

pub fn evaluate_rule(
    rule_name: &str,
    parsed: &ParsedCommit,
    when: &str,
    value: &Value,
) -> (bool, String) {
    let always = when == "always";

    match rule_name {
        "body-case" => {
            if let Some(body) = &parsed.body {
                let targets = value_to_string_list(value);
                let passes = if always {
                    targets.iter().any(|t| ensure_case(body, t))
                } else {
                    targets.iter().all(|t| !ensure_case(body, t))
                };
                (
                    passes,
                    format!(
                        "body must {}be {}",
                        if always { "" } else { "not " },
                        targets.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "body-empty" => {
            let is_present = parsed.body.as_ref().is_some_and(|b| !b.trim().is_empty());
            let passes = if always { !is_present } else { is_present };
            (
                passes,
                format!("body must {} empty", if always { "be" } else { "not be" }),
            )
        }
        "body-full-stop" => {
            if let Some(body) = &parsed.body {
                let ch = value.as_str().unwrap_or(".");
                let has = body.ends_with(ch);
                let passes = if always { has } else { !has };
                (
                    passes,
                    format!(
                        "body must {}end with \"{}\"",
                        if always { "" } else { "not " },
                        ch
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "body-leading-blank" => {
            if parsed.body.is_some() {
                let lines: Vec<&str> = parsed.raw.lines().collect();
                let has_blank = lines.len() > 1 && lines[1].trim().is_empty();
                let passes = if always { has_blank } else { !has_blank };
                (
                    passes,
                    format!(
                        "body must {}have leading blank line",
                        if always { "" } else { "not " }
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "body-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(body) = &parsed.body {
                let passes = body.len() <= max_len;
                (
                    passes,
                    format!("body must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "body-max-line-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(body) = &parsed.body {
                let passes = body.lines().all(|l| l.len() <= max_len);
                (
                    passes,
                    format!(
                        "body's lines must not be longer than {} characters",
                        max_len
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "body-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(body) = &parsed.body {
                let passes = body.len() >= min_len;
                (
                    passes,
                    format!("body must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "footer-empty" => {
            let is_present = parsed.footer.as_ref().is_some_and(|f| !f.trim().is_empty());
            let passes = if always { !is_present } else { is_present };
            (
                passes,
                format!("footer must {} empty", if always { "be" } else { "not be" }),
            )
        }
        "footer-leading-blank" => {
            if parsed.footer.is_some() {
                let lines: Vec<&str> = parsed.raw.lines().collect();
                let has_blank = lines
                    .iter()
                    .enumerate()
                    .any(|(idx, l)| idx > 1 && l.trim().is_empty() && idx < lines.len() - 1);
                let passes = if always { has_blank } else { !has_blank };
                (
                    passes,
                    format!(
                        "footer must {}have leading blank line",
                        if always { "" } else { "not " }
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "footer-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(footer) = &parsed.footer {
                let passes = footer.len() <= max_len;
                (
                    passes,
                    format!("footer must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "footer-max-line-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(footer) = &parsed.footer {
                let passes = footer.lines().all(|l| l.len() <= max_len);
                (
                    passes,
                    format!(
                        "footer's lines must not be longer than {} characters",
                        max_len
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "footer-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(footer) = &parsed.footer {
                let passes = footer.len() >= min_len;
                (
                    passes,
                    format!("footer must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "header-case" => {
            if let Some(hdr) = &parsed.header {
                let targets = value_to_string_list(value);
                let passes = if always {
                    targets.iter().any(|t| ensure_case(hdr, t))
                } else {
                    targets.iter().all(|t| !ensure_case(hdr, t))
                };
                (
                    passes,
                    format!(
                        "header must {}be {}",
                        if always { "" } else { "not " },
                        targets.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "header-full-stop" => {
            if let Some(hdr) = &parsed.header {
                let ch = value.as_str().unwrap_or(".");
                let has = hdr.ends_with(ch);
                let passes = if always { has } else { !has };
                (
                    passes,
                    format!(
                        "header must {}end with \"{}\"",
                        if always { "" } else { "not " },
                        ch
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "header-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(hdr) = &parsed.header {
                let passes = hdr.len() <= max_len;
                (
                    passes,
                    format!("header must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "header-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(hdr) = &parsed.header {
                let passes = hdr.len() >= min_len;
                (
                    passes,
                    format!("header must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "scope-case" => {
            if let Some(scope) = &parsed.scope {
                let targets = value_to_string_list(value);
                let passes = if always {
                    targets.iter().any(|t| ensure_case(scope, t))
                } else {
                    targets.iter().all(|t| !ensure_case(scope, t))
                };
                (
                    passes,
                    format!(
                        "scope must {}be {}",
                        if always { "" } else { "not " },
                        targets.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "scope-empty" => {
            let is_empty = parsed.scope.as_ref().is_none_or(|s| s.trim().is_empty());
            let passes = if always { is_empty } else { !is_empty };
            (
                passes,
                format!("scope must {} be empty", if always { "" } else { "not" }),
            )
        }
        "scope-enum" => {
            if let Some(scope) = &parsed.scope {
                let enums = value_to_string_list(value);
                let passes = if always {
                    ensure_enum(scope, &enums)
                } else {
                    !ensure_enum(scope, &enums)
                };
                (
                    passes,
                    format!(
                        "scope must {}be one of [{}]",
                        if always { "" } else { "not " },
                        enums.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "scope-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(scope) = &parsed.scope {
                let passes = scope.len() <= max_len;
                (
                    passes,
                    format!("scope must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "scope-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(scope) = &parsed.scope {
                let passes = scope.len() >= min_len;
                (
                    passes,
                    format!("scope must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "subject-case" => {
            if let Some(subj) = &parsed.subject {
                let targets = value_to_string_list(value);
                let passes = if always {
                    targets.iter().any(|t| ensure_case(subj, t))
                } else {
                    targets.iter().all(|t| !ensure_case(subj, t))
                };
                (
                    passes,
                    format!(
                        "subject must {}be {}",
                        if always { "" } else { "not " },
                        targets.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "subject-empty" => {
            let is_empty = parsed.subject.as_ref().is_none_or(|s| s.trim().is_empty());
            let passes = if always { is_empty } else { !is_empty };
            (
                passes,
                format!("subject must {} be empty", if always { "" } else { "not" }),
            )
        }
        "subject-full-stop" => {
            if let Some(subj) = &parsed.subject {
                let ch = value.as_str().unwrap_or(".");
                let has = subj.ends_with(ch);
                let passes = if always { has } else { !has };
                (
                    passes,
                    format!(
                        "subject must {}end with \"{}\"",
                        if always { "" } else { "not " },
                        ch
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "subject-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(subj) = &parsed.subject {
                let passes = subj.len() <= max_len;
                (
                    passes,
                    format!("subject must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "subject-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(subj) = &parsed.subject {
                let passes = subj.len() >= min_len;
                (
                    passes,
                    format!("subject must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "subject-exclamation-mark" => {
            if let Some(subj) = &parsed.subject {
                let has = subj.ends_with('!');
                let passes = if always { has } else { !has };
                (
                    passes,
                    format!(
                        "subject must {}have exclamation mark",
                        if always { "" } else { "not " }
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "type-case" => {
            if let Some(type_) = &parsed.type_ {
                let targets = value_to_string_list(value);
                let passes = if always {
                    targets.iter().any(|t| ensure_case(type_, t))
                } else {
                    targets.iter().all(|t| !ensure_case(type_, t))
                };
                (
                    passes,
                    format!(
                        "type must {}be {}",
                        if always { "" } else { "not " },
                        targets.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "type-empty" => {
            let is_empty = parsed.type_.as_ref().is_none_or(|t| t.trim().is_empty());
            let passes = if always { is_empty } else { !is_empty };
            (
                passes,
                format!("type must {} be empty", if always { "" } else { "not" }),
            )
        }
        "type-enum" => {
            if let Some(type_) = &parsed.type_ {
                let enums = value_to_string_list(value);
                let passes = if always {
                    ensure_enum(type_, &enums)
                } else {
                    !ensure_enum(type_, &enums)
                };
                (
                    passes,
                    format!(
                        "type must {}be one of [{}]",
                        if always { "" } else { "not " },
                        enums.join(", ")
                    ),
                )
            } else {
                (true, String::new())
            }
        }
        "type-max-length" => {
            let max_len = value.as_u64().unwrap_or(u64::MAX) as usize;
            if let Some(type_) = &parsed.type_ {
                let passes = type_.len() <= max_len;
                (
                    passes,
                    format!("type must not be longer than {} characters", max_len),
                )
            } else {
                (true, String::new())
            }
        }
        "type-min-length" => {
            let min_len = value.as_u64().unwrap_or(0) as usize;
            if let Some(type_) = &parsed.type_ {
                let passes = type_.len() >= min_len;
                (
                    passes,
                    format!("type must not be shorter than {} characters", min_len),
                )
            } else {
                (true, String::new())
            }
        }
        "signed-off-by" => {
            let val = value.as_str().unwrap_or("Signed-off-by:");
            let has = parsed.footer.as_ref().is_some_and(|f| f.contains(val));
            let passes = if always { has } else { !has };
            (
                passes,
                format!(
                    "message must {}be signed off by \"{}\"",
                    if always { "" } else { "not " },
                    val
                ),
            )
        }
        "trailer-exists" => {
            let val = value.as_str().unwrap_or("");
            let has = parsed.footer.as_ref().is_some_and(|f| {
                f.lines()
                    .any(|l| l.to_lowercase().starts_with(&val.to_lowercase()))
            }) || parsed
                .raw
                .lines()
                .any(|l| l.to_lowercase().starts_with(&val.to_lowercase()));
            let passes = if always { has } else { !has };
            (
                passes,
                format!(
                    "message must {}have \"{}\" trailer",
                    if always { "" } else { "not " },
                    val
                ),
            )
        }
        "references-empty" => {
            let is_empty = parsed.references.is_empty();
            let passes = if always { is_empty } else { !is_empty };
            (
                passes,
                format!(
                    "references must {} be empty",
                    if always { "" } else { "not" }
                ),
            )
        }
        "breaking-change-exclamation-mark" => {
            let has_exclamation = parsed
                .header
                .as_ref()
                .is_some_and(|h| EXCLAMATION_RE.is_match(h));
            let has_breaking = parsed
                .footer
                .as_ref()
                .is_some_and(|f| BREAKING_FOOTER_RE.is_match(f));
            let check = has_exclamation == has_breaking;
            let negated = when == "never";
            (
                if negated { !check } else { check },
                format!("breaking changes {} have both an exclamation mark in header and BREAKING CHANGE in footer", if negated { "must not" } else { "must" }),
            )
        }
        _ => (true, String::new()),
    }
}

fn value_to_string_list(value: &Value) -> Vec<String> {
    if let Some(arr) = value.as_array() {
        arr.iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect()
    } else if let Some(s) = value.as_str() {
        vec![s.to_string()]
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_commit;
    use serde_json::json;

    #[test]
    fn test_ensure_case() {
        assert!(ensure_case("feat", "lower-case"));
        assert!(!ensure_case("FEAT", "lower-case"));
        assert!(ensure_case("FEAT", "upper-case"));
        assert!(ensure_case("myFeature", "camel-case"));
        assert!(ensure_case("my-feature", "kebab-case"));
        assert!(ensure_case("my_feature", "snake-case"));
        assert!(ensure_case("MyFeature", "pascal-case"));
        assert!(ensure_case("My sentence here", "sentence-case"));
        assert!(ensure_case("Start Case Words", "start-case"));
    }

    #[test]
    fn test_ensure_enum() {
        let list = vec!["feat".to_string(), "fix".to_string(), "docs".to_string()];
        assert!(ensure_enum("feat", &list));
        assert!(!ensure_enum("style", &list));
    }

    #[test]
    fn test_evaluate_rule_type_enum() {
        let parsed = parse_commit("feat: add something");
        let val = json!(["feat", "fix"]);
        let (valid, _) = evaluate_rule("type-enum", &parsed, "always", &val);
        assert!(valid);

        let (invalid, msg) = evaluate_rule("type-enum", &parsed, "never", &val);
        assert!(!invalid);
        assert!(msg.contains("type must not be one of"));
    }

    #[test]
    fn test_evaluate_rule_header_max_length() {
        let parsed = parse_commit("feat: long subject that exceeds twenty characters limit");
        let val = json!(20);
        let (valid, msg) = evaluate_rule("header-max-length", &parsed, "always", &val);
        assert!(!valid);
        assert!(msg.contains("must not be longer than 20 characters"));
    }

    #[test]
    fn test_evaluate_rule_subject_full_stop() {
        let parsed_with_dot = parse_commit("feat: add feature.");
        let val = json!(".");
        let (valid, _) = evaluate_rule("subject-full-stop", &parsed_with_dot, "never", &val);
        assert!(!valid);

        let parsed_no_dot = parse_commit("feat: add feature");
        let (valid2, _) = evaluate_rule("subject-full-stop", &parsed_no_dot, "never", &val);
        assert!(valid2);
    }

    #[test]
    fn test_evaluate_rule_scope_enum() {
        let parsed = parse_commit("feat(ui): add button");
        let val = json!(["ui", "core"]);
        let (valid, _) = evaluate_rule("scope-enum", &parsed, "always", &val);
        assert!(valid);

        let (invalid, _) = evaluate_rule("scope-enum", &parsed, "never", &val);
        assert!(!invalid);
    }

    #[test]
    fn test_evaluate_rule_body_empty() {
        let parsed_empty = parse_commit("feat: subject line");
        let (valid, _) = evaluate_rule("body-empty", &parsed_empty, "always", &json!(null));
        assert!(valid);

        let parsed_with_body = parse_commit("feat: subject line\n\nSome body text");
        let (valid_body, _) = evaluate_rule("body-empty", &parsed_with_body, "never", &json!(null));
        assert!(valid_body);
    }

    #[test]
    fn test_evaluate_rule_signed_off_by() {
        let parsed =
            parse_commit("feat: add feature\n\nSigned-off-by: Developer <dev@example.com>");
        let val = json!("Signed-off-by:");
        let (valid, _) = evaluate_rule("signed-off-by", &parsed, "always", &val);
        assert!(valid);
    }

    #[test]
    fn test_evaluate_rule_breaking_change_exclamation_mark() {
        let parsed_valid =
            parse_commit("feat(core)!: breaking change\n\nBREAKING CHANGE: API changed");
        let (valid, _) = evaluate_rule(
            "breaking-change-exclamation-mark",
            &parsed_valid,
            "always",
            &json!(null),
        );
        assert!(valid);

        let parsed_mismatch =
            parse_commit("feat(core): normal commit\n\nBREAKING CHANGE: API changed");
        let (invalid, _) = evaluate_rule(
            "breaking-change-exclamation-mark",
            &parsed_mismatch,
            "always",
            &json!(null),
        );
        assert!(!invalid);
    }
}
