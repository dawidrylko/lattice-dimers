# Zenodo records for king-entropy

Three records: the software archive, minted by the Zenodo GitHub integration from the release
`king-entropy-v1.0.0` with the metadata in the root [`.zenodo.json`](../../../.zenodo.json), and two
preprints uploaded by hand with the metadata below. Nothing here is published yet: the integration
toggle is off and the tag does not exist.

`.zenodo.json` sits on master, and Zenodo applies it to every release of the repository while the
toggle is on, ahead of `CITATION.cff`. Before any solver release (`v1.2.0` and later), rewrite or remove
it, or that release is archived as the king-entropy snapshot.

## Preprint 1: the paper

| Field | Value |
| --- | --- |
| Resource type | Publication / Preprint |
| Title | The dimer entropy of the king's graph |
| Creator | Ryłko, Dawid (personal; leave the affiliation empty) |
| Files | `main.pdf` |
| DOI | "Get a DOI now!" (reserve; the draft stays unpublished) |
| License | Creative Commons Attribution 4.0 International (`cc-by-4.0`) |
| Language | English |
| Keywords | king's graph; domicule tilings; perfect matchings; dimer model; entropy; transfer matrix; MSC2020 05C70; MSC2020 82B20; MSC2020 82B80; MSC2020 05A16 |
| Related | is supplemented by `<DOI_SOFT>` (software); references `<DOI_LNOTE>` (preprint) |

Description:

> We compute the entropy per site s of the perfect matchings of the king's graph, the square lattice
> with both diagonals; equivalently, of the domicule tilings counted in OEIS A239264. The graph is not
> planar, and its boards with both sides at least 3 admit no Pfaffian orientation, so Kasteleyn's
> method does not apply. Row transfer matrices on cylinders of circumference up to 25, split by a
> conserved parity of the dimers crossing a loop, converge exponentially; a Lüscher-type extrapolation
> with predictive backtests and an error budget gives s = 0.5655119110413253 ± 6·10⁻¹⁶, a non-rigorous
> estimate. Computer-assisted Collatz-Wielandt certificates, combined with a bound for the matchings
> across a cut that depends on the runs of crossing cells, prove 0.545343749727 ≤ s ≤ 0.582767477484.
> We also estimate the surface free energy of a free edge, σ = 0.242017935766251 ± 9·10⁻¹⁵, the corner
> free energy, which gives the asymptotics of A239273, and the decay length ξ = 1.235 ± 0.004 of the
> splitting between the two parity sectors. Two sign properties of the strip growth rates, convexity
> in the even width and a one-sided bound on the odd increments, hold numerically and would give
> 0.565511911035 ≤ s ≤ 0.565511911049.

## Preprint 2: the companion note

| Field | Value |
| --- | --- |
| Resource type | Publication / Preprint |
| Title | Log-convexity of strip dimer counts on the king's graph |
| Creator | Ryłko, Dawid (personal; leave the affiliation empty) |
| Files | `L-note.pdf` |
| DOI | "Get a DOI now!" (reserve; the draft stays unpublished) |
| License | Creative Commons Attribution 4.0 International (`cc-by-4.0`) |
| Language | English |
| Keywords | king's graph; domicule tilings; perfect matchings; log-convexity; transfer matrix; Krein signature; MSC2020 05C70; MSC2020 82B20; MSC2020 15B48 |
| Related | is supplemented by `<DOI_SOFT>` (software); references `<DOI_PAPER>` (preprint) |

Description:

> Let Z(k, m) be the number of perfect matchings of the k × m king board, the square grid with both
> diagonals, i.e. the number of its domicule tilings. In all 1453 cases we tested, on free strips of
> width m ≤ 26 and cylinders of circumference m ≤ 22, the sequence q ↦ Z(2q, m) is log-convex; the
> tests are exact or carry a rigorous rounding bound. The property is not structural. It fails on free
> strips of the triangular lattice, for every unequal pair of diagonal weights we tried, where a
> Krein-signature argument for the left-right reflection predicts the onset, and on wide strips for
> equal diagonal weights x = 3/2, 2, 3. Its limit, convexity of q ↦ log λ<sub>2q</sub> for the strip growth
> rates, would give a conditional lower bound on the entropy with ten correct digits. Along equal
> weights it is a competition between two modes of the transfer matrix whose rates cross, on our data,
> between x = 7/4 and x = 2. We collect the obstructions to the standard proof techniques and two
> exact reformulations.

## Release runbook

`<DOI_PAPER>`, `<DOI_LNOTE>` and `<DOI_SOFT>` stand for bare DOIs of the form `10.5281/zenodo.N`;
the `.tex`, `.bib` and OEIS files wrap them as shown in step 7.

0. Before anything else, on the x86-64 machine and from a clean clone with tags, check that the
   committed outputs match the code and the data:
   - `python3 src/repro.py > out/out_repro.txt` (about 10 minutes). Every line must read `[SAME]`,
     and the first line must name a commit of master and report no missing recorded commits.
   - An output is stale when a data file it reads was added or changed after the output was last
     committed: PR #38 found `out/out_ltest.txt` still counting 1451 (L) cases after
     `data/zex/zex_king_free_m24_K24.json` had raised them to 1453. For every command in the table of
     `main.tex`, Section "Reproducibility", compare `git log -1 --format=%ci -- <output>` with the
     same for its script and its inputs, rerun the stale ones, and update the numbers that changed
     in `main.tex`, `L-note.tex`, `NUMBERS.md` and `oeis-draft.txt`.
   - Commit `out/out_repro.txt` and any rerun output on a `d/*` branch and merge it with a merge
     commit before step 3, so the tag carries them.
1. Create both preprint drafts on Zenodo with the metadata above except the related identifiers,
   reserve their DOIs, save without publishing. Write down `<DOI_PAPER>` and `<DOI_LNOTE>`.
2. In each draft add the `references` relation to the other preprint's DOI (resource type
   Publication / Preprint) and save, still without publishing.
3. On a `d/*` branch add to `.zenodo.json` the relations of the software record, check it with
   `python3 -m json.tool .zenodo.json` and merge it. Zenodo reads the file from the tag, so a mistake
   here can be fixed only by a new tag:
   ```json
   "related_identifiers": [
     {"identifier": "<DOI_PAPER>", "relation": "isSupplementTo", "resource_type": "publication-preprint", "scheme": "doi"},
     {"identifier": "<DOI_LNOTE>", "relation": "isSupplementTo", "resource_type": "publication-preprint", "scheme": "doi"}
   ]
   ```
4. Zenodo, GitHub settings: switch the toggle for `dawidrylko/lattice-dimers` on.
5. Tag the merge commit of step 3 on master (`<SHA>`) and release it, never as latest:
   ```bash
   git tag -a king-entropy-v1.0.0 <SHA> -m "king-entropy v1.0.0: code, data and outputs of the king's graph entropy paper"
   git push origin king-entropy-v1.0.0
   gh release create king-entropy-v1.0.0 --repo dawidrylko/lattice-dimers --verify-tag --latest=false --title "king-entropy v1.0.0" --notes "Code, data and outputs behind research/king-entropy/paper/main.tex and L-note.tex."
   ```
   `king-entropy-v0.1.0` stays; the outputs cite its SHAs.
6. Wait for the Zenodo record, check its title, creator, license, keywords and the two relations on
   the record page, and write down its version DOI `<DOI_SOFT>` (cite the version, not the concept
   DOI). The tagged snapshot still carries the placeholders below; that is expected.
7. On a `d/*` branch fill in the DOIs:
   - `main.tex`, Data availability: replace `TO-BE-ASSIGNED (Zenodo) \TODO{...}` with `<DOI_SOFT>`
     and drop the `% TODO(submission)` comment.
   - `L-note.tex`, Data availability: add "at the tag `king-entropy-v1.0.0`, and are archived on
     Zenodo, DOI: `<DOI_SOFT>`", worded as in `main.tex`.
   - `refs.bib`: in `rylko2026entropy` and `rylko2026lnote` set `howpublished` to
     `{Preprint, Zenodo, \url{https://doi.org/<DOI_PAPER>}}` and `{..., \url{https://doi.org/<DOI_LNOTE>}}`,
     and drop "their Zenodo DOIs are assigned at publication" from the comment above them.
   - `oeis-draft.txt`: in the third `%H` line the two "DOI to be added" become `<DOI_PAPER>` and
     `<DOI_SOFT>`; delete the second `%H` line, which links to the `main.pdf` of the tag, still
     showing the DOI placeholder; update the "Before submitting" header.
8. Rebuild both PDFs in the pinned image and commit them with the sources:
   ```bash
   cd research/king-entropy/paper
   docker run --rm -v "$PWD":/work -w /work texlive/texlive@sha256:e8148b126545105c4aeeaa212f8a7bd02d05b500351372881055e1e59ae67d33 sh -c 'latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex && latexmk -pdf -interaction=nonstopmode -halt-on-error L-note.tex'
   ```
9. Upload the rebuilt `main.pdf` and `L-note.pdf` to their drafts, add `isSupplementedBy`
   `<DOI_SOFT>` (resource type Software) to each, publish both. Then the OEIS entry.
