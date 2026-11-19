use std::collections::HashMap;

use crate::timer::TIME_FLAG;

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

/// Tells whether the arguments hold one that a solver cannot use, like hasUnusableArgument of
/// js/core/commandLineArgsParser.js: a flag of `value_flags` takes the next argument as its value, whatever it is,
/// and may come once, and a flag of `plain_flags` stands alone and may repeat, as --time does for every solver.
pub fn has_unusable_argument(args: &[String], value_flags: &[&str], plain_flags: &[&str]) -> bool {
    let mut seen: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < args.len() {
        let arg = args[i].as_str();

        if value_flags.contains(&arg) {
            if seen.contains(&arg) {
                return true;
            }

            seen.push(arg);
            i += 1;
        } else if !plain_flags.contains(&arg) && arg != TIME_FLAG {
            return true;
        }

        i += 1;
    }

    false
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

    #[test]
    fn finds_an_argument_that_is_no_flag_of_the_solver_and_no_value_of_one() {
        let cases: [(&[&str], bool); 10] = [
            (&["-r", "4", "-c", "4", "--lattice", "square", "--torus", "--time"], false),
            (&[], false),
            (&["-r", "--surface", "--lattice"], false),
            (&["-r", "4", "--surface", "torus"], true),
            (&["-r", "4", "torus"], true),
            (&["4", "-r", "4"], true),
            (&["-r", "4", "--twisted"], true),
            (&["-r", "4", "-j", "1"], true),
            (&["-r", "4", "--torus=1"], true),
            (&["-r", "4", ""], true),
        ];

        for (args, expected) in cases {
            let args: Vec<String> = args.iter().map(|arg| arg.to_string()).collect();

            assert_eq!(has_unusable_argument(&args, &["-r", "-c", "--lattice"], &["--torus"]), expected, "{args:?}");
        }

        let timed: Vec<String> = ["-r", "4", "--time"].map(String::from).to_vec();
        let torus: Vec<String> = ["-r", "4", "--torus"].map(String::from).to_vec();

        assert!(!has_unusable_argument(&timed, &["-r"], &[]));
        assert!(has_unusable_argument(&torus, &["-r"], &[]));
    }

    #[test]
    fn finds_a_flag_with_a_value_given_a_second_time() {
        let cases: [(&[&str], bool); 6] = [
            (&["-r", "4", "-r", "6", "-c", "4"], true),
            (&["-r", "4", "-c", "4", "-c", "4"], true),
            (&["--lattice", "square", "--lattice", "king"], true),
            (&["-r", "4", "--torus", "--torus"], false),
            (&["-r", "4", "--time", "--time"], false),
            (&["-c", "-r", "-r", "4"], false),
        ];

        for (args, expected) in cases {
            let args: Vec<String> = args.iter().map(|arg| arg.to_string()).collect();

            assert_eq!(has_unusable_argument(&args, &["-r", "-c", "--lattice"], &["--torus"]), expected, "{args:?}");
        }
    }
}
