use std::time::Instant;

/// Times a count, like startTimer of js/core/timer.js: stop writes "time <milliseconds> ms" to standard error
/// when the arguments include --time.
pub struct Timer {
    start: Instant,
    enabled: bool,
}

impl Timer {
    pub fn start(args: &[String]) -> Self {
        Self { start: Instant::now(), enabled: args.iter().any(|arg| arg == "--time") }
    }

    pub fn stop(&self) {
        if self.enabled {
            eprintln!("time {:.3} ms", self.start.elapsed().as_secs_f64() * 1000.0);
        }
    }
}
