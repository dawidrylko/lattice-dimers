# OEIS

Entries of the [OEIS](https://oeis.org/) this repository has contributed to. Each directory holds the entry text, where there is one the b-file and the PARI/GP program, and a README with the contribution and its status. The OEIS is the authoritative copy, and its editors may still change a proposed draft before they approve it.

| entry | sequence | entry text | b-file | PARI/GP |
| --- | --- | --- | --- | --- |
| [OEIS A004003](https://oeis.org/A004003) | [domino tilings of the 2n × 2n square](A004003/) | [A004003.txt](A004003/A004003.txt) | [b004003.txt](A004003/b004003.txt) | [A004003.gp](A004003/A004003.gp) |
| [OEIS A239264](https://oeis.org/A239264) | [domicule tilings of the h × w rectangle](A239264/) | [A239264.txt](A239264/A239264.txt) | [b239264.txt](A239264/b239264.txt) | [A239264.gp](A239264/A239264.gp) |
| [OEIS A239273](https://oeis.org/A239273) | [domicule tilings of the 2n × 2n square](A239273/) | [A239273.txt](A239273/A239273.txt) | [b239273.txt](A239273/b239273.txt) | [A239273.gp](A239273/A239273.gp) |
| [OEIS A401669](https://oeis.org/draft/A401669) | [decimal expansion of the entropy per site of the dimers of the king's graph](A401669/) | [A401669.txt](A401669/A401669.txt) | — | — |
| [OEIS A401670](https://oeis.org/A401670) | [domicule tilings of the 2n × 2n torus](A401670/) | [A401670.txt](A401670/A401670.txt) | [b401670.txt](A401670/b401670.txt) | [A401670.gp](A401670/A401670.gp) |
| [OEIS A401673](https://oeis.org/A401673) | [domicule tilings of the 2n × 2n square by the number of diagonal domicules](A401673/) | [A401673.txt](A401673/A401673.txt) | [b401673.txt](A401673/b401673.txt) | [A401673.gp](A401673/A401673.gp) |
| [OEIS A401988](https://oeis.org/draft/A401988) | [tilings of the 2n × 2n board on the triangular lattice](A401988/) | [A401988.txt](A401988/A401988.txt) | [b401988.txt](A401988/b401988.txt) | [A401988.gp](A401988/A401988.gp) |

## Files

The entry texts `A*.txt` are in the OEIS internal format. Published lines come from `https://oeis.org/search?q=id:<A-number>&fmt=text`; a proposed draft exists only as the HTML of its draft page, and its text is reconstructed from that page. A new entry is given in full, with the data on one `%S` line; an existing entry holds only the lines this repository contributed.

The b-files `b*.txt` are rebuilt by `node oeis/buildBFiles.js` from the exact counts committed in this repository; the README of each entry names the source. A b-file longer than those counts has its own generator `b<number>.js` next to it, and `buildBFiles.js` checks only the terms the counts cover, as for A401988. The programs `A*.gp` hold the PARI/GP programs of the entry texts, laid out over several lines; `A401670.gp` also defines `T(h, w)` for the $h \times w$ torus.

