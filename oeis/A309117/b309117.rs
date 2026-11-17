use std::env;
use std::process;

use lattice_dimers_core::BigInt;

const WIDTH: usize = 4;
const USAGE: &str = "Usage: b309117 <first n> <last n>";

fn place(width: usize, filled: usize, cell: usize, covered: usize, next: &mut Vec<usize>) {
    if cell == width {
        next.push(covered);
        return;
    }

    let bit = 1 << cell;
    let below = bit << 1;

    if filled & bit != 0 {
        place(width, filled, cell + 1, covered, next);
        return;
    }

    if cell + 1 < width && filled & below == 0 {
        place(width, filled | bit | below, cell + 2, covered, next);
    }

    if covered & bit == 0 {
        place(width, filled | bit, cell + 1, covered | bit, next);
    }

    if cell + 1 < width && covered & below == 0 {
        place(width, filled | bit, cell + 1, covered | below, next);
    }
}

fn list_transitions(width: usize) -> Vec<Vec<usize>> {
    (0..1 << width)
        .map(|from| {
            let mut next = Vec::new();
            place(width, from, 0, 0, &mut next);
            next
        })
        .collect()
}

fn read_range() -> (usize, usize) {
    let args: Vec<String> = env::args().skip(1).collect();
    let numbers: Vec<usize> = args
        .iter()
        .filter(|arg| !arg.is_empty() && arg.bytes().all(|byte| byte.is_ascii_digit()))
        .filter_map(|arg| arg.parse().ok())
        .collect();

    match numbers[..] {
        [first, last] if args.len() == 2 && first <= last => (first, last),
        _ => {
            eprintln!("{USAGE}");
            process::exit(2);
        }
    }
}

fn main() {
    let (first, last) = read_range();
    let transitions = list_transitions(WIDTH);
    let mut counts: Vec<BigInt> = (0..1 << WIDTH).map(|state| BigInt::from_u64(u64::from(state == 0))).collect();

    for n in 0..=last {
        if n >= first {
            println!("{n} {}", counts[0]);
        }

        let mut following = vec![BigInt::zero(); 1 << WIDTH];

        for (state, count) in counts.iter().enumerate() {
            if !count.is_zero() {
                for &covered in &transitions[state] {
                    following[covered] += count;
                }
            }
        }

        counts = following;
    }
}
