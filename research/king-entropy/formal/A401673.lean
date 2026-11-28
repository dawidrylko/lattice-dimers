import Mathlib.Data.Fintype.Pi
import Mathlib.Data.Fintype.Prod
import Mathlib.Data.Fintype.Card
import Mathlib.Data.Finset.Card
import Mathlib.Tactic.Ring
import Mathlib.Tactic.SplitIfs

namespace A401673

open Finset

abbrev Cell (R C : ℕ) := Fin R × Fin C

section Defs

variable {R C : ℕ}

def Near (a b : ℕ) : Prop := a + 1 = b ∨ b + 1 = a

instance (a b : ℕ) : Decidable (Near a b) := by unfold Near; infer_instance

def Horiz (x y : Cell R C) : Prop := x.1.val = y.1.val ∧ Near x.2.val y.2.val

def Vert (x y : Cell R C) : Prop := x.2.val = y.2.val ∧ Near x.1.val y.1.val

def Diag (x y : Cell R C) : Prop := Near x.1.val y.1.val ∧ Near x.2.val y.2.val

def KingAdj (x y : Cell R C) : Prop := Horiz x y ∨ Vert x y ∨ Diag x y

instance (x y : Cell R C) : Decidable (Horiz x y) := by unfold Horiz; infer_instance
instance (x y : Cell R C) : Decidable (Vert x y) := by unfold Vert; infer_instance
instance (x y : Cell R C) : Decidable (Diag x y) := by unfold Diag; infer_instance
instance (x y : Cell R C) : Decidable (KingAdj x y) := by unfold KingAdj; infer_instance

def IsMatching (f : Cell R C → Cell R C) : Prop :=
  (∀ x, f (f x) = x) ∧ ∀ x, KingAdj x (f x)

instance (f : Cell R C → Cell R C) : Decidable (IsMatching f) := by
  unfold IsMatching; infer_instance

def matchings (R C : ℕ) : Finset (Cell R C → Cell R C) := univ.filter IsMatching

def hCount (f : Cell R C → Cell R C) : ℕ := (univ.filter fun x => Horiz x (f x)).card

def vCount (f : Cell R C → Cell R C) : ℕ := (univ.filter fun x => Vert x (f x)).card

def dCount (f : Cell R C → Cell R C) : ℕ := (univ.filter fun x => Diag x (f x)).card

def T (n k : ℕ) : ℕ :=
  ((matchings (2 * n) (2 * n)).filter fun f => dCount f = 4 * k).card

end Defs

lemma card_invol {α : Type*} (f : α → α) (hf : ∀ x, f (f x) = x) {s t : Finset α}
    (hs : ∀ x ∈ s, f x ∈ t) (ht : ∀ x ∈ t, f x ∈ s) : s.card = t.card :=
  card_nbij' f f hs ht (fun x _ => hf x) (fun x _ => hf x)

lemma card_filter_and_comm {α : Type*} [Fintype α] (p q : α → Prop) [DecidablePred p]
    [DecidablePred q] :
    (univ.filter fun x => p x ∧ q x).card = (univ.filter fun x => q x ∧ p x).card := by
  congr 1; ext x; simp [and_comm]

section General

variable {R C : ℕ}

lemma side_add_diag {f : Cell R C → Cell R C} (hf : IsMatching f) :
    hCount f + vCount f + dCount f = R * C := by
  have e1 := card_filter_add_card_filter_not (s := (univ : Finset (Cell R C)))
    (fun x => Horiz x (f x))
  have e2 := card_filter_add_card_filter_not
    (s := (univ : Finset (Cell R C)).filter fun x => ¬ Horiz x (f x)) (fun x => Vert x (f x))
  rw [filter_filter, filter_filter] at e2
  have h1 : (univ.filter fun x : Cell R C => ¬Horiz x (f x) ∧ Vert x (f x)) =
      univ.filter fun x => Vert x (f x) := by
    ext x
    rw [mem_filter, mem_filter]
    constructor
    · exact fun h => ⟨mem_univ _, h.2.2⟩
    · intro h
      refine ⟨mem_univ _, ?_, h.2⟩
      have := h.2
      unfold Horiz Vert Near at *
      omega
  have h2 : (univ.filter fun x : Cell R C => ¬Horiz x (f x) ∧ ¬Vert x (f x)) =
      univ.filter fun x => Diag x (f x) := by
    ext x
    have hx := hf.2 x
    simp only [KingAdj] at hx
    simp only [mem_filter, mem_univ, true_and]
    constructor
    · rintro ⟨h, h'⟩
      rcases hx with hx | hx | hx
      · exact absurd hx h
      · exact absurd hx h'
      · exact hx
    · intro h
      simp only [Diag, Horiz, Vert, Near] at h ⊢
      omega
  rw [h1, h2] at e2
  unfold hCount vCount dCount
  rw [card_univ, Fintype.card_prod, Fintype.card_fin, Fintype.card_fin] at e1
  omega

lemma horiz_symm (x y : Cell R C) : Horiz x y → Horiz y x := by
  unfold Horiz Near; omega

lemma vert_symm (x y : Cell R C) : Vert x y → Vert y x := by
  unfold Vert Near; omega

lemma rows_near {f : Cell R C → Cell R C} (hf : IsMatching f) (x : Cell R C)
    (hx : ¬ Horiz x (f x)) :
    Near x.1.val (f x).1.val ∧ ((f x).2.val = x.2.val ∨ Near x.2.val (f x).2.val) := by
  rcases hf.2 x with h | h | h
  · exact absurd h hx
  · exact ⟨h.2, Or.inl h.1.symm⟩
  · exact ⟨h.1, Or.inr h.2⟩

def prow (r : ℕ) : ℕ := if r % 2 = 0 then r + 1 else r - 1

lemma prow_prow (r : ℕ) : prow (prow r) = r := by
  unfold prow; split_ifs <;> omega

lemma prow_lt {m r : ℕ} (h : r < 2 * m) : prow r < 2 * m := by
  unfold prow; split_ifs <;> omega

lemma prow_div (r : ℕ) : prow r / 2 = r / 2 := by
  unfold prow; split_ifs <;> omega

lemma prow_near (r : ℕ) : Near r (prow r) := by
  unfold prow Near; split_ifs <;> omega

lemma row_partner {f : Cell R C → Cell R C} (hf : IsMatching f) (h0 : ∀ x, ¬ Horiz x (f x)) :
    ∀ x, (f x).1.val = prow x.1.val := by
  suffices H : ∀ r, ∀ x : Cell R C, x.1.val = r → (f x).1.val = prow r by
    exact fun x => H _ x rfl
  intro r
  induction r using Nat.strong_induction_on with
  | _ r ih =>
    intro x hx
    have hn := (rows_near hf x (h0 x)).1
    unfold Near at hn
    by_cases hr : r % 2 = 0
    · rcases hn with h | h
      · unfold prow; rw [ite_eq_left hr]; omega
      · have h1 := ih (r - 1) (by omega) (f x) (by omega)
        rw [hf.1 x] at h1
        unfold prow at h1
        split_ifs at h1 <;> omega
    · have hr1 : r - 1 < R := by have := x.1.isLt; omega
      have hrow : ∀ j : Fin C, (f (⟨r - 1, hr1⟩, j)).1.val = r := by
        intro j
        have := ih (r - 1) (by omega) (⟨r - 1, hr1⟩, j) rfl
        rw [this]; unfold prow; split_ifs <;> omega
      let g : Fin C → Fin C := fun j => (f (⟨r - 1, hr1⟩, j)).2
      have ginj : Function.Injective g := by
        intro j j' hj
        have e : f (⟨r - 1, hr1⟩, j) = f (⟨r - 1, hr1⟩, j') :=
          Prod.ext (Fin.ext (by rw [hrow, hrow])) hj
        have e2 := congrArg f e
        rw [hf.1, hf.1] at e2
        exact (Prod.ext_iff.mp e2).2
      obtain ⟨j, hj⟩ := (Finite.injective_iff_surjective.mp ginj) x.2
      have e : f (⟨r - 1, hr1⟩, j) = x := Prod.ext (Fin.ext (by rw [hrow]; omega)) hj
      have e2 := congrArg f e
      rw [hf.1] at e2
      rw [← e2]
      unfold prow; rw [ite_eq_right hr]

lemma card_split {f : Cell R C → Cell R C} (hinv : ∀ x, f (f x) = x)
    (hflip : ∀ x, (f x).1.val % 2 ≠ x.1.val % 2) (P : Cell R C → Prop) [DecidablePred P]
    (hP : ∀ x, P x → P (f x)) :
    (univ.filter P).card = 2 * (univ.filter fun x => x.1.val % 2 = 0 ∧ P x).card := by
  have e := card_filter_add_card_filter_not (s := univ.filter P)
    (fun x : Cell R C => x.1.val % 2 = 0)
  rw [filter_filter, filter_filter] at e
  have e2 : (univ.filter fun x : Cell R C => P x ∧ ¬ x.1.val % 2 = 0).card =
      (univ.filter fun x : Cell R C => P x ∧ x.1.val % 2 = 0).card := by
    apply card_invol f hinv
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      exact ⟨hP x hx.1, by have := hflip x; omega⟩
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      exact ⟨hP x hx.1, by have := hflip x; omega⟩
  rw [card_filter_and_comm (fun x : Cell R C => x.1.val % 2 = 0)]
  omega

section Band

variable (C : ℕ) (σ : ℕ → ℕ)

structure IsBand : Prop where
  lt : ∀ i < C, σ i < C
  near : ∀ i < C, σ i ≤ i + 1 ∧ i ≤ σ i + 1
  inj : ∀ i < C, ∀ j < C, σ i = σ j → i = j
  surj : ∀ v < C, ∃ i < C, σ i = v

def Cut (j : ℕ) : Prop := ∀ i < C, (i < j ↔ σ i < j)

def cnt (j : ℕ) : ℕ := ((range j).filter fun i => σ i = i).card

def Inv (j : ℕ) : Prop :=
  cnt σ j % 2 = j % 2 ∧ ∀ i < j, (σ i = i → cnt σ i % 2 = i % 2) ∧
    (σ i ≠ i → (σ i = i + 1 ↔ (i + cnt σ i) % 2 = 0))

variable {C σ}

lemma cnt_succ (j : ℕ) : cnt σ (j + 1) = cnt σ j + if σ j = j then 1 else 0 := by
  unfold cnt
  rw [range_add_one, filter_insert]
  split_ifs with h
  · rw [card_insert_eq_ite, ite_eq_right (by simp)]
  · rfl

lemma cnt_spec (g : ℕ → ℕ) (h0 : g 0 = 0)
    (hs : ∀ j < C, g (j + 1) = g j + if σ j = j then 1 else 0) :
    ∀ j ≤ C, cnt σ j = g j := by
  intro j
  induction j with
  | zero => intro _; simp [cnt, h0]
  | succ j ih => intro hj; rw [cnt_succ, ih (by omega), hs j (by omega)]

lemma step (hb : IsBand C σ) {j : ℕ} (hc : Cut C σ j) (hi : Inv σ j) (hj : j < C) :
    ∃ j', j < j' ∧ j' ≤ C ∧ Cut C σ j' ∧ Inv σ j' := by
  have hσj := hb.near j hj
  have hge : j ≤ σ j := by
    by_contra h
    have := (hc j hj).mpr (by omega)
    omega
  obtain ⟨hp, hall⟩ := hi
  by_cases hfix : σ j = j
  · refine ⟨j + 1, by omega, by omega, ?_, ?_⟩
    · intro i hi'
      rcases lt_trichotomy i j with h | h | h
      · have := (hc i hi').mp h
        constructor <;> intro <;> omega
      · rw [h]; constructor <;> intro <;> omega
      · have h1 : ¬ σ i < j := fun h' => by have := (hc i hi').mpr h'; omega
        have h2 : σ i ≠ j := fun h' => by
          have := hb.inj i hi' j hj (by rw [h', hfix]); omega
        constructor <;> intro <;> omega
    · refine ⟨by rw [cnt_succ, ite_eq_left hfix]; omega, ?_⟩
      intro i hi'
      rcases Nat.lt_or_ge i j with h | h
      · exact hall i h
      · have e : i = j := by omega
        rw [e]
        exact ⟨fun _ => hp, fun h' => absurd hfix h'⟩
  · have hσ : σ j = j + 1 := by omega
    have hj1 : j + 1 < C := by have := hb.lt j hj; omega
    obtain ⟨i0, hi0, hσi0⟩ := hb.surj j hj
    have hi0ge : j ≤ i0 := by
      by_contra h
      have := (hc i0 hi0).mp (by omega)
      omega
    have hi0ne : i0 ≠ j := by intro h; rw [h] at hσi0; omega
    have hnear := hb.near i0 hi0
    have hi0eq : i0 = j + 1 := by omega
    rw [hi0eq] at hσi0
    have c1 : cnt σ (j + 1) = cnt σ j := by rw [cnt_succ, ite_eq_right hfix]; simp
    have c2 : cnt σ (j + 1 + 1) = cnt σ j := by
      rw [cnt_succ, ite_eq_right (by omega), c1]; simp
    refine ⟨j + 2, by omega, by omega, ?_, ?_⟩
    · intro i hi'
      by_cases h : i < j
      · have := (hc i hi').mp h
        constructor <;> intro <;> omega
      · by_cases h' : i = j
        · rw [h']; constructor <;> intro <;> omega
        · by_cases h'' : i = j + 1
          · rw [h'']; constructor <;> intro <;> omega
          · have h1 : ¬ σ i < j := fun h3 => h ((hc i hi').mpr h3)
            have h2 : σ i ≠ j := fun h3 => h'' (hb.inj i hi' (j + 1) hj1 (by rw [h3, hσi0]))
            have h3 : σ i ≠ j + 1 := fun h4 => h' (hb.inj i hi' j hj (by rw [h4, hσ]))
            constructor <;> intro <;> omega
    · refine ⟨by rw [c2]; omega, ?_⟩
      intro i hi'
      by_cases h : i < j
      · exact hall i h
      · by_cases h' : i = j
        · rw [h']
          exact ⟨fun h4 => absurd h4 hfix, fun _ => ⟨fun _ => by omega, fun _ => hσ⟩⟩
        · have e : i = j + 1 := by omega
          rw [e, c1]
          exact ⟨fun h4 => by omega, fun _ => ⟨fun h4 => by omega, fun h4 => by omega⟩⟩

lemma reach (hb : IsBand C σ) :
    ∀ d j, C - j = d → j ≤ C → Cut C σ j → Inv σ j → Inv σ C := by
  intro d
  induction d using Nat.strong_induction_on with
  | _ d ih =>
    intro j hd hjC hc hi
    rcases Nat.lt_or_ge j C with h | h
    · obtain ⟨j', hjj', hj'C, hc', hi'⟩ := step hb hc hi h
      exact ih (C - j') (by omega) j' rfl hj'C hc' hi'
    · have e : j = C := by omega
      rw [← e]; exact hi

lemma inv_C (hb : IsBand C σ) : Inv σ C :=
  reach hb _ 0 rfl (Nat.zero_le _) (fun i _ => by constructor <;> intro <;> omega)
    ⟨by simp [cnt], fun i hi => absurd hi (Nat.not_lt_zero _)⟩

def pcol (j : ℕ) : ℕ := if j % 2 = 0 then j + 1 else j - 1

def qcol (a b j : ℕ) : ℕ :=
  if j < a ∨ b < j then pcol j
  else if j = a ∨ j = b then j
  else if j % 2 = 1 then j + 1 else j - 1

lemma nonfixed (hb : IsBand C σ) {i : ℕ} (hi : i < C) (hne : σ i ≠ i) :
    (σ i = i + 1 ∧ (i + cnt σ i) % 2 = 0) ∨ (σ i + 1 = i ∧ (i + cnt σ i) % 2 = 1) := by
  have h1 := ((inv_C hb).2 i hi).2 hne
  have h2 := hb.near i hi
  by_cases hs : σ i = i + 1
  · exact Or.inl ⟨hs, h1.mp hs⟩
  · right
    have h3 : ¬ (i + cnt σ i) % 2 = 0 := fun h => hs (h1.mpr h)
    exact ⟨by omega, by omega⟩

lemma band_zero (hb : IsBand C σ) (hfix : ∀ i < C, σ i ≠ i) : ∀ i < C, σ i = pcol i := by
  have hc := cnt_spec (σ := σ) (C := C) (fun _ => 0) rfl
    (fun j hj => by rw [ite_eq_right (hfix j hj)])
  intro i hi
  have h := nonfixed hb hi (hfix i hi)
  rw [hc i hi.le] at h
  unfold pcol; split_ifs <;> omega

lemma band_one (hb : IsBand C σ) (hC : C % 2 = 0) {a : ℕ} (ha : a < C)
    (hfix : ∀ i < C, (σ i = i ↔ i = a)) : False := by
  have hc := cnt_spec (σ := σ) (C := C) (fun j => if a < j then 1 else 0) (by simp)
    (fun j hj => by
      by_cases h : j = a
      · rw [ite_eq_left ((hfix j hj).mpr h)]; split_ifs <;> omega
      · rw [ite_eq_right (fun h' => h ((hfix j hj).mp h'))]; split_ifs <;> omega)
  have := (inv_C hb).1
  rw [hc C le_rfl, ite_eq_left ha] at this
  omega

lemma band_two (hb : IsBand C σ) {a b : ℕ} (hab : a < b) (hbC : b < C)
    (hfix : ∀ i < C, (σ i = i ↔ i = a ∨ i = b)) :
    a % 2 = 0 ∧ b % 2 = 1 ∧ ∀ i < C, σ i = qcol a b i := by
  have hc := cnt_spec (σ := σ) (C := C)
    (fun j => (if a < j then 1 else 0) + if b < j then 1 else 0) (by simp)
    (fun j hj => by
      by_cases h : j = a ∨ j = b
      · rw [ite_eq_left ((hfix j hj).mpr h)]; split_ifs <;> omega
      · rw [ite_eq_right (fun h' => h ((hfix j hj).mp h'))]; split_ifs <;> omega)
  have hall := (inv_C hb).2
  have ha := (hall a (by omega)).1 ((hfix a (by omega)).mpr (Or.inl rfl))
  have hbb := (hall b hbC).1 ((hfix b hbC).mpr (Or.inr rfl))
  rw [hc a (by omega)] at ha
  rw [hc b (by omega)] at hbb
  have ha' : a % 2 = 0 := by split_ifs at ha <;> omega
  have hb' : b % 2 = 1 := by split_ifs at hbb <;> omega
  refine ⟨ha', hb', fun i hi => ?_⟩
  by_cases hab' : i = a ∨ i = b
  · have := (hfix i hi).mpr hab'
    unfold qcol; split_ifs <;> omega
  · have hne : σ i ≠ i := fun h => hab' ((hfix i hi).mp h)
    have h := nonfixed hb hi hne
    have hci : (i ≤ a → cnt σ i = 0) ∧ (a < i → i ≤ b → cnt σ i = 1) ∧
        (b < i → cnt σ i = 2) := by
      rw [hc i hi.le]; refine ⟨?_, ?_, ?_⟩ <;> intros <;> split_ifs <;> omega
    unfold qcol pcol; split_ifs <;> omega

end Band

def sig (f : Cell R C → Cell R C) (k : ℕ) (hk : 2 * k < R) (j : ℕ) : ℕ :=
  if hj : j < C then (f (⟨2 * k, hk⟩, ⟨j, hj⟩)).2.val else 0

lemma sig_spec (f : Cell R C → Cell R C) (k : ℕ) (hk : 2 * k < R) (j : ℕ) (hj : j < C) :
    sig f k hk j = (f (⟨2 * k, hk⟩, ⟨j, hj⟩)).2.val := by
  unfold sig; rw [dite_eq_left hj]

lemma cell_eta (x : Cell R C) (h : x.1.val % 2 = 0) (hk : 2 * (x.1.val / 2) < R) :
    x = (⟨2 * (x.1.val / 2), hk⟩, ⟨x.2.val, x.2.isLt⟩) :=
  Prod.ext (Fin.ext (by simp only; omega)) rfl

lemma sig_top (f : Cell R C → Cell R C) (x : Cell R C) (h : x.1.val % 2 = 0)
    (hk : 2 * (x.1.val / 2) < R) : (f x).2.val = sig f (x.1.val / 2) hk x.2.val := by
  rw [sig_spec _ _ _ _ x.2.isLt, ← cell_eta x h hk]

lemma isBand_sig {f : Cell R C → Cell R C} (hf : IsMatching f) (h0 : ∀ x, ¬ Horiz x (f x))
    (k : ℕ) (hk : 2 * k < R) : IsBand C (sig f k hk) := by
  have hrow := row_partner hf h0
  have top : ∀ j (hj : j < C), (f (⟨2 * k, hk⟩, ⟨j, hj⟩)).1.val = 2 * k + 1 := by
    intro j hj; rw [hrow]; unfold prow; simp
  refine ⟨?_, ?_, ?_, ?_⟩
  · intro i hi; rw [sig_spec _ _ _ _ hi]; exact Fin.isLt _
  · intro i hi
    rw [sig_spec _ _ _ _ hi]
    have := (rows_near hf (⟨2 * k, hk⟩, ⟨i, hi⟩) (h0 _)).2
    unfold Near at this
    simp only at this
    omega
  · intro i hi j hj e
    rw [sig_spec _ _ _ _ hi, sig_spec _ _ _ _ hj] at e
    have e1 : f (⟨2 * k, hk⟩, ⟨i, hi⟩) = f (⟨2 * k, hk⟩, ⟨j, hj⟩) :=
      Prod.ext (Fin.ext (by rw [top, top])) (Fin.ext e)
    have e2 := congrArg f e1
    rw [hf.1, hf.1] at e2
    exact congrArg (fun z : Cell R C => z.2.val) e2
  · intro v hv
    have hk1 : 2 * k + 1 < R := by
      have := (f (⟨2 * k, hk⟩, ⟨v, hv⟩)).1.isLt; rw [top] at this; exact this
    let y : Cell R C := (⟨2 * k + 1, hk1⟩, ⟨v, hv⟩)
    have hy : (f y).1.val = 2 * k := by
      rw [hrow]; show prow (2 * k + 1) = 2 * k; unfold prow; split_ifs <;> omega
    refine ⟨(f y).2.val, (f y).2.isLt, ?_⟩
    rw [sig_spec _ _ _ _ (f y).2.isLt]
    have e : ((⟨2 * k, hk⟩, ⟨(f y).2.val, (f y).2.isLt⟩) : Cell R C) = f y :=
      Prod.ext (Fin.ext hy.symm) rfl
    rw [e, hf.1]

def topV (f : Cell R C → Cell R C) : Finset (Cell R C) :=
  univ.filter fun x => x.1.val % 2 = 0 ∧ Vert x (f x)

lemma vCount_eq {f : Cell R C → Cell R C} (hf : IsMatching f) (h0 : ∀ x, ¬ Horiz x (f x)) :
    vCount f = 2 * (topV f).card := by
  unfold vCount topV
  apply card_split hf.1
  · intro x; rw [row_partner hf h0]; unfold prow; split_ifs <;> omega
  · intro x hx; rw [hf.1 x]; exact vert_symm _ _ hx

lemma fixed_iff {f : Cell R C → Cell R C} (hf : IsMatching f) (h0 : ∀ x, ¬ Horiz x (f x))
    (k : ℕ) (hk : 2 * k < R) (j : ℕ) (hj : j < C) :
    sig f k hk j = j ↔
      ((⟨2 * k, hk⟩, ⟨j, hj⟩) : Cell R C) ∈ topV f := by
  rw [sig_spec _ _ _ _ hj]
  unfold topV
  have hn := (rows_near hf (⟨2 * k, hk⟩, ⟨j, hj⟩) (h0 _)).1
  rw [mem_filter]
  simp only [mem_univ, true_and, Vert]
  constructor
  · intro h; exact ⟨by omega, h.symm, hn⟩
  · intro h; exact h.2.1.symm

end General

lemma four_dvd_hCount {m C : ℕ} {f : Cell (2 * m) C → Cell (2 * m) C} (hf : IsMatching f) :
    4 ∣ hCount f := by
  have hEO : (univ.filter fun x : Cell (2 * m) C => x.1.val % 2 = 0).card =
      (univ.filter fun x : Cell (2 * m) C => ¬ x.1.val % 2 = 0).card := by
    apply card_invol (fun x : Cell (2 * m) C => ((⟨prow x.1.val, prow_lt x.1.isLt⟩ : Fin (2 * m)), x.2))
    · intro x; exact Prod.ext (Fin.ext (prow_prow _)) rfl
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      unfold prow; split_ifs; omega
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      unfold prow; split_ifs; omega
  have hE := card_filter_add_card_filter_not
    (s := univ.filter fun x : Cell (2 * m) C => x.1.val % 2 = 0) (fun x => Horiz x (f x))
  have hO := card_filter_add_card_filter_not
    (s := univ.filter fun x : Cell (2 * m) C => ¬ x.1.val % 2 = 0) (fun x => Horiz x (f x))
  rw [filter_filter, filter_filter] at hE hO
  have hX : (univ.filter fun x : Cell (2 * m) C => x.1.val % 2 = 0 ∧ ¬ Horiz x (f x)).card =
      (univ.filter fun x : Cell (2 * m) C => ¬ x.1.val % 2 = 0 ∧ ¬ Horiz x (f x)).card := by
    apply card_invol f hf.1
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      have hn := (rows_near hf x hx.2).1
      unfold Near at hn
      refine ⟨by omega, fun h => hx.2 ?_⟩
      have := horiz_symm _ _ h; rwa [hf.1] at this
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      have hn := (rows_near hf x hx.2).1
      unfold Near at hn
      refine ⟨by omega, fun h => hx.2 ?_⟩
      have := horiz_symm _ _ h; rwa [hf.1] at this
  have hH := card_filter_add_card_filter_not
    (s := univ.filter fun x : Cell (2 * m) C => Horiz x (f x)) (fun x => x.1.val % 2 = 0)
  rw [filter_filter, filter_filter,
    card_filter_and_comm (fun x : Cell (2 * m) C => Horiz x (f x)) (fun x => x.1.val % 2 = 0),
    card_filter_and_comm (fun x : Cell (2 * m) C => Horiz x (f x)) (fun x => ¬ x.1.val % 2 = 0)]
    at hH
  have hL := card_filter_add_card_filter_not
    (s := univ.filter fun x : Cell (2 * m) C => x.1.val % 2 = 0 ∧ Horiz x (f x))
    (fun x => x.2.val < (f x).2.val)
  rw [filter_filter, filter_filter] at hL
  have hLG : (univ.filter fun x : Cell (2 * m) C =>
        (x.1.val % 2 = 0 ∧ Horiz x (f x)) ∧ x.2.val < (f x).2.val).card =
      (univ.filter fun x : Cell (2 * m) C =>
        (x.1.val % 2 = 0 ∧ Horiz x (f x)) ∧ ¬ x.2.val < (f x).2.val).card := by
    apply card_invol f hf.1
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      have h1 := horiz_symm _ _ hx.1.2
      have h2 := hx.1.2
      unfold Horiz at h2
      rw [hf.1]
      exact ⟨⟨by omega, h1⟩, by omega⟩
    · intro x hx
      simp only [mem_filter, mem_univ, true_and] at hx ⊢
      have h1 := horiz_symm _ _ hx.1.2
      have h2 := hx.1.2
      unfold Horiz Near at h2
      rw [hf.1]
      exact ⟨⟨by omega, h1⟩, by omega⟩
  unfold hCount
  refine ⟨(univ.filter fun x : Cell (2 * m) C =>
        (x.1.val % 2 = 0 ∧ Horiz x (f x)) ∧ x.2.val < (f x).2.val).card, ?_⟩
  omega

section Transpose

variable {R C : ℕ}

def tr (f : Cell R C → Cell R C) : Cell C R → Cell C R := fun x => (f x.swap).swap

lemma tr_tr (f : Cell R C → Cell R C) : tr (tr f) = f := by
  funext x; simp [tr]

lemma isMatching_tr {f : Cell R C → Cell R C} (hf : IsMatching f) : IsMatching (tr f) := by
  refine ⟨fun x => by simp [tr, hf.1], fun x => ?_⟩
  have h := hf.2 x.swap
  unfold KingAdj Horiz Vert Diag at h ⊢
  simp only [tr, Prod.fst_swap, Prod.snd_swap] at h ⊢
  tauto

lemma hCount_tr (f : Cell R C → Cell R C) : hCount (tr f) = vCount f := by
  unfold hCount vCount
  apply card_nbij' Prod.swap Prod.swap
  · intro x hx
    rw [mem_coe, mem_filter] at hx ⊢
    refine ⟨mem_univ _, ?_⟩
    have := hx.2
    simp only [Horiz, Vert, tr, Prod.fst_swap, Prod.snd_swap] at this ⊢
    exact this
  · intro x hx
    rw [mem_coe, mem_filter] at hx ⊢
    refine ⟨mem_univ _, ?_⟩
    have := hx.2
    simp only [Horiz, Vert, tr, Prod.fst_swap, Prod.snd_swap, Prod.swap_swap] at this ⊢
    exact this
  · intro x _; simp
  · intro x _; simp

lemma vCount_tr (f : Cell R C → Cell R C) : vCount (tr f) = hCount f := by
  unfold hCount vCount
  apply card_nbij' Prod.swap Prod.swap
  · intro x hx
    rw [mem_coe, mem_filter] at hx ⊢
    refine ⟨mem_univ _, ?_⟩
    have := hx.2
    simp only [Horiz, Vert, tr, Prod.fst_swap, Prod.snd_swap] at this ⊢
    exact this
  · intro x hx
    rw [mem_coe, mem_filter] at hx ⊢
    refine ⟨mem_univ _, ?_⟩
    have := hx.2
    simp only [Horiz, Vert, tr, Prod.fst_swap, Prod.snd_swap, Prod.swap_swap] at this ⊢
    exact this
  · intro x _; simp
  · intro x _; simp

lemma card_transpose (R C : ℕ) :
    ((matchings R C).filter fun f => hCount f = 4 ∧ vCount f = 0).card =
      ((matchings C R).filter fun f => hCount f = 0 ∧ vCount f = 4).card := by
  apply card_nbij' tr tr
  · intro f hf
    simp only [mem_coe, matchings, mem_filter, mem_univ, true_and] at hf ⊢
    exact ⟨isMatching_tr hf.1, by rw [hCount_tr, vCount_tr]; exact ⟨hf.2.2, hf.2.1⟩⟩
  · intro f hf
    simp only [mem_coe, matchings, mem_filter, mem_univ, true_and] at hf ⊢
    exact ⟨isMatching_tr hf.1, by rw [hCount_tr, vCount_tr]; exact ⟨hf.2.2, hf.2.1⟩⟩
  · intro f _; exact tr_tr f
  · intro f _; exact tr_tr f

end Transpose

section Board

variable {m n : ℕ}

abbrev Board (m n : ℕ) := Cell (2 * m) (2 * n)

lemma pcol_lt {j : ℕ} (h : j < 2 * n) : pcol j < 2 * n := by
  unfold pcol; split_ifs <;> omega

lemma pcol_pcol (j : ℕ) : pcol (pcol j) = j := by
  unfold pcol; split_ifs <;> omega

lemma pcol_near (j : ℕ) : pcol j ≤ j + 1 ∧ j ≤ pcol j + 1 := by
  unfold pcol; split_ifs <;> omega

lemma pcol_ne (j : ℕ) : pcol j ≠ j := by
  unfold pcol; split_ifs <;> omega

lemma qcol_lt {s t j : ℕ} (ht : t < n) (h : j < 2 * n) : qcol (2 * s) (2 * t + 1) j < 2 * n := by
  unfold qcol pcol; split_ifs <;> omega

lemma qcol_qcol {s t : ℕ} (hst : s ≤ t) (j : ℕ) :
    qcol (2 * s) (2 * t + 1) (qcol (2 * s) (2 * t + 1) j) = j := by
  unfold qcol pcol; split_ifs <;> omega

lemma qcol_near (s t j : ℕ) : qcol (2 * s) (2 * t + 1) j ≤ j + 1 ∧ j ≤ qcol (2 * s) (2 * t + 1) j + 1 := by
  unfold qcol pcol; split_ifs <;> omega

lemma qcol_eq_self {s t : ℕ} (hst : s ≤ t) (j : ℕ) : qcol (2 * s) (2 * t + 1) j = j ↔ j = 2 * s ∨ j = 2 * t + 1 := by
  unfold qcol pcol; split_ifs <;> omega

def build (Q : ℕ → ℕ → ℕ) (hQ : ∀ k j, j < 2 * n → Q k j < 2 * n) : Board m n → Board m n :=
  fun x => (⟨prow x.1.val, prow_lt x.1.isLt⟩, ⟨Q (x.1.val / 2) x.2.val, hQ _ _ x.2.isLt⟩)

lemma build_isMatching (Q : ℕ → ℕ → ℕ) (hQ : ∀ k j, j < 2 * n → Q k j < 2 * n)
    (hinv : ∀ k j, Q k (Q k j) = j) (hnear : ∀ k j, Q k j ≤ j + 1 ∧ j ≤ Q k j + 1) :
    IsMatching (build (m := m) Q hQ) := by
  refine ⟨fun x => ?_, fun x => ?_⟩
  · simp only [build]
    exact Prod.ext (Fin.ext (prow_prow _)) (Fin.ext (by simp only; rw [prow_div, hinv]))
  · have hr := prow_near x.1.val
    have hc := hnear (x.1.val / 2) x.2.val
    by_cases h : Q (x.1.val / 2) x.2.val = x.2.val
    · right; left; exact ⟨h.symm, hr⟩
    · right; right; refine ⟨hr, ?_⟩; simp only [build]; unfold Near; omega

lemma build_not_horiz (Q : ℕ → ℕ → ℕ) (hQ : ∀ k j, j < 2 * n → Q k j < 2 * n) (x : Board m n) :
    ¬ Horiz x (build Q hQ x) := by
  have := prow_near x.1.val
  unfold Horiz Near at *
  simp only [build]
  omega

lemma build_vert (Q : ℕ → ℕ → ℕ) (hQ : ∀ k j, j < 2 * n → Q k j < 2 * n) (x : Board m n) :
    Vert x (build Q hQ x) ↔ Q (x.1.val / 2) x.2.val = x.2.val := by
  have := prow_near x.1.val
  unfold Vert
  simp only [build]
  constructor
  · intro h; exact h.1.symm
  · intro h; exact ⟨h.symm, this⟩

lemma eq_build {f : Board m n → Board m n} (hf : IsMatching f) (h0 : ∀ x, ¬ Horiz x (f x))
    (Q : ℕ → ℕ → ℕ) (hQ : ∀ k j, j < 2 * n → Q k j < 2 * n) (hinv : ∀ k j, Q k (Q k j) = j)
    (hσ : ∀ k (hk : 2 * k < 2 * m), ∀ j < 2 * n, sig f k hk j = Q k j) :
    f = build Q hQ := by
  have hrow := row_partner hf h0
  funext x
  refine Prod.ext (Fin.ext (by rw [hrow]; rfl)) (Fin.ext ?_)
  simp only [build]
  by_cases hx : x.1.val % 2 = 0
  · have hk : 2 * (x.1.val / 2) < 2 * m := by have := x.1.isLt; omega
    rw [sig_top f x hx hk, hσ _ hk _ x.2.isLt]
  · have hfx : (f x).1.val % 2 = 0 := by rw [hrow]; unfold prow; split_ifs; omega
    have hk : 2 * ((f x).1.val / 2) < 2 * m := by have := (f x).1.isLt; omega
    have e := sig_top f (f x) hfx hk
    rw [hf.1, hσ _ hk _ (f x).2.isLt] at e
    have hb : (f x).1.val / 2 = x.1.val / 2 := by rw [hrow]; exact prow_div _
    rw [hb] at e
    rw [e, hinv]

def Qzero : ℕ → ℕ → ℕ := fun _ j => pcol j

def Qp (p : Fin m × Fin n × Fin n) : ℕ → ℕ → ℕ := fun k j =>
  if k = p.1.val then qcol (2 * p.2.1.val) (2 * p.2.2.val + 1) j else pcol j

lemma Qp_lt (p : Fin m × Fin n × Fin n) : ∀ k j, j < 2 * n → Qp p k j < 2 * n := by
  intro k j h
  unfold Qp
  split_ifs
  · exact qcol_lt p.2.2.isLt h
  · exact pcol_lt h

lemma Qzero_lt : ∀ k j, j < 2 * n → Qzero k j < 2 * n := fun _ _ h => pcol_lt h

def Ψ0 : Board m n → Board m n := build Qzero Qzero_lt

def Ψ (p : Fin m × Fin n × Fin n) : Board m n → Board m n := build (Qp p) (Qp_lt p)

def target (m n : ℕ) : Finset (Fin m × Fin n × Fin n) :=
  (univ : Finset (Fin m)) ×ˢ (univ.filter fun q : Fin n × Fin n => q.1 ≤ q.2)

lemma mem_target (p : Fin m × Fin n × Fin n) : p ∈ target m n ↔ p.2.1.val ≤ p.2.2.val := by
  unfold target
  rw [mem_product, mem_filter]
  simp only [mem_univ, true_and, Fin.le_def]

lemma Qp_inv (p : Fin m × Fin n × Fin n) (hp : p ∈ target m n) : ∀ k j, Qp p k (Qp p k j) = j := by
  rw [mem_target] at hp
  intro k j
  unfold Qp
  split_ifs
  · exact qcol_qcol hp j
  · exact pcol_pcol j

lemma Qp_near (p : Fin m × Fin n × Fin n) : ∀ k j, Qp p k j ≤ j + 1 ∧ j ≤ Qp p k j + 1 := by
  intro k j
  unfold Qp
  split_ifs
  · exact qcol_near _ _ j
  · exact pcol_near j

lemma Qp_fixed (p : Fin m × Fin n × Fin n) (hp : p.2.1.val ≤ p.2.2.val) (k j : ℕ) :
    Qp p k j = j ↔ k = p.1.val ∧ (j = 2 * p.2.1.val ∨ j = 2 * p.2.2.val + 1) := by
  unfold Qp
  split_ifs with h
  · rw [qcol_eq_self hp]; tauto
  · have := pcol_ne j; tauto

lemma noHoriz_of_hCount {R C : ℕ} {f : Cell R C → Cell R C} (h : hCount f = 0) :
    ∀ x, ¬ Horiz x (f x) := by
  intro x hx
  unfold hCount at h
  have hm : x ∈ univ.filter fun x => Horiz x (f x) := mem_filter.mpr ⟨mem_univ _, hx⟩
  rw [card_eq_zero.mp h] at hm
  exact absurd hm (notMem_empty x)

lemma classify0 {f : Board m n → Board m n} (hf : IsMatching f) (h0 : hCount f = 0)
    (hv : vCount f = 0) : f = Ψ0 := by
  have h0' := noHoriz_of_hCount h0
  have hV := vCount_eq hf h0'
  rw [hv] at hV
  have hVt : topV f = ∅ :=
    card_eq_zero.mp (by omega)
  apply eq_build hf h0' Qzero Qzero_lt (fun _ j => pcol_pcol j)
  intro k hk j hj
  apply band_zero (isBand_sig hf h0' k hk) _ j hj
  intro i hi h
  have := (fixed_iff hf h0' k hk i hi).mp h
  rw [hVt] at this
  exact notMem_empty _ this

lemma classify {f : Board m n → Board m n} (hf : IsMatching f) (h0 : hCount f = 0)
    (hv : vCount f = 4) : ∃ p ∈ target m n, Ψ p = f := by
  have h0' := noHoriz_of_hCount h0
  have hV := vCount_eq hf h0'
  rw [hv] at hV
  obtain ⟨x1, x2, hne, hx⟩ := card_eq_two.mp (show (topV f).card = 2 by omega)
  have hx1 : x1 ∈ topV f := by rw [hx]; simp
  have hx2 : x2 ∈ topV f := by rw [hx]; simp
  have e1 : x1.1.val % 2 = 0 := (mem_filter.mp hx1).2.1
  have e2 : x2.1.val % 2 = 0 := (mem_filter.mp hx2).2.1
  have hfix : ∀ k (hk : 2 * k < 2 * m) j (hj : j < 2 * n), sig f k hk j = j ↔
      (k = x1.1.val / 2 ∧ j = x1.2.val) ∨ (k = x2.1.val / 2 ∧ j = x2.2.val) := by
    intro k hk j hj
    rw [fixed_iff hf h0' k hk j hj, hx, mem_insert, mem_singleton, Prod.ext_iff, Prod.ext_iff,
      Fin.ext_iff, Fin.ext_iff, Fin.ext_iff, Fin.ext_iff]
    simp only
    constructor <;> intro h <;> omega
  have hk1 : 2 * (x1.1.val / 2) < 2 * m := by have := x1.1.isLt; omega
  have hc1 := x1.2.isLt
  have hc2 := x2.2.isLt
  by_cases hk : x1.1.val / 2 = x2.1.val / 2
  · have hc : x1.2.val ≠ x2.2.val := by
      intro h; apply hne; exact Prod.ext (Fin.ext (by omega)) (Fin.ext h)
    obtain ⟨ha2, hb2, hq⟩ := band_two (isBand_sig hf h0' _ hk1)
      (a := min x1.2.val x2.2.val) (b := max x1.2.val x2.2.val) (by omega) (by omega)
      (fun i hi => by rw [hfix _ hk1 i hi]; constructor <;> intro h <;> omega)
    have hm1 : x1.1.val / 2 < m := by omega
    have hs : min x1.2.val x2.2.val / 2 < n := by omega
    have ht : (max x1.2.val x2.2.val - 1) / 2 < n := by omega
    refine ⟨(⟨x1.1.val / 2, hm1⟩, ⟨min x1.2.val x2.2.val / 2, hs⟩,
      ⟨(max x1.2.val x2.2.val - 1) / 2, ht⟩), ?_, ?_⟩
    · rw [mem_target]; simp only; omega
    · symm
      apply eq_build hf h0' _ _ (Qp_inv _ (by rw [mem_target]; simp only; omega))
      intro k hk' j hj
      unfold Qp
      simp only
      split_ifs with hkk
      · subst hkk
        rw [show 2 * (min x1.2.val x2.2.val / 2) = min x1.2.val x2.2.val by omega,
          show 2 * ((max x1.2.val x2.2.val - 1) / 2) + 1 = max x1.2.val x2.2.val by omega]
        exact hq j hj
      · apply band_zero (isBand_sig hf h0' k hk') _ j hj
        intro i hi h
        have := (hfix k hk' i hi).mp h
        omega
  · exfalso
    apply band_one (isBand_sig hf h0' _ hk1) (by omega) hc1
    intro i hi
    rw [hfix _ hk1 i hi]
    constructor <;> intro h <;> omega

lemma Ψ_spec (p : Fin m × Fin n × Fin n) (hp : p ∈ target m n) :
    IsMatching (Ψ p) ∧ hCount (Ψ p) = 0 ∧ vCount (Ψ p) = 4 := by
  refine ⟨build_isMatching _ _ (Qp_inv p hp) (Qp_near p), ?_, ?_⟩
  · unfold hCount
    rw [card_eq_zero, filter_eq_empty_iff]
    intro x _
    exact build_not_horiz _ _ x
  · rw [mem_target] at hp
    have hk := p.1.isLt
    have hs := p.2.1.isLt
    have ht := p.2.2.isLt
    have e : (univ.filter fun x : Board m n => Vert x (Ψ p x)) =
        ({⟨2 * p.1.val, by omega⟩, ⟨2 * p.1.val + 1, by omega⟩} : Finset (Fin (2 * m))) ×ˢ
          ({⟨2 * p.2.1.val, by omega⟩, ⟨2 * p.2.2.val + 1, by omega⟩} : Finset (Fin (2 * n))) := by
      ext x
      simp only [Ψ, mem_filter, mem_univ, true_and, build_vert, Qp_fixed p hp, mem_product,
        mem_insert, mem_singleton, Fin.ext_iff]
      omega
    unfold vCount
    rw [e, card_product, card_pair (by simp [Fin.ext_iff]), card_pair (by simp [Fin.ext_iff]; omega)]

lemma Ψ_injOn : Set.InjOn (Ψ (m := m) (n := n)) (target m n : Set _) := by
  intro p hp q hq h
  have hp' := (mem_target p).mp hp
  have hq' := (mem_target q).mp hq
  have hk := p.1.isLt
  have hs := p.2.1.isLt
  have ht := p.2.2.isLt
  have col : ∀ x : Board m n, Qp p (x.1.val / 2) x.2.val = Qp q (x.1.val / 2) x.2.val := by
    intro x
    have := congrArg (fun g : Board m n → Board m n => (g x).2.val) h
    exact this
  have c1 := col (⟨2 * p.1.val, by omega⟩, ⟨2 * p.2.1.val, by omega⟩)
  have c2 := col (⟨2 * p.1.val, by omega⟩, ⟨2 * p.2.2.val + 1, by omega⟩)
  simp only at c1 c2
  rw [show 2 * p.1.val / 2 = p.1.val by omega] at c1 c2
  have f1 : Qp p p.1.val (2 * p.2.1.val) = 2 * p.2.1.val := (Qp_fixed p hp' _ _).mpr ⟨rfl, Or.inl rfl⟩
  have f2 : Qp p p.1.val (2 * p.2.2.val + 1) = 2 * p.2.2.val + 1 :=
    (Qp_fixed p hp' _ _).mpr ⟨rfl, Or.inr rfl⟩
  rw [f1, eq_comm, Qp_fixed q hq'] at c1
  rw [f2, eq_comm, Qp_fixed q hq'] at c2
  exact Prod.ext (Fin.ext (by omega)) (Prod.ext (Fin.ext (by omega)) (Fin.ext (by omega)))

lemma card_le_pairs (n : ℕ) :
    2 * (univ.filter fun q : Fin n × Fin n => q.1 ≤ q.2).card = n * (n + 1) := by
  have e1 := card_filter_add_card_filter_not (s := (univ : Finset (Fin n × Fin n)))
    (fun q => q.1 ≤ q.2)
  have e2 := card_filter_add_card_filter_not
    (s := (univ : Finset (Fin n × Fin n)).filter fun q => q.1 ≤ q.2) (fun q => q.1 = q.2)
  rw [filter_filter, filter_filter] at e2
  have hd : ((univ : Finset (Fin n × Fin n)).filter fun q => q.1 ≤ q.2 ∧ q.1 = q.2).card = n := by
    have hu : (univ : Finset (Fin n)).card = n := by simp
    refine Eq.trans ?_ hu
    apply card_nbij' (t := (univ : Finset (Fin n))) Prod.fst (fun i => (i, i))
    · intro q _; simp
    · intro i _; simp
    · intro q hq; simp only [mem_coe, mem_filter] at hq; exact Prod.ext rfl hq.2.2
    · intro i _; rfl
  have hs : ((univ : Finset (Fin n × Fin n)).filter fun q => q.1 ≤ q.2 ∧ ¬ q.1 = q.2).card =
      ((univ : Finset (Fin n × Fin n)).filter fun q => ¬ q.1 ≤ q.2).card := by
    apply card_nbij' Prod.swap Prod.swap
    · intro q hq; simp only [mem_coe, mem_filter, mem_univ, true_and, Prod.fst_swap, Prod.snd_swap] at hq ⊢
      rw [Fin.le_def] at hq ⊢; rw [Fin.ext_iff] at hq; omega
    · intro q hq; simp only [mem_coe, mem_filter, mem_univ, true_and, Prod.fst_swap, Prod.snd_swap] at hq ⊢
      rw [Fin.le_def] at hq ⊢; rw [Fin.ext_iff]; omega
    · intro q _; simp
    · intro q _; simp
  rw [card_univ, Fintype.card_prod, Fintype.card_fin] at e1
  rw [hd, hs] at e2
  have : n * (n + 1) = n * n + n := by ring
  omega

lemma card_target (m n : ℕ) : 2 * (target m n).card = m * (n * (n + 1)) := by
  unfold target
  rw [card_product, card_univ, Fintype.card_fin, ← card_le_pairs n]
  ring

lemma count_h0v4 (m n : ℕ) :
    2 * ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 0 ∧ vCount f = 4).card =
      m * (n * (n + 1)) := by
  have e : ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 0 ∧ vCount f = 4) =
      (target m n).image Ψ := by
    ext f
    simp only [matchings, mem_filter, mem_univ, true_and, mem_image]
    constructor
    · rintro ⟨hf, h0, hv⟩; exact classify hf h0 hv
    · rintro ⟨p, hp, rfl⟩; exact Ψ_spec p hp
  rw [e, card_image_of_injOn Ψ_injOn, card_target]

theorem count_zero (m n : ℕ) :
    ((matchings (2 * m) (2 * n)).filter fun f => hCount f + vCount f = 0).card = 1 := by
  rw [card_eq_one]
  refine ⟨Ψ0, ?_⟩
  ext f
  simp only [matchings, mem_filter, mem_univ, true_and, mem_singleton]
  constructor
  · rintro ⟨hf, h⟩; exact classify0 hf (by omega) (by omega)
  · rintro rfl
    refine ⟨build_isMatching _ _ (fun _ j => pcol_pcol j) (fun _ j => pcol_near j), ?_⟩
    have h1 : hCount (Ψ0 (m := m) (n := n)) = 0 := by
      unfold hCount
      rw [card_eq_zero, filter_eq_empty_iff]
      intro x _
      exact build_not_horiz _ _ x
    have h2 : vCount (Ψ0 (m := m) (n := n)) = 0 := by
      unfold vCount
      rw [card_eq_zero, filter_eq_empty_iff]
      intro x _ hx
      rw [Ψ0, build_vert] at hx
      exact pcol_ne _ hx
    omega

theorem count_two (m n : ℕ) :
    2 * ((matchings (2 * m) (2 * n)).filter fun f => hCount f + vCount f = 4).card =
      m * n * (m + n + 2) := by
  have e : ((matchings (2 * m) (2 * n)).filter fun f => hCount f + vCount f = 4) =
      ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 0 ∧ vCount f = 4) ∪
        ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 4 ∧ vCount f = 0) := by
    rw [← filter_or]
    apply filter_congr
    intro f hf
    simp only [matchings, mem_filter, mem_univ, true_and] at hf
    have := four_dvd_hCount hf
    omega
  have hd : Disjoint ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 0 ∧ vCount f = 4)
      ((matchings (2 * m) (2 * n)).filter fun f => hCount f = 4 ∧ vCount f = 0) := by
    rw [disjoint_filter]; intro f _ h; omega
  rw [e, card_union_of_disjoint hd, card_transpose]
  have h1 := count_h0v4 m n
  have h2 := count_h0v4 n m
  have : m * n * (m + n + 2) = m * (n * (n + 1)) + n * (m * (m + 1)) := by ring
  omega

theorem T_top (n : ℕ) : T n (n ^ 2) = 1 := by
  unfold T
  rw [← count_zero n n]
  congr 1
  apply filter_congr
  intro f hf
  simp only [matchings, mem_filter, mem_univ, true_and] at hf
  have := side_add_diag hf
  have e : 2 * n * (2 * n) = 4 * n ^ 2 := by ring
  omega

theorem T_top_sub_one (n : ℕ) (hn : 1 ≤ n) : T n (n ^ 2 - 1) = n ^ 2 * (n + 1) := by
  have h := count_two n n
  have e1 : ((matchings (2 * n) (2 * n)).filter fun f => dCount f = 4 * (n ^ 2 - 1)) =
      (matchings (2 * n) (2 * n)).filter fun f => hCount f + vCount f = 4 := by
    apply filter_congr
    intro f hf
    simp only [matchings, mem_filter, mem_univ, true_and] at hf
    have := side_add_diag hf
    have e : 2 * n * (2 * n) = 4 * n ^ 2 := by ring
    have : 1 ≤ n ^ 2 := Nat.one_le_pow _ _ hn
    omega
  unfold T
  rw [e1]
  have e2 : n * n * (n + n + 2) = 2 * (n ^ 2 * (n + 1)) := by ring
  omega

end Board

end A401673
