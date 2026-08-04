use crate::linter::LintOutcome;

pub struct FormatOptions {
    pub color: bool,
    pub verbose: bool,
    pub help_url: Option<String>,
}

impl Default for FormatOptions {
    fn default() -> Self {
        Self {
            color: true,
            verbose: false,
            help_url: None,
        }
    }
}

pub fn format_report(report: &LintOutcome, options: &FormatOptions) -> String {
    let red = |s: &str| {
        if options.color {
            format!("\x1b[31m{}\x1b[39m", s)
        } else {
            s.to_string()
        }
    };
    let yellow = |s: &str| {
        if options.color {
            format!("\x1b[33m{}\x1b[39m", s)
        } else {
            s.to_string()
        }
    };
    let green = |s: &str| {
        if options.color {
            format!("\x1b[32m{}\x1b[39m", s)
        } else {
            s.to_string()
        }
    };
    let bold = |s: &str| {
        if options.color {
            format!("\x1b[1m{}\x1b[22m", s)
        } else {
            s.to_string()
        }
    };
    let dim = |s: &str| {
        if options.color {
            format!("\x1b[2m{}\x1b[22m", s)
        } else {
            s.to_string()
        }
    };

    let mut lines = Vec::new();

    if !report.valid || options.verbose {
        let first_line = report.input.lines().next().unwrap_or("");
        lines.push(format!("{}   input: {}", bold("⧗"), first_line));

        for err in &report.errors {
            lines.push(format!(
                "  {}   {} {}",
                red("✖"),
                err.message,
                dim(&format!("[{}]", err.name))
            ));
        }
        for warn in &report.warnings {
            lines.push(format!(
                "  {}   {} {}",
                yellow("⚠"),
                warn.message,
                dim(&format!("[{}]", warn.name))
            ));
        }
        lines.push(String::new());
    }

    if !report.errors.is_empty() || !report.warnings.is_empty() {
        let summary = format!(
            "{} error(s), {} warning(s)",
            report.errors.len(),
            report.warnings.len()
        );
        let colorized = if !report.errors.is_empty() {
            red(&summary)
        } else {
            yellow(&summary)
        };
        lines.push(format!("{}   found {}", bold("✖"), colorized));

        if let Some(help) = &options.help_url {
            lines.push(format!("{}   Get help: {}", dim("ℹ"), help));
        }
    } else if options.verbose {
        lines.push(format!("{}   0 problems, 0 warnings", green("✔")));
    }

    lines.join("\n")
}
