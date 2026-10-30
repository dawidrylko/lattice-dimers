# Zenodo records for king-entropy

Three published records: the software archive
[10.5281/zenodo.23686293](https://doi.org/10.5281/zenodo.23686293), minted by the Zenodo GitHub
integration from the release `king-entropy-v1.0.0` with the metadata in the root
[`.zenodo.json`](../../../.zenodo.json), and two preprints with the metadata below, the paper
[10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056) and the companion note
[10.5281/zenodo.23686087](https://doi.org/10.5281/zenodo.23686087). The concept DOI of the software
record, which its later versions share, is 10.5281/zenodo.23686292.

`.zenodo.json` sits on master, and Zenodo applies it to every release of the repository while the
toggle is on, ahead of `CITATION.cff`. The toggle stays on after this release. Zenodo files every
later release of the repository as a new version under the same concept DOI, so a solver release
(`v1.2.0` and later) becomes the newest version of the king-entropy record. Before such a release,
rewrite `.zenodo.json` for the solvers, or remove it so that Zenodo reads `CITATION.cff`; otherwise
that release is archived under the king-entropy title and relations. The papers cite the version DOI
of step 6, which a later version does not change.

## Preprint 1: the paper

| Field | Value |
| --- | --- |
| Resource type | Publication / Preprint |
| Title | The dimer entropy of the king's graph |
| Creator | Ryłko, Dawid (personal, ORCID 0009-0008-6307-9015; leave the affiliation empty) |
| Files | `king-entropy.pdf` |
| DOI | "Get a DOI now!" (reserve; the draft stays unpublished) |
| License | Creative Commons Attribution 4.0 International (`cc-by-4.0`) |
| Language | English |
| Keywords | king's graph; domicule tilings; perfect matchings; dimer model; entropy; transfer matrix; MSC2020 05C70; MSC2020 82B20; MSC2020 82B80; MSC2020 05A16 |
| Subjects | EuroSciVoc: Combinatorics (`euroscivoc:82355983`); Graph theory (`euroscivoc:1629`); Statistical mechanics (`euroscivoc:805`) |
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
> free energy, which gives the asymptotics of A239273, and the decay length ξ = 1.236091 ± 10⁻⁶ of the
> splitting between the two parity sectors. Two sign properties of the strip growth rates, convexity
> in the even width and a one-sided bound on the odd increments, hold numerically and would give
> 0.565511911035 ≤ s ≤ 0.565511911049.

## Preprint 2: the companion note

| Field | Value |
| --- | --- |
| Resource type | Publication / Preprint |
| Title | Log-convexity of strip dimer counts on the king's graph |
| Creator | Ryłko, Dawid (personal, ORCID 0009-0008-6307-9015; leave the affiliation empty) |
| Files | `king-entropy-log-convexity.pdf` |
| DOI | "Get a DOI now!" (reserve; the draft stays unpublished) |
| License | Creative Commons Attribution 4.0 International (`cc-by-4.0`) |
| Language | English |
| Keywords | king's graph; domicule tilings; perfect matchings; log-convexity; transfer matrix; Krein signature; MSC2020 05C70; MSC2020 82B20; MSC2020 15B48 |
| Subjects | EuroSciVoc: Combinatorics (`euroscivoc:82355983`); Graph theory (`euroscivoc:1629`); Statistical mechanics (`euroscivoc:805`) |
| Related | is supplemented by `<DOI_SOFT>` (software); references `<DOI_PAPER>` (preprint) |

Description:

> Let Z(k, m) be the number of perfect matchings of the k × m king board, the square grid with both
> diagonals, i.e. the number of its domicule tilings. In all 1453 cases we tested, on free strips of
> width m ≤ 26 and cylinders of circumference m ≤ 22, the sequence q ↦ Z(2q, m) is log-convex; the
> tests are exact or carry a rigorous rounding bound. The property is not structural. It fails on free
> strips of the triangular lattice, for every unequal pair of diagonal weights we tried (for nearly
> equal weights at m = 4 and 8 a Krein-signature argument for the left-right reflection predicts the
> onset exactly), and on wide strips for equal diagonal weights x = 3/2, 2, 3. Its limit, convexity of q ↦ log λ<sub>2q</sub> for the strip growth
> rates, would give a conditional lower bound on the entropy with ten correct digits. Along equal
> weights it is a competition between two modes of the transfer matrix whose rates cross, on our data,
> between x = 7/4 and x = 2. We collect the obstructions to the standard proof techniques and two
> exact reformulations.

## Release runbook

`<DOI_PAPER>`, `<DOI_LNOTE>` and `<DOI_SOFT>` stand for bare DOIs of the form `10.5281/zenodo.N`;
the `.tex`, `.bib` and OEIS files wrap them as shown in step 7.

0. Before anything else, check that the committed outputs and PDFs match the code and the data. Run
   this on an x86-64 machine (eigenvalue outputs differ in their last digits on other
   architectures), from a clean clone with tags, in `research/king-entropy/`:
   - `python3 src/repro.py > out/out_repro.txt` (about 10 minutes). Every comparison line must read
     `[SAME]` and the last line `all reproduced: True`; the first line must name a commit of master
     and report 0 missing recorded commits.
   - An output is stale when its script, a module it imports (directly or through another module) or
     a data file it reads changed in a commit the output does not contain: PR #38 found
     `out/out_ltest.txt` still counting 1451 (L) cases after `data/zex/zex_king_free_m24_K24.json` had
     raised them to 1453. Check every output in the table of `paper/king-entropy.tex`, Section
     "Reproducibility", and every `replication/` output that the paper or `paper/NUMBERS.md` cites.
     Take the inputs from the script's docstring, its imports and the `# needs` comments of
     `README.md`, and list the commits since each output was last written. `--follow` takes one path,
     so name the outputs and inputs file by file; a shell glob expands to single files:
     ```bash
     for o in <outputs>; do
       a=$(git log --follow --diff-filter=AMC --format=%H -- "$o" | grep -v -E '^(fc5e453|0cfbfaa)' | head -1)
       [ -n "$a" ] || { echo "NO ANCHOR: $o"; continue; }
       echo "== $o"
       for f in <script> <imported modules> <inputs>; do
         [ -e "$f" ] || echo "MISSING: $f"
         git diff --quiet "$a" HEAD -- "$f" && continue
         git log --follow --format='%h %s' "$a"..HEAD -- "$f"
       done
     done
     ```
     Without `--follow` a rename hides the changes before it: `git log -1 -- out/out_surface.txt`
     stops at the move 9ddb2fb, not at the run that wrote the file. The filter keeps `C`, because
     `--follow` reports a new file that resembles an older one as a copy: without it the anchor of
     `data/zex/zex_king_free_m24_K24.json` falls into the history of `..._m24_K20.json`, two days
     before 53b3180 wrote it. An input whose content at `HEAD` equals its content at the anchor is
     skipped: a commit that changed it and a later one that changed it back make no output stale. The rename commits fc5e453 and
     0cfbfaa changed only file paths, in docstrings, comments, printed labels and the input path of
     `src/hidden_oos.py` (`README.md`, "Renamed before king-entropy-v1.0.0"), so they make no output
     stale; the `grep` keeps them from serving as the anchor of `out/out_hidden_oos.txt` and
     `out/out_derived.txt`, whose labels they edited. Every other commit listed means stale, including
     one that changes only a comment or a docstring, and including 9ddb2fb, which moved the files and
     changed the I/O of the scripts it touched (`git show --stat -M 9ddb2fb`).
     Rerun the stale outputs, commit each round on the `d/*` branch and repeat the check, because a
     rerun file that another script reads makes that script's outputs stale in turn. A rerun that
     leaves an output byte-identical leaves nothing to commit; count that output as fresh and leave it
     out of the next round. Stop when nothing is listed for the outputs that remain. The `data/lean/`
     files written before 6ef3190 have no `machine` and `nmant` fields, and their rerun records both.
   - The rerun may also sit alongside the originals instead of replacing them. Its files then go to
     the same relative paths under `rerun/<year>-<month>/`, with a `COMPARISON.md` against the
     originals, and the originals stay the sources of the paper. An output also counts as fresh when
     its rerun under the current code reproduced it there: byte-identical, or differing only in commit
     SHAs, command paths, run times, peak memory, the `machine` and `nmant` fields, or the order of log
     lines. A byte-identical rerun leaves no commit, so the loop may still list such an output, and its
     row in `COMPARISON.md` is the check. The commit that restores an original becomes its anchor, so
     the loop passes every output the rerun changed; for those too, the row in `COMPARISON.md` is the
     check. The rerun of October 2026 is `rerun/2026-10/`. Its one numeric
     difference is in 24 fitted fields of `data/errbar.json`, at relative 1.4e-11 or less. `s`, `err`
     and `out/out_errbar.txt` are unchanged and no file quotes those fields, so `data/errbar.json`
     counts as reproduced too.
   - Update every file that quotes a number that changed, found with `git grep` on the old value: the
     two papers, `paper/NUMBERS.md`, `oeis-draft.txt`, `notes/`, `proofs/`, `replication/REPORT.md`,
     the descriptions above, and at the root `.zenodo.json`, `README.md`, `notes/00-research.md` and
     `site/build.js`. Update also the provenance sentences that the reruns make untrue: which outputs
     record SHAs under `king-entropy-v0.1.0` (this directory's `README.md`, `paper/NUMBERS.md` and Section
     "Reproducibility" of `paper/king-entropy.tex`), which machine wrote which runs (the same section
     and the note on the machines in `paper/NUMBERS.md`), and "the outputs cite its SHAs" in step 5.
   - Rebuild both PDFs with the `docker run` line of step 8, run in `paper/`.
   - Commit all of it on a `d/*` branch and merge it with a merge commit (`gh pr merge --merge`; the
     repository allows it next to squash) before step 1, so the outputs keep the branch SHAs they
     record and the preprint drafts and the tag carry the same numbers and PDFs.
1. Create both preprint drafts on Zenodo with the metadata above except the related identifiers and
   the files, which step 9 uploads. Copy each description from the rendered page, not from the
   Markdown source, so the subscript in the second one stays a subscript. Reserve their DOIs, save
   without publishing. Write down `<DOI_PAPER>` and `<DOI_LNOTE>`.
2. In each draft add the `references` relation to the other preprint's DOI (resource type
   Publication / Preprint) and save, still without publishing.
3. On a `d/*` branch add to `.zenodo.json` the relations of the software record, check it with
   `python3 -m json.tool .zenodo.json` and merge it. Zenodo reads the file from the tag, so a mistake
   here can be fixed only by a new tag. The list replaces the link to the tag's tree that Zenodo adds
   when `.zenodo.json` has none, so the third entry puts it back:
   ```json
   "related_identifiers": [
     {"identifier": "<DOI_PAPER>", "relation": "isSupplementTo", "resource_type": "publication-preprint", "scheme": "doi"},
     {"identifier": "<DOI_LNOTE>", "relation": "isSupplementTo", "resource_type": "publication-preprint", "scheme": "doi"},
     {"identifier": "https://github.com/dawidrylko/lattice-dimers/tree/king-entropy-v1.0.0", "relation": "isSupplementTo", "resource_type": "software", "scheme": "url"}
   ]
   ```
4. Zenodo, GitHub settings: switch the toggle for `dawidrylko/lattice-dimers` on.
5. Tag the merge commit of step 3 on master (`<SHA>`) and release it, never as latest:
   ```bash
   git tag -a king-entropy-v1.0.0 <SHA> -m "king-entropy v1.0.0: code, data and outputs of the king's graph entropy paper"
   git push origin king-entropy-v1.0.0
   gh release create king-entropy-v1.0.0 --repo dawidrylko/lattice-dimers --verify-tag --latest=false --title "king-entropy v1.0.0" --notes "Code, data and outputs behind research/king-entropy/paper/king-entropy.tex and king-entropy-log-convexity.tex."
   ```
   `king-entropy-v0.1.0` stays; the outputs cite its SHAs.
6. Wait for the Zenodo record, check its title, creator, license, keywords and the three relations on
   the record page, and write down its version DOI `<DOI_SOFT>` (cite the version, not the concept
   DOI). The tagged snapshot still carries the placeholders below; that is expected.
7. On a `d/*` branch fill in the DOIs:
   - `paper/king-entropy.tex`, Data availability: replace `TO-BE-ASSIGNED (Zenodo) \TODO{...}` with `<DOI_SOFT>`
     and drop the `% TODO(submission)` comment.
   - `paper/king-entropy-log-convexity.tex`, Data availability: add "at the tag `king-entropy-v1.0.0`, and are archived on
     Zenodo, DOI: `<DOI_SOFT>`", worded as in `paper/king-entropy.tex`.
   - `paper/refs.bib`: in `rylko2026entropy` and `rylko2026lnote` set `howpublished` to
     `{Preprint, Zenodo, \url{https://doi.org/<DOI_PAPER>}}` and
     `{Companion note, Zenodo, \url{https://doi.org/<DOI_LNOTE>}}`, and drop "their Zenodo DOIs are
     assigned at publication" from the comment above them.
   - root `README.md`: replace the grey `Zenodo DOI pending` badge with
     `[![DOI](https://zenodo.org/badge/DOI/<DOI_SOFT>.svg)](https://doi.org/<DOI_SOFT>)` and the
     sentence "until then the DOIs are pending" under the research results with the three DOIs; in
     section "Citation", replace "the Zenodo DOIs replace that reference when the release is out" with
     "the DOIs are `<DOI_PAPER>` for the paper and `<DOI_SOFT>` for the code and data behind it";
     the root `notes/00-research.md`, sections "Papers" and "How to cite", gets the same DOIs; in
     `site/build.js` add `identifier: 'https://doi.org/<DOI_PAPER>'` (and `<DOI_LNOTE>`) to the two
     `PAPERS` entries.
   - `CITATION.cff` describes the whole repository, and README section "Citation" sends users of the
     code to it, so it gets neither `doi` nor `preferred-citation`. Add the paper and the archive to
     `references` instead:
     ```yaml
       - type: unpublished
         authors:
           - family-names: Ryłko
             given-names: Dawid
             orcid: https://orcid.org/0009-0008-6307-9015
         title: "The dimer entropy of the king's graph"
         year: 2026
         doi: <DOI_PAPER>
       - type: software
         authors:
           - family-names: Ryłko
             given-names: Dawid
             orcid: https://orcid.org/0009-0008-6307-9015
         title: "The dimer entropy of the king's graph: transfer-matrix scripts, data and outputs"
         version: king-entropy-v1.0.0
         doi: <DOI_SOFT>
     ```
   - Rewrite the opening paragraph of this file to say the records are published, with the three
     DOIs. In `research/king-entropy/README.md` and `paper/NUMBERS.md`, "the branch that becomes
     `king-entropy-v1.0.0`" becomes "the tag `king-entropy-v1.0.0`".
   - `oeis-draft.txt`: the third `%H` line becomes two linked lines,
     `%H A000000 Dawid Ry&#322;ko, <a href="https://doi.org/<DOI_PAPER>">The dimer entropy of the king's graph</a>, Zenodo preprint, 2026.`
     and
     `%H A000000 Dawid Ry&#322;ko, <a href="https://doi.org/<DOI_SOFT>">The dimer entropy of the king's graph: transfer-matrix scripts, data and outputs</a>, Zenodo, 2026.`;
     delete the second `%H` line, which links to the `paper/king-entropy.pdf` of the tag, still
     showing the DOI placeholder; update the "Before submitting" header.
8. Rebuild both PDFs in the pinned image and commit them with the sources:
   ```bash
   cd research/king-entropy/paper
   docker run --rm -v "$PWD":/work -w /work texlive/texlive@sha256:e8148b126545105c4aeeaa212f8a7bd02d05b500351372881055e1e59ae67d33 sh -c 'latexmk -pdf -interaction=nonstopmode -halt-on-error king-entropy.tex && latexmk -pdf -interaction=nonstopmode -halt-on-error king-entropy-log-convexity.tex'
   ```
   Then check that neither PDF still names a path renamed before the release; this prints nothing.
   `pdftotext` comes with poppler (`brew install poppler` on macOS). A bare `L/` cannot be searched,
   because the paper writes ⌊L/w⌋:
   ```bash
   for f in king-entropy.pdf king-entropy-log-convexity.pdf; do pdftotext "$f" - | grep -E 'xcheck|L/(modes|linf|symmetry|involution|kt|out_|time_)|paper/(derived|out_derived|main|L-note|ZENODO|oeis)|L-NOTE|L-note|CW-NOTE|PROOF-|proof-(lower|upper)-bound'; done
   ```
9. Upload the rebuilt `paper/king-entropy.pdf` and `paper/king-entropy-log-convexity.pdf` to their drafts, add `isSupplementedBy`
   `<DOI_SOFT>` (resource type Software) to each, publish both. Then the OEIS entry.
