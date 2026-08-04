#![deny(clippy::all)]

pub mod linter;
pub mod parser;
pub mod rules;

#[cfg(feature = "napi-binding")]
use linter::lint_commit;
#[cfg(feature = "napi-binding")]
use napi_derive::napi;
#[cfg(feature = "napi-binding")]
use parser::parse_commit;
#[cfg(feature = "napi-binding")]
use serde_json::Value;
#[cfg(feature = "napi-binding")]
use std::collections::HashMap;

#[cfg(feature = "napi-binding")]
#[napi]
pub fn lint_commit_rs(message: String, rules_json: String) -> String {
    let rules_config: HashMap<String, Value> =
        serde_json::from_str(&rules_json).unwrap_or_default();
    let outcome = lint_commit(&message, &rules_config);
    serde_json::to_string(&outcome).unwrap_or_default()
}

#[cfg(feature = "napi-binding")]
#[napi]
pub fn parse_commit_rs(message: String) -> String {
    let parsed = parse_commit(&message);
    serde_json::to_string(&parsed).unwrap_or_default()
}
