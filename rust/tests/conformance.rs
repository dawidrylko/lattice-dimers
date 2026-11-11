use serde_json::Value;
use std::collections::HashSet;
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, Instant};

macro_rules! binaries {
    ($($id:literal),*) => {
        fn binary(id: &str) -> &'static str {
            match id {
                $($id => env!(concat!("CARGO_BIN_EXE_", $id)),)*
                _ => panic!("no binary for {id}"),
            }
        }
    };
}

binaries!(
    "all-lattices-cylinder-torus-bigint",
    "all-lattices-cylinder-torus-modular",
    "all-lattices-rectangle-bigint",
    "all-lattices-rectangle-modular",
    "domicule-cylinder-torus-polynomial-bigint",
    "domicule-cylinder-torus-polynomial-modular",
    "domicule-rectangle-polynomial-bigint",
    "domicule-rectangle-polynomial-modular",
    "domicule-rectangle-bigint",
    "domicule-rectangle-modular",
    "domino-rectangle-bigint",
    "domino-rectangle-formula",
    "domino-rectangle-number"
);

const MEMORY_LIMIT_BYTES: u64 = 256 * 1024 * 1024;
const SHORT: Duration = Duration::from_secs(30);
const LONG: Duration = Duration::from_secs(900);

struct Run {
    code: i32,
    stdout: String,
    stderr: String,
    peak_bytes: u64,
    elapsed: Duration,
}

fn run(id: &str, args: &[String], limit: Duration) -> Run {
    let start = Instant::now();
    let mut child = Command::new(binary(id))
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap_or_else(|error| panic!("cannot start {id}: {error}"));
    let pid = child.id() as libc::pid_t;
    let mut out = child.stdout.take().unwrap();
    let mut err = child.stderr.take().unwrap();
    let stdout = std::thread::spawn(move || {
        let mut text = String::new();
        out.read_to_string(&mut text).ok();
        text
    });
    let stderr = std::thread::spawn(move || {
        let mut text = String::new();
        err.read_to_string(&mut text).ok();
        text
    });
    let mut status = 0;
    let mut usage: libc::rusage = unsafe { std::mem::zeroed() };
    let mut timed_out = false;
    loop {
        let waited = unsafe { libc::wait4(pid, &mut status, libc::WNOHANG, &mut usage) };
        if waited == pid {
            break;
        }
        assert!(waited == 0, "wait4 failed for {id}");
        if !timed_out && start.elapsed() > limit {
            timed_out = true;
            unsafe { libc::kill(pid, libc::SIGKILL) };
        }
        std::thread::sleep(Duration::from_millis(1));
    }
    let elapsed = start.elapsed();
    child.wait().ok();
    let unit = if cfg!(target_os = "macos") { 1 } else { 1024 };
    let code = if timed_out {
        -2
    } else if libc::WIFEXITED(status) {
        libc::WEXITSTATUS(status)
    } else {
        -1
    };
    Run {
        code,
        stdout: stdout.join().unwrap(),
        stderr: stderr.join().unwrap(),
        peak_bytes: usage.ru_maxrss as u64 * unit,
        elapsed,
    }
}

fn describe(id: &str, args: &[String], run: &Run) -> String {
    format!(
        "{id} {} -> exit {}, stdout {:?}, stderr {:?}",
        args.join(" "),
        run.code,
        run.stdout.trim(),
        run.stderr.trim()
    )
}

fn spec(path: &str) -> Value {
    let file = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../spec").join(path);
    let text = std::fs::read_to_string(&file).unwrap_or_else(|error| panic!("{}: {error}", file.display()));
    serde_json::from_str(&text).unwrap_or_else(|error| panic!("{}: {error}", file.display()))
}

fn texts(value: &Value) -> Vec<String> {
    value.as_array().unwrap().iter().map(|item| item.as_str().unwrap().to_string()).collect()
}

fn text_of(value: &Value) -> String {
    value.as_str().map_or_else(|| value.to_string(), str::to_string)
}

fn board_args(case: &Value) -> Vec<String> {
    let mut args = vec!["-r".to_string(), case["rowCount"].to_string(), "-c".to_string(), case["colCount"].to_string()];
    if let Some(lattice) = case["lattice"].as_str() {
        args.extend(["--lattice".to_string(), lattice.to_string()]);
    }
    for flag in ["torus", "twisted"] {
        if case[flag].as_bool() == Some(true) {
            args.push(format!("--{flag}"));
        }
    }
    args
}

fn board_key(case: &Value) -> String {
    format!(
        "{}|{}|{}|{}|{}",
        case["rowCount"],
        case["colCount"],
        case["lattice"].as_str().unwrap_or(""),
        case["torus"].as_bool() == Some(true),
        case["twisted"].as_bool() == Some(true)
    )
}

fn cases_of(id: &str) -> Vec<Value> {
    spec(&format!("cases/{id}.json"))["testCases"].as_array().unwrap().clone()
}

fn rust_algorithms() -> Vec<String> {
    spec("algorithms.json")["algorithms"]
        .as_object()
        .unwrap()
        .iter()
        .filter(|(_, entry)| entry.get("rs").is_some())
        .map(|(id, _)| id.clone())
        .collect()
}

fn cases_to_run(id: &str) -> Vec<Value> {
    let cases = cases_of(id);
    if std::env::var("FULL_CASES").is_ok_and(|value| value == "1") {
        return cases;
    }
    let limits = spec("limits.json");
    let first = limits["firstCases"].as_u64().unwrap() as usize;
    let Some(rule) = limits["algorithms"].get(id) else {
        return cases;
    };
    let held: HashSet<String> = rule["firstCasesPlusBoardsOf"].as_str().map(|twin| cases_of(twin).iter().map(board_key).collect()).unwrap_or_default();
    let torus_side = rule["maxTorusSide"].as_u64();
    let square_side = rule["maxSquareSide"].as_u64();
    cases
        .into_iter()
        .enumerate()
        .filter(|(index, case)| {
            let torus = case["torus"].as_bool() == Some(true);
            let (rows, cols) = (case["rowCount"].as_u64().unwrap(), case["colCount"].as_u64().unwrap());
            torus_side.is_none_or(|side| !torus || cols <= side)
                && square_side.is_none_or(|side| rows != cols || rows <= side)
                && (rule.get("firstCasesPlusBoardsOf").is_none() || *index < first || held.contains(&board_key(case)))
        })
        .map(|(_, case)| case)
        .collect()
}

fn failures_of<T: Sync>(items: &[T], check: impl Fn(&T) -> Option<String> + Sync) -> Vec<String> {
    let next = AtomicUsize::new(0);
    let failures = Mutex::new(Vec::new());
    let workers = std::thread::available_parallelism().map_or(4, |count| count.get()).min(items.len().max(1));
    std::thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                while let Some(item) = items.get(next.fetch_add(1, Ordering::Relaxed)) {
                    if let Some(message) = check(item) {
                        failures.lock().unwrap().push(message);
                    }
                }
            });
        }
    });
    let mut failures = failures.into_inner().unwrap();
    failures.sort();
    failures
}

fn assert_no_failures(group: &str, total: usize, failures: Vec<String>) {
    assert!(failures.is_empty(), "{group}: {} of {total} failed\n{}", failures.len(), failures.join("\n"));
}

#[test]
fn cases() {
    assert!(!rust_algorithms().is_empty());
    assert_eq!(rust_algorithms().iter().filter(|id| cases_to_run(id).is_empty()).count(), 0);
    let jobs: Vec<(String, Value)> = rust_algorithms().iter().flat_map(|id| cases_to_run(id).into_iter().map(move |case| (id.clone(), case))).collect();
    let failures = failures_of(&jobs, |(id, case)| {
        let args = board_args(case);
        let result = run(id, &args, LONG);
        let expected = text_of(&case["expectedResult"]);
        (result.code != 0 || result.stdout.trim() != expected).then(|| format!("{} (expected {expected})", describe(id, &args, &result)))
    });
    assert_no_failures("cases", jobs.len(), failures);
}

#[test]
fn rejections() {
    let entries = spec("cli.json")["rejections"].as_array().unwrap().clone();
    let failures = failures_of(&entries, |entry| {
        let (id, args, message) = (entry["algorithm"].as_str().unwrap(), texts(&entry["args"]), entry["message"].as_str().unwrap());
        let result = run(id, &args, SHORT);
        (result.code == 0 || !result.stderr.contains(message)).then(|| format!("{} (expected nonzero exit and stderr containing {message:?})", describe(id, &args, &result)))
    });
    assert_no_failures("rejections", entries.len(), failures);
}

#[test]
fn parity() {
    let entries = spec("cli.json")["parity"].as_array().unwrap().clone();
    let failures = failures_of(&entries, |entry| {
        let id = entry["algorithm"].as_str().unwrap();
        let args = board_args(entry);
        let result = run(id, &args, LONG);
        let expected = text_of(&entry["expectedResult"]);
        (result.code != 0 || result.stdout.trim() != expected).then(|| format!("{} (expected {expected})", describe(id, &args, &result)))
    });
    assert_no_failures("parity", entries.len(), failures);
}

#[test]
fn precision() {
    let entries = spec("cli.json")["precision"].as_array().unwrap().clone();
    let failures = failures_of(&entries, |entry| {
        let id = "domino-rectangle-number";
        let args = board_args(entry);
        let result = run(id, &args, SHORT);
        let (expected, warns) = (entry["expected"].as_str().unwrap(), entry["warns"].as_bool().unwrap());
        (result.code != 0 || result.stdout.trim() != expected || result.stderr.contains("not exact") != warns)
            .then(|| format!("{} (expected {expected}, warning {warns})", describe(id, &args, &result)))
    });
    assert_no_failures("precision", entries.len(), failures);
}

#[test]
fn memory() {
    let entries = spec("cli.json")["memory"].as_array().unwrap().clone();
    let failures = failures_of(&entries, |entry| {
        let (id, args, expected) = (entry["algorithm"].as_str().unwrap(), texts(&entry["args"]), text_of(&entry["expectedResult"]));
        let result = run(id, &args, LONG);
        (result.code != 0 || result.stdout.trim() != expected || result.peak_bytes > MEMORY_LIMIT_BYTES).then(|| {
            format!("{} (expected {expected}, peak {} MiB of at most {})", describe(id, &args, &result), result.peak_bytes >> 20, MEMORY_LIMIT_BYTES >> 20)
        })
    });
    assert_no_failures("memory", entries.len(), failures);
}

fn reported_ms(stderr: &str) -> Option<f64> {
    stderr.lines().find_map(|line| {
        let (whole, fraction) = line.strip_prefix("time ")?.strip_suffix(" ms")?.split_once('.')?;
        let digits = |text: &str| !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit());
        (digits(whole) && digits(fraction) && fraction.len() == 3).then(|| format!("{whole}.{fraction}").parse().unwrap())
    })
}

#[test]
fn time_span() {
    let entry = &spec("cli.json")["timeSpan"];
    let id = entry["algorithm"].as_str().unwrap();
    let mut args = texts(&entry["args"]);
    args.push("--time".to_string());
    let result = run(id, &args, SHORT);
    let whole = result.elapsed.as_secs_f64() * 1000.0;
    let reported = reported_ms(&result.stderr);
    assert!(
        result.code == 0 && reported.is_some_and(|ms| ms >= whole / 2.0 && ms <= whole),
        "time_span: {} (reported {reported:?} ms of a {whole:.3} ms process, expected between half and all of it)",
        describe(id, &args, &result)
    );
}

#[test]
fn time_flag() {
    let ids = rust_algorithms();
    let failures = failures_of(&ids, |id| {
        let plain: Vec<String> = ["-r", "2", "-c", "2"].map(String::from).to_vec();
        let timed = [plain.clone(), vec!["--time".to_string()]].concat();
        let (without, with) = (run(id, &plain, SHORT), run(id, &timed, SHORT));
        (with.code != 0 || without.code != 0 || with.stdout != without.stdout || reported_ms(&with.stderr).is_none())
            .then(|| format!("{} (plain stdout {:?})", describe(id, &timed, &with), without.stdout.trim()))
    });
    assert_no_failures("time_flag", ids.len(), failures);
}
