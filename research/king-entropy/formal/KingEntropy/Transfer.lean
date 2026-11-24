import Mathlib.Data.Matrix.Basic
import Mathlib.Data.Nat.Bitwise

namespace KingEntropy

def ways (w target : ℕ) : ℕ → ℕ → ℕ → ℕ
  | 0, _, nxt => if nxt = target then 1 else 0
  | k + 1, cur, nxt =>
    let j := w - (k + 1)
    if cur.testBit j then ways w target k cur nxt
    else
      let horizontal :=
        if j + 1 < w ∧ !cur.testBit (j + 1) then ways w target k (cur ||| 2 ^ j ||| 2 ^ (j + 1)) nxt
        else 0
      let down (d : ℕ) :=
        if d < w ∧ !nxt.testBit d ∧ target.testBit d then ways w target k (cur ||| 2 ^ j) (nxt ||| 2 ^ d)
        else 0
      horizontal + (if 1 ≤ j then down (j - 1) else 0) + down j + down (j + 1)

def transfer (w : ℕ) : Matrix (Fin (2 ^ w)) (Fin (2 ^ w)) ℕ :=
  fun s t => ways w t w s 0

end KingEntropy
