use crate::parser::parse_commit;
use crate::rules::evaluate_rule;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintRuleOutcome {
    pub valid: bool,
    pub level: u8,
    pub name: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintOutcome {
    pub input: String,
    pub valid: bool,
    pub errors: Vec<LintRuleOutcome>,
    pub warnings: Vec<LintRuleOutcome>,
}

pub fn lint_commit(message: &str, rules_config: &HashMap<String, Value>) -> LintOutcome {
    let trimmed = message.trim();

    if trimmed.starts_with("Fixup!")
        || trimmed.starts_with("squash!")
        || trimmed.starts_with("Merge ")
        || trimmed.starts_with("Revert ")
    {
        return LintOutcome {
            input: message.to_string(),
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        };
    }

    let parsed = parse_commit(message);
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    for (rule_name, rule_value) in rules_config {
        if let Some(arr) = rule_value.as_array() {
            if arr.is_empty() {
                continue;
            }

            let level = arr.first().and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            if level == 0 {
                continue;
            }

            let when = arr.get(1).and_then(|v| v.as_str()).unwrap_or("always");
            let value = arr.get(2).unwrap_or(&Value::Null);

            let (valid, message_override) = evaluate_rule(rule_name, &parsed, when, value);

            if !valid {
                let outcome = LintRuleOutcome {
                    valid: false,
                    level,
                    name: rule_name.clone(),
                    message: if message_override.is_empty() {
                        format!("Rule {} failed", rule_name)
                    } else {
                        message_override
                    },
                };
                if level == 2 {
                    errors.push(outcome);
                } else if level == 1 {
                    warnings.push(outcome);
                }
            }
        }
    }

    LintOutcome {
        input: message.to_string(),
        valid: errors.is_empty(),
        errors,
        warnings,
    }
}
