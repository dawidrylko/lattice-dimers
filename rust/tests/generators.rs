use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const LATER_RANGE: (usize, usize) = (3, 4);

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

    for n in ["0", "1"] {
        let output = Command::new(binary).args([n, n]).output().unwrap();
        let line = b_file.lines().nth(n.parse().unwrap()).unwrap();

        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
        assert!(String::from_utf8_lossy(&output.stdout) == format!("{line}\n"), "b{} {n} {n} does not print line {n} of its b-file alone", &entry[1..]);
    }

    let (first, end) = LATER_RANGE;
    let output = Command::new(binary).args([first.to_string(), end.to_string()]).output().unwrap();
    let expected: String = b_file.lines().skip(first).take(end - first + 1).map(|line| format!("{line}\n")).collect();

    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    assert!(String::from_utf8_lossy(&output.stdout) == expected, "b{} {first} {end} does not print lines {first} to {end} of its b-file", &entry[1..]);

    for args in [vec![], vec!["1"], vec!["3", "2"], vec!["x", "2"], vec!["+1", "2"], vec!["0", "1", "2"]] {
        let output = Command::new(binary).args(&args).output().unwrap();

        assert_eq!(output.status.code(), Some(2), "{args:?}");
        assert!(String::from_utf8_lossy(&output.stderr).starts_with("Usage: "), "{args:?}");
        assert!(output.stdout.is_empty(), "{args:?}");
    }
}

#[test]
fn b004003_prints_its_b_file() {
    check("A004003", env!("CARGO_BIN_EXE_b004003"));
}

#[test]
fn b239264_prints_its_b_file() {
    check("A239264", env!("CARGO_BIN_EXE_b239264"));
}

#[test]
fn b239273_prints_its_b_file() {
    check("A239273", env!("CARGO_BIN_EXE_b239273"));
}

#[test]
fn b309117_prints_its_b_file() {
    check("A309117", env!("CARGO_BIN_EXE_b309117"));
}

#[test]
fn b401670_prints_its_b_file() {
    check("A401670", env!("CARGO_BIN_EXE_b401670"));
}

#[test]
fn b401673_prints_its_b_file() {
    check("A401673", env!("CARGO_BIN_EXE_b401673"));
}

#[test]
fn b401988_prints_its_b_file() {
    check("A401988", env!("CARGO_BIN_EXE_b401988"));
}

#[test]
fn b402163_prints_its_b_file() {
    check("A402163", env!("CARGO_BIN_EXE_b402163"));
}

#[test]
fn b402345_prints_its_b_file() {
    check("A402345", env!("CARGO_BIN_EXE_b402345"));
}
