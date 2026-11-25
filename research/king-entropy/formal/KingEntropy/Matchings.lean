import KingEntropy.Transfer

namespace KingEntropy

def pmAux (K w : ℕ) : ℕ → ℕ → ℕ
  | 0, _ => 1
  | k + 1, cov =>
    let p := K * w - (k + 1)
    let r := p / w
    let j := p % w
    if cov.testBit p then pmAux K w k cov
    else
      let pair (b : ℕ) (ok : Bool) :=
        if ok && !cov.testBit b then pmAux K w k (cov ||| 2 ^ p ||| 2 ^ b) else 0
      pair (p + 1) (decide (j + 1 < w))
        + pair (p + w - 1) (decide (r + 1 < K) && decide (1 ≤ j))
        + pair (p + w) (decide (r + 1 < K))
        + pair (p + w + 1) (decide (r + 1 < K) && decide (j + 1 < w))

def pmCount (K w : ℕ) : ℕ := pmAux K w (K * w) 0

theorem pmCount_A239273 : pmCount 0 0 = 1 ∧ pmCount 2 2 = 3 ∧ pmCount 4 4 = 280 := by decide +kernel

theorem transfer_eq_pmCount_w2 : ∀ K : Fin 9,
    (transfer 2 ^ (K : ℕ)) ⟨0, by decide⟩ ⟨0, by decide⟩ = pmCount K 2 := by decide +kernel

theorem transfer_eq_pmCount_w3 : ∀ K : Fin 7,
    (transfer 3 ^ (K : ℕ)) ⟨0, by decide⟩ ⟨0, by decide⟩ = pmCount K 3 := by decide +kernel

theorem transfer_eq_pmCount_w4 : ∀ K : Fin 6,
    (transfer 4 ^ (K : ℕ)) ⟨0, by decide⟩ ⟨0, by decide⟩ = pmCount K 4 := by decide +kernel

theorem superadditive_small : ∀ K : Fin 5, ∀ k : Fin 3,
    pmCount K 2 ^ (k : ℕ) ≤ pmCount K (k * 2) := by decide +kernel

theorem transfer_eq_pmCount_w6 : ∀ K : Fin 4,
    (transfer 6 ^ (K : ℕ)) ⟨0, by decide⟩ ⟨0, by decide⟩ = pmCount K 6 := by decide +kernel

theorem superadditive_w6 : ∀ K : Fin 3, ∀ k : Fin 3,
    pmCount K 6 ^ (k : ℕ) ≤ pmCount K (k * 6) := by decide +kernel

end KingEntropy
