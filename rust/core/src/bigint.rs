use std::cmp::Ordering;
use std::fmt;
use std::ops::{Add, Div, Mul, Sub};

/// An integer of any size, for the Chinese remainder theorem and the exact determinants of the formula solver.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BigInt {
    negative: bool,
    limbs: Vec<u32>,
}

impl BigInt {
    pub fn zero() -> Self {
        Self { negative: false, limbs: Vec::new() }
    }

    pub fn from_u64(value: u64) -> Self {
        Self::normalized(false, vec![value as u32, (value >> 32) as u32])
    }

    pub fn from_i64(value: i64) -> Self {
        let magnitude = Self::from_u64(value.unsigned_abs());

        if value < 0 { magnitude.negated() } else { magnitude }
    }

    pub fn is_zero(&self) -> bool {
        self.limbs.is_empty()
    }

    fn normalized(negative: bool, mut limbs: Vec<u32>) -> Self {
        while limbs.last() == Some(&0) {
            limbs.pop();
        }

        Self { negative: negative && !limbs.is_empty(), limbs }
    }

    pub fn is_negative(&self) -> bool {
        self.negative
    }

    pub fn negated(&self) -> Self {
        Self::normalized(!self.negative, self.limbs.clone())
    }

    /// Compares the absolute values.
    pub fn cmp_magnitude(&self, other: &Self) -> Ordering {
        self.limbs
            .len()
            .cmp(&other.limbs.len())
            .then_with(|| self.limbs.iter().rev().cmp(other.limbs.iter().rev()))
    }

    /// Adds the absolute values.
    pub fn add_magnitude(&self, other: &Self) -> Self {
        let mut limbs = Vec::with_capacity(self.limbs.len().max(other.limbs.len()) + 1);
        let mut carry = 0u64;

        for i in 0..self.limbs.len().max(other.limbs.len()) {
            let sum = u64::from(*self.limbs.get(i).unwrap_or(&0)) + u64::from(*other.limbs.get(i).unwrap_or(&0)) + carry;
            limbs.push(sum as u32);
            carry = sum >> 32;
        }

        limbs.push(carry as u32);

        Self::normalized(false, limbs)
    }

    /// Subtracts the absolute value of other from the absolute value of self, which must not be smaller.
    pub fn sub_magnitude(&self, other: &Self) -> Self {
        assert!(self.cmp_magnitude(other) != Ordering::Less, "the subtrahend exceeds the minuend");

        let mut limbs = Vec::with_capacity(self.limbs.len());
        let mut borrow = 0i64;

        for (i, limb) in self.limbs.iter().enumerate() {
            let mut difference = i64::from(*limb) - i64::from(*other.limbs.get(i).unwrap_or(&0)) - borrow;
            borrow = i64::from(difference < 0);
            difference += borrow << 32;
            limbs.push(difference as u32);
        }

        Self::normalized(false, limbs)
    }

    /// Multiplies the absolute value by a factor.
    pub fn mul_small(&self, factor: u32) -> Self {
        let mut limbs = Vec::with_capacity(self.limbs.len() + 1);
        let mut carry = 0u64;

        for limb in &self.limbs {
            let product = u64::from(*limb) * u64::from(factor) + carry;
            limbs.push(product as u32);
            carry = product >> 32;
        }

        limbs.push(carry as u32);

        Self::normalized(self.negative, limbs)
    }

    fn div_rem_magnitude(&self, divisor: u32) -> (Vec<u32>, u32) {
        let mut quotient = vec![0; self.limbs.len()];
        let mut remainder = 0u64;

        for (i, limb) in self.limbs.iter().enumerate().rev() {
            let current = (remainder << 32) | u64::from(*limb);
            quotient[i] = (current / u64::from(divisor)) as u32;
            remainder = current % u64::from(divisor);
        }

        (quotient, remainder as u32)
    }

    /// Divides the absolute value by a larger divisor with Knuth's algorithm D, the long division of
    /// Hacker's Delight (divmnu), and returns the absolute values of the quotient and the remainder.
    fn div_rem_magnitude_big(&self, divisor: &Self) -> (Self, Self) {
        assert!(!divisor.is_zero(), "division by zero");

        if self.cmp_magnitude(divisor) == Ordering::Less {
            return (Self::zero(), Self::normalized(false, self.limbs.clone()));
        }

        if divisor.limbs.len() == 1 {
            let (quotient, remainder) = self.div_rem_magnitude(divisor.limbs[0]);
            return (Self::normalized(false, quotient), Self::from_u64(u64::from(remainder)));
        }

        let n = divisor.limbs.len();
        let m = self.limbs.len() - n;
        let shift = divisor.limbs[n - 1].leading_zeros();
        let v = shift_left(&divisor.limbs, shift, n);
        let mut u = shift_left(&self.limbs, shift, self.limbs.len() + 1);
        let mut quotient = vec![0u32; m + 1];
        let base = 1u64 << 32;

        for j in (0..=m).rev() {
            let top = (u64::from(u[j + n]) << 32) | u64::from(u[j + n - 1]);
            let mut qhat = top / u64::from(v[n - 1]);
            let mut rhat = top % u64::from(v[n - 1]);

            while qhat >= base || qhat * u64::from(v[n - 2]) > ((rhat << 32) | u64::from(u[j + n - 2])) {
                qhat -= 1;
                rhat += u64::from(v[n - 1]);

                if rhat >= base {
                    break;
                }
            }

            let mut borrow = 0i64;
            let mut carry = 0u64;

            for i in 0..n {
                let product = qhat * u64::from(v[i]) + carry;
                carry = product >> 32;
                let difference = i64::from(u[i + j]) - borrow - (product & 0xffff_ffff) as i64;
                u[i + j] = difference as u32;
                borrow = i64::from(difference < 0);
            }

            let difference = i64::from(u[j + n]) - borrow - carry as i64;
            u[j + n] = difference as u32;

            if difference < 0 {
                qhat -= 1;
                let mut carry = 0u64;

                for i in 0..n {
                    let sum = u64::from(u[i + j]) + u64::from(v[i]) + carry;
                    u[i + j] = sum as u32;
                    carry = sum >> 32;
                }

                u[j + n] = u[j + n].wrapping_add(carry as u32);
            }

            quotient[j] = qhat as u32;
        }

        let remainder = (0..n)
            .map(|i| if shift == 0 { u[i] } else { (u[i] >> shift) | (u[i + 1] << (32 - shift)) })
            .collect();

        (Self::normalized(false, quotient), Self::normalized(false, remainder))
    }

    /// The least non-negative residue modulo a positive modulus.
    pub fn rem_euclid_small(&self, modulus: u32) -> u32 {
        let (_, remainder) = self.div_rem_magnitude(modulus);

        if self.negative && remainder != 0 { modulus - remainder } else { remainder }
    }
}

fn shift_left(limbs: &[u32], shift: u32, length: usize) -> Vec<u32> {
    (0..length)
        .map(|i| {
            let low = limbs.get(i).copied().unwrap_or(0);
            let below = if i == 0 { 0 } else { limbs.get(i - 1).copied().unwrap_or(0) };

            if shift == 0 { low } else { (low << shift) | (below >> (32 - shift)) }
        })
        .collect()
}

impl BigInt {
    fn add_signed(&self, other: &Self, other_negative: bool) -> Self {
        if self.negative == other_negative {
            let sum = self.add_magnitude(other);
            return if self.negative { sum.negated() } else { sum };
        }

        if self.cmp_magnitude(other) == Ordering::Less {
            let difference = other.sub_magnitude(self);
            if other_negative { difference.negated() } else { difference }
        } else {
            let difference = self.sub_magnitude(other);
            if self.negative { difference.negated() } else { difference }
        }
    }
}

impl Add for &BigInt {
    type Output = BigInt;

    fn add(self, other: &BigInt) -> BigInt {
        self.add_signed(other, other.negative)
    }
}

impl Sub for &BigInt {
    type Output = BigInt;

    fn sub(self, other: &BigInt) -> BigInt {
        self.add_signed(other, !other.negative && !other.is_zero())
    }
}

impl Mul for &BigInt {
    type Output = BigInt;

    fn mul(self, other: &BigInt) -> BigInt {
        let mut limbs = vec![0u32; self.limbs.len() + other.limbs.len()];

        for (i, a) in self.limbs.iter().enumerate() {
            let mut carry = 0u64;

            for (j, b) in other.limbs.iter().enumerate() {
                let product = u64::from(*a) * u64::from(*b) + u64::from(limbs[i + j]) + carry;
                limbs[i + j] = product as u32;
                carry = product >> 32;
            }

            limbs[i + other.limbs.len()] = carry as u32;
        }

        BigInt::normalized(self.negative != other.negative, limbs)
    }
}

/// Divides and rounds toward zero, as the division of JavaScript's BigInt does.
impl Div for &BigInt {
    type Output = BigInt;

    fn div(self, other: &BigInt) -> BigInt {
        let (quotient, _) = self.div_rem_magnitude_big(other);

        if self.negative != other.negative { quotient.negated() } else { quotient }
    }
}

impl fmt::Display for BigInt {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        const CHUNK: u32 = 1_000_000_000;

        if self.limbs.is_empty() {
            return formatter.write_str("0");
        }

        let mut chunks = Vec::new();
        let mut rest = Self::normalized(false, self.limbs.clone());

        while !rest.limbs.is_empty() {
            let (quotient, remainder) = rest.div_rem_magnitude(CHUNK);
            chunks.push(remainder);
            rest = Self::normalized(false, quotient);
        }

        let mut text = String::new();

        if self.negative {
            text.push('-');
        }

        for (i, chunk) in chunks.iter().rev().enumerate() {
            if i == 0 {
                text.push_str(&chunk.to_string());
            } else {
                text.push_str(&format!("{chunk:09}"));
            }
        }

        formatter.write_str(&text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prints_in_decimal() {
        let power = (0..4).fold(BigInt::from_u64(1), |value, _| value.mul_small(1_000_000_000));

        assert_eq!(BigInt::zero().to_string(), "0");
        assert_eq!(BigInt::from_u64(u64::MAX).to_string(), "18446744073709551615");
        assert_eq!(power.to_string(), format!("1{}", "0".repeat(36)));
        assert_eq!(power.add_magnitude(&BigInt::from_u64(7)).negated().to_string(), format!("-1{}7", "0".repeat(35)));
    }

    #[test]
    fn subtracts_with_borrow() {
        let power = BigInt::from_u64(1 << 32).mul_small(1 << 31).mul_small(2);

        assert_eq!(power.sub_magnitude(&BigInt::from_u64(1)).to_string(), "18446744073709551615");
    }

    fn pseudo_random(seed: &mut u64, limbs: usize) -> BigInt {
        let limbs = (0..limbs)
            .map(|_| {
                *seed = seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1_442_695_040_888_963_407);
                (*seed >> 32) as u32
            })
            .collect();

        BigInt::normalized(false, limbs)
    }

    #[test]
    fn adds_and_subtracts_with_signs() {
        let a = BigInt::from_i64(-1_000_000_000_007);
        let b = BigInt::from_i64(999_999_999_999);

        assert_eq!((&a + &b).to_string(), "-8");
        assert_eq!((&b + &a).to_string(), "-8");
        assert_eq!((&a - &b).to_string(), "-2000000000006");
        assert_eq!((&b - &a).to_string(), "2000000000006");
        assert_eq!((&a - &a).to_string(), "0");
        assert!(!(&a - &a).is_negative());
    }

    #[test]
    fn multiplies_with_signs() {
        let a = BigInt::from_u64(u64::MAX);

        assert_eq!((&a * &a).to_string(), "340282366920938463426481119284349108225");
        assert_eq!((&a * &BigInt::from_i64(-3)).to_string(), "-55340232221128654845");
        assert_eq!((&BigInt::from_i64(-3) * &BigInt::zero()).to_string(), "0");
    }

    #[test]
    fn divides_toward_zero() {
        let seven = BigInt::from_i64(7);

        assert_eq!((&BigInt::from_i64(-20) / &seven).to_string(), "-2");
        assert_eq!((&BigInt::from_i64(20) / &seven.negated()).to_string(), "-2");
        assert_eq!((&BigInt::from_i64(-20) / &seven.negated()).to_string(), "2");
        assert_eq!((&BigInt::from_i64(6) / &seven).to_string(), "0");
    }

    #[test]
    fn adds_back_in_the_long_division() {
        let dividend = BigInt::normalized(false, vec![0, 0, 0x8000_0000, 0x7fff_ffff]);
        let divisor = BigInt::normalized(false, vec![1, 0, 0x8000_0000]);
        let (quotient, remainder) = dividend.div_rem_magnitude_big(&divisor);

        assert_eq!(quotient.limbs, vec![0xffff_fffe]);
        assert_eq!(remainder.limbs, vec![2, 0xffff_ffff, 0x7fff_ffff]);
    }

    #[test]
    fn long_division_inverts_multiplication() {
        let mut seed = 1;

        for round in 0..400 {
            let divisor = pseudo_random(&mut seed, 1 + round % 7);
            let dividend = pseudo_random(&mut seed, 1 + round % 13);

            if divisor.is_zero() {
                continue;
            }

            let (quotient, remainder) = dividend.div_rem_magnitude_big(&divisor);

            assert_eq!(&(&quotient * &divisor) + &remainder, dividend);
            assert_eq!(remainder.cmp_magnitude(&divisor), Ordering::Less);
            assert_eq!(&(&dividend * &divisor) / &divisor, dividend);
        }
    }

    #[test]
    fn reduces_negative_values() {
        assert_eq!(BigInt::from_u64(12_345).negated().rem_euclid_small(7), 3);
        assert_eq!(BigInt::from_u64(14).negated().rem_euclid_small(7), 0);
    }
}
