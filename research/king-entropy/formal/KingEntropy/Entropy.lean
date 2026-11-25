import KingEntropy.LowerBound
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Order.Filter.AtTopBot.Archimedean

open Real

namespace KingEntropy

theorem one_lt_c : 1 < c := by
  unfold c certP certQ
  norm_num

theorem log_c_pos : 0 < log c := log_pos one_lt_c

theorem certV_one_le : (1 : ℝ) ≤ certV s0 := by
  exact_mod_cast certV_pos

theorem growth_log (Z : ℕ → ℕ → ℕ) (htr : ∀ K, Z K certW = (T ^ K) s0 s0) (K : ℕ) (hK : certN ≤ K) :
    ((K : ℝ) - certN) * log c ≤ log (Z K certW) := by
  have hg := transfer_growth (K - certN)
  rw [Nat.sub_add_cancel hK, ← htr] at hg
  have hpow : 0 < c ^ (K - certN) := pow_pos (lt_trans zero_lt_one one_lt_c) _
  have h1 : c ^ (K - certN) ≤ (Z K certW : ℝ) :=
    le_trans (le_mul_of_one_le_right hpow.le certV_one_le) hg
  have h2 := log_le_log hpow h1
  rw [log_pow, Nat.cast_sub hK] at h2
  exact h2

theorem entropy_lower (Z : ℕ → ℕ → ℕ)
    (htr : ∀ K, Z K certW = (T ^ K) s0 s0)
    (hsup : ∀ K k, Z K certW ^ k ≤ Z K (k * certW))
    (ε : ℝ) (hε : 0 < ε) :
    ∃ K0 : ℕ, ∀ K ≥ K0, ∀ k ≥ 1,
      log c / certW - ε ≤ log (Z K (k * certW)) / (K * (k * certW)) := by
  have hw : (0 : ℝ) < certW := by norm_num [certW]
  obtain ⟨M, hM⟩ := exists_nat_gt ((certN : ℝ) * log c / (certW * ε))
  refine ⟨max M (certN + 1), fun K hK k hk => ?_⟩
  have hKN : certN ≤ K := le_trans (Nat.le_succ _) (le_trans (le_max_right _ _) hK)
  have hKM : (M : ℝ) ≤ K := by exact_mod_cast le_trans (le_max_left _ _) hK
  have hKpos : (0 : ℝ) < K := by
    have : 0 < K := lt_of_lt_of_le (Nat.succ_pos _) (le_trans (le_max_right _ _) hK)
    exact_mod_cast this
  have hkpos : (0 : ℝ) < k := by exact_mod_cast hk
  have hgrow := growth_log Z htr K hKN
  have hZw : 0 < (Z K certW : ℝ) := by
    have hg := transfer_growth (K - certN)
    rw [Nat.sub_add_cancel hKN, ← htr] at hg
    exact lt_of_lt_of_le (mul_pos (pow_pos (lt_trans zero_lt_one one_lt_c) _)
      (lt_of_lt_of_le zero_lt_one certV_one_le)) hg
  have hsupR : (Z K certW : ℝ) ^ k ≤ Z K (k * certW) := by exact_mod_cast hsup K k
  have hlog : (k : ℝ) * log (Z K certW) ≤ log (Z K (k * certW)) := by
    have := log_le_log (pow_pos hZw k) hsupR
    rwa [log_pow] at this
  have hbig : (certN : ℝ) * log c < K * (certW * ε) := by
    have h := lt_of_lt_of_le hM hKM
    rwa [div_lt_iff₀ (mul_pos hw hε)] at h
  have hden : (0 : ℝ) < K * (k * certW) := by positivity
  rw [le_div_iff₀ hden]
  have key : (log c / certW - ε) * (K * (k * certW)) = k * (K * log c - K * (certW * ε)) := by
    field_simp
  rw [key]
  have hc := log_c_pos
  have step : (K : ℝ) * log c - K * (certW * ε) ≤ ((K : ℝ) - certN) * log c := by linarith
  calc (k : ℝ) * (K * log c - K * (certW * ε)) ≤ k * (((K : ℝ) - certN) * log c) :=
        mul_le_mul_of_nonneg_left step hkpos.le
    _ ≤ k * log (Z K certW) := mul_le_mul_of_nonneg_left hgrow hkpos.le
    _ ≤ log (Z K (k * certW)) := hlog

set_option maxRecDepth 100000 in
theorem bound_lt_log_c_div_w : (12 : ℝ) / 25 < log c / certW := by
  have hw : (0 : ℝ) < certW := by norm_num [certW]
  have hc0 : 0 < c := lt_trans zero_lt_one one_lt_c
  rw [lt_div_iff₀ hw, lt_log_iff_exp_lt hc0]
  have h : exp (12 / 25 * certW) ^ 25 < c ^ 25 := by
    rw [← exp_nat_mul]
    have h72 : ((25 : ℕ) : ℝ) * (12 / 25 * certW) = ((72 : ℕ) : ℝ) * 1 := by norm_num [certW]
    rw [h72, exp_nat_mul]
    calc exp 1 ^ 72 < (2.7182818286 : ℝ) ^ 72 :=
          pow_lt_pow_left₀ exp_one_lt_d9 (exp_pos 1).le (by norm_num)
      _ < c ^ 25 := by unfold c certP certQ; norm_num
  exact lt_of_pow_lt_pow_left₀ 25 hc0.le h

end KingEntropy
