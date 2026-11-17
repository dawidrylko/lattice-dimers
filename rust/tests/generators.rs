use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn last_term(entry: &str, b_file: &str) -> usize {
    if std::env::var("FULL_CASES").as_deref() == Ok("1") {
        return b_file.lines().count() - 1;
    }

    let limits: Value = serde_json::from_str(&fs::read_to_string(root().join("spec/limits.json")).unwrap()).unwrap();

    limits["generators"][entry]["rs"]
        .as_u64()
        .unwrap_or_else(|| panic!("spec/limits.json has no last term of {entry} for rs")) as usize
}

fn check(entry: &str, binary: &str) {
    if std::env::var("GENERATOR_CHECKS").as_deref() == Ok("skip") {
        eprintln!("Skipped b{}: GENERATOR_CHECKS=skip, nothing the generators depend on changed.", &entry[1..]);
        return;
    }

    let b_file = fs::read_to_string(root().join(format!("oeis/{entry}/b{}.txt", &entry[1..]))).unwrap();
    let last = last_term(entry, &b_file);
    let output = Command::new(binary).args(["0", &last.to_string()]).output().unwrap();
    let expected: String = b_file.lines().take(last + 1).map(|line| format!("{line}\n")).collect();

    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    assert!(String::from_utf8_lossy(&output.stdout) == expected, "b{} 0 {last} does not print the first {} lines of its b-file", &entry[1..], last + 1);

    for args in [vec![], vec!["1"], vec!["3", "2"], vec!["x", "2"], vec!["+1", "2"], vec!["0", "1", "2"]] {
        let output = Command::new(binary).args(&args).output().unwrap();

        assert_eq!(output.status.code(), Some(2), "{args:?}");
        assert!(String::from_utf8_lossy(&output.stderr).starts_with("Usage: "), "{args:?}");
        assert!(output.stdout.is_empty(), "{args:?}");
    }
}

#[test]
fn b309117_prints_its_b_file() {
    check("A309117", env!("CARGO_BIN_EXE_b309117"));
}

#[test]
fn b401988_prints_its_b_file() {
    check("A401988", env!("CARGO_BIN_EXE_b401988"));
}

#[test]
fn b402345_prints_its_b_file() {
    check("A402345", env!("CARGO_BIN_EXE_b402345"));
}
