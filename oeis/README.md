# OEIS

Entries of the [OEIS](https://oeis.org/) this repository has contributed to. Each directory holds the entry text, where there is one the b-file and the PARI/GP program, and a README with the contribution and its status. The OEIS is the authoritative copy, and its editors may still change a proposed draft before they approve it.

| entry | sequence | entry text | b-file | PARI/GP |
| --- | --- | --- | --- | --- |
| [OEIS A004003](https://oeis.org/A004003) | [domino tilings of the 2n × 2n square](A004003/) | [A004003.txt](A004003/A004003.txt) | [b004003.txt](A004003/b004003.txt) | [A004003.gp](A004003/A004003.gp) |
| [OEIS A239264](https://oeis.org/A239264) | [domicule tilings of the h × w rectangle](A239264/) | [A239264.txt](A239264/A239264.txt) | [b239264.txt](A239264/b239264.txt) | [A239264.gp](A239264/A239264.gp) |
| [OEIS A239273](https://oeis.org/A239273) | [domicule tilings of the 2n × 2n square](A239273/) | [A239273.txt](A239273/A239273.txt) | [b239273.txt](A239273/b239273.txt) | [A239273.gp](A239273/A239273.gp) |
| [OEIS A309117](https://oeis.org/A309117) | [the triangular lattice on the free strip of width 4](A309117/) | [A309117.txt](A309117/A309117.txt) | [b309117.txt](A309117/b309117.txt) | — |
| [OEIS A401669](https://oeis.org/A401669) | [decimal expansion of the entropy per site of the dimers of the king's graph](A401669/) | [A401669.txt](A401669/A401669.txt) | — | — |
| [OEIS A401670](https://oeis.org/A401670) | [domicule tilings of the 2n × 2n torus](A401670/) | [A401670.txt](A401670/A401670.txt) | [b401670.txt](A401670/b401670.txt) | [A401670.gp](A401670/A401670.gp) |
| [OEIS A401673](https://oeis.org/A401673) | [domicule tilings of the 2n × 2n square by the number of diagonal pieces](A401673/) | [A401673.txt](A401673/A401673.txt) | [b401673.txt](A401673/b401673.txt) | [A401673.gp](A401673/A401673.gp) |
| [OEIS A401988](https://oeis.org/draft/A401988) | [tilings of the 2n × 2n board on the triangular lattice](A401988/) | [A401988.txt](A401988/A401988.txt) | [b401988.txt](A401988/b401988.txt) | [A401988.gp](A401988/A401988.gp) |
| [OEIS A402163](https://oeis.org/draft/A402163) | [domicule tilings of the 2n × 2n cylinder](A402163/) | [A402163.txt](A402163/A402163.txt) | [b402163.txt](A402163/b402163.txt) | [A402163.gp](A402163/A402163.gp) |

## Files

The entry texts `A*.txt` are in the OEIS internal format. Published lines come from `https://oeis.org/search?q=id:<A-number>&fmt=text`, without the keywords `new` and `changed` that the OEIS sets for a while on its own; a proposed draft exists only as the HTML of its draft page, and its text is reconstructed from that page. A new entry is given in full, with the data on one `%S` line; an existing entry holds only the lines this repository contributed.

The b-files `b*.txt` are rebuilt by `node oeis/buildBFiles.js` from the exact counts committed in this repository; the README of each entry names the source. A b-file longer than those counts has its own generator `b<number>.js` next to it, and `buildBFiles.js` checks only the terms the counts cover, as for A309117 and A401988. The programs `A*.gp` hold the PARI/GP programs of the entry texts, laid out over several lines; `A401670.gp` and `A402163.gp` also define `T(h, w)`, for the $h \times w$ torus and the $h \times w$ cylinder.

## Editor rules

[`editorRules.js`](editorRules.js) turns what the OEIS editors corrected in these entries, and what the [OEIS Style Sheet](https://oeis.org/wiki/Style_Sheet) asks for, into checks on an entry text, one rule per correction with the revision that made it. `node oeis/editorRules.js --rules` lists them with their sources.

`node oeis/editorRules.js` checks the entry texts here, and `node oeis/editorRules.js A401670` one of them. A finding that the entry on the OEIS still has, or that waits for the copy of a draft to be synced after approval, is kept in `ACCEPTED` with its reason; the test fails when it no longer fires, so the list shrinks with the copies.

`node oeis/editorRules.js --draft <A-number> <draft page .html>` checks a draft before it is submitted: it rebuilds the text from the block of edits on the saved draft page (`-` reads the page from standard input, and with no file the script fetches it), and `--print` shows that text. `node oeis/editorRules.js --file <entry .txt> [b-file]` checks a text in the internal format before it goes into the form. Both exit with 1 on any finding.
