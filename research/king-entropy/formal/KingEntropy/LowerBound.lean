import KingEntropy.CollatzWielandt
import KingEntropy.Certificate
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity

open Matrix

namespace KingEntropy

abbrev State := Fin (2 ^ certW)

def T : Matrix State State ℕ := transfer certW

def s0 : State := ⟨0, by decide⟩

def e0 : State → ℕ := Pi.single s0 1

theorem pow_mulVec_iterate {n : Type*} [Fintype n] [DecidableEq n] (A : Matrix n n ℕ) (k : ℕ) :
    ∀ x : n → ℕ, (A ^ k) *ᵥ x = (fun y => A *ᵥ y)^[k] x := by
  induction k with
  | zero => intro x; simp
  | succ k ih =>
    intro x
    rw [pow_succ, ← mulVec_mulVec, ih, Function.iterate_succ_apply]

theorem certV_eq_iterate_apply : ∀ i, (fun y : State → ℕ => T *ᵥ y)^[certN] e0 i = certV i := by
  decide +kernel

theorem certV_eq_iterate : (fun y => T *ᵥ y)^[certN] e0 = certV :=
  funext certV_eq_iterate_apply

theorem cert_check : ∀ i, certP * certV i ≤ certQ * (T *ᵥ certV) i := by
  decide +kernel

theorem certV_pos : 0 < certV s0 := by
  decide +kernel

theorem certV_eq_pow : certV = (T ^ certN) *ᵥ e0 := by
  rw [pow_mulVec_iterate, certV_eq_iterate]

theorem count_eq (j : ℕ) : (T ^ (j + certN)) s0 s0 = ((T ^ j) *ᵥ certV) s0 := by
  rw [certV_eq_pow, mulVec_mulVec, ← pow_add]
  simp [e0, mulVec, dotProduct, Pi.single_apply]

noncomputable def TR : Matrix State State ℝ := T.map (Nat.cast : ℕ → ℝ)

def vR : State → ℝ := fun i => (certV i : ℝ)

theorem TR_mulVec (x : State → ℕ) : TR *ᵥ (fun i => (x i : ℝ)) = fun i => ((T *ᵥ x) i : ℝ) := by
  funext i
  simp [TR, mulVec, dotProduct]

theorem TR_pow (k : ℕ) : TR ^ k = (T ^ k).map (Nat.cast : ℕ → ℝ) := by
  simpa [TR] using (map_pow ((Nat.castRingHom ℝ).mapMatrix (m := State)) T k).symm

theorem TR_nonneg : ∀ i j, 0 ≤ TR i j := fun i j => by simp [TR]

noncomputable def c : ℝ := (certP : ℝ) / certQ

theorem c_nonneg : 0 ≤ c := div_nonneg (Nat.cast_nonneg _) (Nat.cast_nonneg _)

theorem cw_hyp : c • vR ≤ TR *ᵥ vR := by
  intro i
  have h := cert_check i
  have hq : (0 : ℝ) < certQ := by unfold certQ; norm_num
  have hR : (certP : ℝ) * certV i ≤ certQ * ((T *ᵥ certV) i : ℝ) := by exact_mod_cast h
  show c * vR i ≤ (TR *ᵥ vR) i
  rw [show vR = fun i => (certV i : ℝ) from rfl, TR_mulVec]
  unfold c
  rw [div_mul_eq_mul_div, div_le_iff₀ hq]
  linarith

theorem transfer_growth (j : ℕ) :
    c ^ j * certV s0 ≤ ((T ^ (j + certN)) s0 s0 : ℝ) := by
  have h := cw_lower TR_nonneg c_nonneg cw_hyp (u := vR) (C := 1) (by simp) j s0
  rw [count_eq]
  have hpow : (TR ^ j) *ᵥ vR = fun i => (((T ^ j) *ᵥ certV) i : ℝ) := by
    funext i
    rw [TR_pow]
    simp [vR, mulVec, dotProduct]
  simpa [hpow, vR] using h

end KingEntropy
