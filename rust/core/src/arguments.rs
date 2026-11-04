use std::collections::HashMap;

pub const MAX_SAFE_INTEGER: u64 = (1 << 53) - 1;

fn parse_value(value: Option<&String>) -> Option<u64> {
    let text = value?;

    if text.is_empty() || !text.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }

    text.parse::<u64>().ok().filter(|number| *number <= MAX_SAFE_INTEGER)
}

/// Parses command line arguments like js/core/commandLineArgsParser.js: a flag of the schema takes the next
/// argument when it is a safe non-negative integer written in ASCII digits. A flag that is missing has no key,
/// and a flag whose value is not such an integer maps to None, where the JavaScript parser gives NaN.
pub fn parse_args<'a>(args: &[String], schema: &[(&str, &'a str)]) -> HashMap<&'a str, Option<u64>> {
    let mut options = HashMap::new();
    let mut i = 0;

    while i < args.len() {
        if let Some((_, name)) = schema.iter().find(|(flag, _)| *flag == args[i]) {
            options.insert(*name, parse_value(args.get(i + 1)));
            i += 1;
        }

        i += 1;
    }

    options
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_like_the_javascript_parser() {
        let cases: [(Option<&str>, Option<u64>); 9] = [
            (Some("12"), Some(12)),
            (Some("0"), Some(0)),
            (Some("2abc"), None),
            (Some("-2"), None),
            (Some("+2"), None),
            (Some("1e3"), None),
            (Some("9007199254740992"), None),
            (Some("99999999999999999999999"), None),
            (None, None),
        ];

        for (value, expected) in cases {
            let args: Vec<String> = std::iter::once("-s").chain(value).map(String::from).collect();

            assert_eq!(parse_args(&args, &[("-s", "size")]).get("size"), Some(&expected), "{value:?}");
        }
    }

    #[test]
    fn skips_the_value_of_a_flag() {
        let args: Vec<String> = ["-r", "-c", "-c", "4"].map(String::from).to_vec();
        let options = parse_args(&args, &[("-r", "rowCount"), ("-c", "colCount")]);

        assert_eq!(options.get("rowCount"), Some(&None));
        assert_eq!(options.get("colCount"), Some(&Some(4)));
    }
}
