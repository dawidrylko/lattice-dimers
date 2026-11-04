use std::cmp::Ordering;
use std::fmt;

/// An integer of any size, with the few operations the Chinese remainder theorem needs.
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

    /// The least non-negative residue modulo a positive modulus.
    pub fn rem_euclid_small(&self, modulus: u32) -> u32 {
        let (_, remainder) = self.div_rem_magnitude(modulus);

        if self.negative && remainder != 0 { modulus - remainder } else { remainder }
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

    #[test]
    fn reduces_negative_values() {
        assert_eq!(BigInt::from_u64(12_345).negated().rem_euclid_small(7), 3);
        assert_eq!(BigInt::from_u64(14).negated().rem_euclid_small(7), 0);
    }
}
