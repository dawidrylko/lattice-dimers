import Mathlib.Data.Matrix.Mul
import Mathlib.Basic.Real.Basic
import Mathlib.Algebra.Order.Module.Defs

open Matrix

namespace KingEntropy

variable {n : Type*} [Fintype n]

theorem mulVec_mono {A : Matrix n n ℝ} (hA : ∀ i j, 0 ≤ A i j) {x y : n → ℝ} (hxy : x ≤ y) :
    A *ᵥ x ≤ A *ᵥ y := by
  intro i
  simp only [mulVec, dotProduct]
  exact Finset.sum_le_sum fun j _ => mul_le_mul_of_nonneg_left (hxy j) (hA i j)

theorem pow_entries_nonneg [DecidableEq n] {A : Matrix n n ℝ} (hA : ∀ i j, 0 ≤ A i j) (k : ℕ) :
    ∀ i j, 0 ≤ (A ^ k) i j := by
  induction k with
  | zero =>
    intro i j
    by_cases h : i = j <;> simp [h]
  | succ k ih =>
    intro i j
    rw [pow_succ, Matrix.mul_apply]
    exact Finset.sum_nonneg fun l _ => mul_nonneg (ih i l) (hA l j)

theorem cw_iterate [DecidableEq n] {A : Matrix n n ℝ} (hA : ∀ i j, 0 ≤ A i j) {v : n → ℝ} {c : ℝ} (hc : 0 ≤ c)
    (hv : c • v ≤ A *ᵥ v) (j : ℕ) : c ^ j • v ≤ (A ^ j) *ᵥ v := by
  induction j with
  | zero => simp
  | succ j ih =>
    calc c ^ (j + 1) • v = c ^ j • (c • v) := by rw [pow_succ, mul_smul]
      _ ≤ c ^ j • (A *ᵥ v) := smul_le_smul_of_nonneg_left hv (pow_nonneg hc j)
      _ = A *ᵥ (c ^ j • v) := by rw [mulVec_smul]
      _ ≤ A *ᵥ ((A ^ j) *ᵥ v) := mulVec_mono hA ih
      _ = (A ^ (j + 1)) *ᵥ v := by rw [mulVec_mulVec, pow_succ']

theorem cw_lower [DecidableEq n] {A : Matrix n n ℝ} (hA : ∀ i j, 0 ≤ A i j) {v u : n → ℝ} {c C : ℝ}
    (hc : 0 ≤ c) (hv : c • v ≤ A *ᵥ v) (hvu : v ≤ C • u) (j : ℕ) (i : n) :
    c ^ j * v i ≤ C * ((A ^ j) *ᵥ u) i := by
  have h1 : c ^ j • v ≤ (A ^ j) *ᵥ v := cw_iterate hA hc hv j
  have h2 : (A ^ j) *ᵥ v ≤ (A ^ j) *ᵥ (C • u) := mulVec_mono (pow_entries_nonneg hA j) hvu
  have h3 := (h1.trans h2) i
  rw [mulVec_smul] at h3
  simpa using h3

end KingEntropy
