const A402163_TERMS = [
  '1',
  '9',
  '2649',
  '77481277',
  '218443636071809',
  '57427497888371336885449',
  '1395563348793812044332013274776713',
  '3128916537327542580980996959564887390713928173',
  '646956954129715568786996558103553266832772491709888662811137',
  '12335487571209436768383230060812575724495333522296724603496099865472598819137',
  '21688471369357631115632742624521218075707923127202396257900707435118841134780628591174563434057',
  '3516346123664774813716727772067187887289239797682161436119809189129401234101354405039270885818011730782876894585053',
];
const A401988_TERMS = [
  '1',
  '2',
  '56',
  '56568',
  '1848358752',
  '1852300296658080',
  '57261989986381118073728',
  '54593422399714606054592633969024',
  '1605069789666171761821497455215339670984192',
  '1455255321774390092885507228295705260380068623855112704',
  '40688743896992170203191431324562552341814139043192585054582874060800',
  '35083207380678584162566597156870677159047202784247299966451478652635521236497807360',
];
const A401673_DATA =
  '1,2,1,36,126,105,12,1,6728,84132,413932,934213,1000638,491689,99554,6638,36,1,12988816,381233080,4924514652,35167723972,151708056673,414390443420,734997028142,854245466616,646928970205,312256068860,91859468926,15162565624,1195684186,32053424,363228,80,1';
const A309117_DATA =
  '1,1,5,15,56,203,749,2777,10293,38240,141997,527593,1960029,7282483,27057400,100531559,373522965,1387822193,5156442953,19158736256,71184183353,264484479633,982690786037,3651182836279,13565952140920,50404229548515,187276671274621';
const A239273_DATA =
  '1,3,280,3037561,3263262629905,326207195516663381931,3011882198082438957330143630563,2565014347691062208319404612723752103028288,201442620359313683494245316355883565275531844406384955392,1458834332808489549111708247664894524221330758005874053074138540424018259';
const A309117_GF = 'G.f.: (1-z)*(1+z)*(1-z-5*z^2-z^3+z^4)/((1+z-3*z^2-3*z^3+z^4)*(1-3*z-3*z^2+z^3+z^4))';
const A309117_REC = '<a href="/index/Rec#order_08">Index entries for linear recurrences with constant coefficients</a>, signature (2,9,-4,-21,-4,9,2,-1).';
const A239264_T =
  'T(h, w) = {my(S = 2^(w+2), v = vector(S), u); if(h*w == 0, return(1)); v[1] = 1; for(p = 0, h*w-1, my(r = p\\w, c = p%w, d = []); if(c+1 < w, d = concat(d, 1)); if(r+1 < h, if(c > 0, d = concat(d, w-1)); d = concat(d, w); if(c+1 < w, d = concat(d, w+1))); u = vector(S); for(s = 0, S-1, my(x = v[s+1]); if(x, if(bitand(s, 1), u[(s>>1)+1] += x, for(i = 1, #d, if(!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += x))))); v = u); v[1]};';
const A239264_NAME = 'Number A(n,k) of domicule tilings of a k X n grid; square array A(n,k), n>=0, k>=0, read by antidiagonals.';
const A401988_NAME =
  'Number of perfect matchings in the 2n X 2n grid graph with the diagonal edges from (i,j) to (i+1,j+1) added, i.e., in a 2n X 2n rhombus of the triangular lattice.';
const A401988_BFILE = 'Dawid Ryłko, <a href="/A401988/b401988_2.txt">Table of n, a(n) for n = 0..37</a>';
const A401988_FENDLEY =
  'Paul Fendley, R. Moessner and S. L. Sondhi, <a href="https://doi.org/10.1103/PhysRevB.66.214513">Classical dimers on the triangular lattice</a>, Phys. Rev. B 66 (2002), 214513.';
const A401988_NOTES = 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/rectangles.html">Triangular lattice: rectangles</a>.';
const A401673_NAME = 'Triangle read by rows: T(n,k) is the number of domicule tilings of the 2n X 2n square with exactly 2k diagonal domicules, 0 <= k <= n^2.';
const A402163_NAME = 'Number of domicule tilings of a 2n X 2n cylindrical grid.';
const A402163_BFILE = 'Dawid Ryłko, <a href="/A402163/b402163_1.txt">Table of n, a(n) for n = 0..11</a>';
const A402163_DATA = A402163_TERMS.slice(0, 10).join(',');
const A004003_FORMULA =
  'a(n) = (-1)^n * Resultant(P(x), P(-x)), where P(x^2) = U(2*n,x/2), i.e., P is the monic polynomial of degree n with roots 4*cos(j*Pi/(2*n+1))^2, j=1..n. Unlike the resultant formula of Apr 13 2020, this gives a(n) directly, without a square root. - _Dawid Ryłko_, Oct 15 2026';
const A004003_FIXED = 'a(n) = (-1)^n * Resultant(P(x), P(-x)), where P(x^2) = U(2*n,x/2); i.e., P is the monic polynomial of degree n with roots 4*cos(j*Pi/(2*n+1))^2, j=1..n. - _Dawid Ryłko_, Oct 15 2026';
const A402163_PROVENANCE =
  'Terms a(0)-a(7) agree between two transfer-matrix programs, one by rows in exact integers and one by cells modulo primes. Terms a(8)-a(11) agree between two independent programs by cells modulo primes; each uses enough primes for an upper bound on the number of perfect matchings, so the Chinese remainder theorem gives the exact count.';
const A402163_FORMULA =
  'a(n) = (M_{2n}^(2n))[0,0], where M_w is the row transfer matrix of domicule tilings of the cylinder of circumference w and index 0 is the empty row (see PARI program).';
const A402163_EXAMPLE =
  'a(1) = 9: on the 2 X 2 cylinder each cell is joined to its row neighbor by 2 edges, to its column neighbor by 1 edge and to the diagonal cell by 2 edges, so a(1) = 2*2 + 1*1 + 2*2 = 9.';

function bFile(terms) {
  return terms.map((term, index) => [String(index), term]);
}

function a402163(data, extra = [], keywords = 'nonn') {
  return [['S', data], ['N', A402163_NAME], ['H', A402163_BFILE], ...extra, ['K', keywords], ['O', '0,2'], ['A', '_Dawid Ryłko_, Nov 14 2026']];
}

function a401988(count, links) {
  return [['S', A401988_TERMS.slice(0, count).join(',')], ['N', A401988_NAME], ...links.map(link => ['H', link]), ['K', 'nonn'], ['O', '0,2'], ['A', '_Dawid Ryłko_, Nov 11 2026']];
}

function a401673(data, keywords) {
  return [['S', data], ['N', A401673_NAME], ['K', keywords], ['O', '0,2'], ['A', '_Dawid Ryłko_, Nov 01 2026']];
}

function a309117(name, extra = []) {
  return [['S', A309117_DATA], ['N', name], ...extra, ['K', 'nonn,easy'], ['O', '0,3'], ['A', 'Sergey Perepechko, Jul 13 2019']];
}

function a239273(extra = []) {
  return [
    ['S', A239273_DATA],
    ['N', 'Number of domicule tilings of a 2n X 2n square grid.'],
    ['H', 'Dawid Ryłko, <a href="/A239273/b239273_1.txt">Table of n, a(n) for n = 0..12</a>'],
    ['K', 'nonn'],
    ['O', '0,2'],
    ['A', '_Alois P. Heinz_, Mar 13 2014'],
    ...extra,
  ];
}

const A309117_LENGTH = 'Number of perfect matchings on a triangular lattice of width 4 and length n.';

const CASES = [
  {
    rule: 'data-fill',
    source: 'A402163 #4 -> #5, Michel Marcus',
    entry: 'A402163',
    before: a402163(A402163_TERMS.slice(0, 9).join(',')),
    after: a402163(A402163_DATA),
    options: { bFile: bFile(A402163_TERMS) },
  },
  {
    rule: 'data-fill',
    source: 'A401988 #6 -> #8, Michel Marcus',
    entry: 'A401988',
    before: a401988(10, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
    options: { bFile: bFile(A401988_TERMS) },
  },
  {
    rule: 'data-rows',
    source: 'A401673 #4 -> #5, Alois P. Heinz',
    entry: 'A401673',
    before: a401673(A401673_DATA.split(',').slice(0, 30).join(','), 'nonn,tabf'),
    after: a401673(A401673_DATA, 'nonn,tabf'),
  },
  {
    rule: 'keyword-more-bfile',
    source: 'A402163 #5 -> #6, Michel Marcus',
    entry: 'A402163',
    before: a402163(A402163_DATA, [], 'nonn,more'),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'keyword-system',
    source: 'oeis/A402163/A402163.txt, copied from the draft with "changed"',
    entry: 'A402163',
    before: a402163(A402163_DATA, [], 'nonn,changed'),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'keyword-consistency',
    source: 'KW, on A401673 without tabf',
    entry: 'A401673',
    before: a401673(A401673_DATA, 'nonn'),
    after: a401673(A401673_DATA, 'nonn,tabf'),
  },
  {
    rule: 'name-period',
    source: 'A309117 #4 -> #5, Michel Marcus',
    entry: 'A309117',
    before: [['N', 'Number of perfect matchings on a triangular lattice of width 4']],
    after: [['N', 'Number of perfect matchings on a triangular lattice of width 4.']],
  },
  {
    rule: 'name-index',
    source: 'A309117 #9 -> #10, Alois P. Heinz',
    entry: 'A309117',
    before: a309117('Number of perfect matchings on a triangular lattice of width 4.'),
    after: a309117(A309117_LENGTH),
  },
  {
    rule: 'capital-x',
    source: 'SS "Spelling and notation": n X n (not n x n)',
    entry: 'A402163',
    before: [['N', 'Number of domicule tilings of a 2n x 2n cylindrical grid.']],
    after: [['N', A402163_NAME]],
  },
  {
    rule: 'line-period',
    source: 'A309117 #4 -> #5, Michel Marcus',
    entry: 'A309117',
    before: [['F', A309117_GF]],
    after: [['F', `${A309117_GF}.`]],
  },
  {
    rule: 'crossrefs-form',
    source: 'A309117 #4 -> #5, Michel Marcus',
    entry: 'A309117',
    before: [['Y', 'A011900']],
    after: [['Y', 'Cf. A011900.']],
  },
  {
    rule: 'links-period',
    source: 'A239273 #49 -> #50, Andrew Howroyd',
    entry: 'A239273',
    before: [
      ['H', 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/KingGraph.html">King Graph</a>'],
      ['H', 'Wikipedia, <a href="https://en.wikipedia.org/wiki/King%27s_graph">King\'s graph</a>'],
    ],
    after: [
      ['H', 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/KingGraph.html">King Graph</a>.'],
      ['H', 'Wikipedia, <a href="https://en.wikipedia.org/wiki/King%27s_graph">King\'s graph</a>.'],
    ],
  },
  {
    rule: 'links-https',
    source: 'A004003 #148, #149, Michel Marcus',
    entry: 'A004003',
    before: [
      [
        'H',
        'M. Ciucu, <a href="http://dx.doi.org/10.1006/jcta.1996.2725">Enumeration of perfect matchings in graphs with reflective symmetry</a>, Journal of Combinatorial Theory, Series A, Volume 77, Issue 1, January 1997, Pages 67-97.',
      ],
      ['H', 'H. Cohn, <a href="http://arXiv.org/abs/math.CO/0008222">2-adic behavior of numbers of domino tilings</a>, arXiv:math/0008222 [math.CO], 2000.'],
    ],
    after: [
      [
        'H',
        'M. Ciucu, <a href="https://doi.org/10.1006/jcta.1996.2725">Enumeration of perfect matchings in graphs with reflective symmetry</a>, Journal of Combinatorial Theory, Series A, Volume 77, Issue 1, January 1997, Pages 67-97.',
      ],
      ['H', 'H. Cohn, <a href="https://arxiv.org/abs/math/0008222">2-adic behavior of numbers of domino tilings</a>, arXiv:math/0008222 [math.CO], 2000.'],
    ],
  },
  {
    rule: 'links-arxiv-label',
    source: 'A004003 #65 -> #66, Michel Marcus',
    entry: 'A004003',
    before: [['H', 'M. Aanjaneya and S. P. Pal, <a href="http://arXiv.org/abs/math.CO/0610925">Faultfree tromino tilings of rectangles</a>']],
    after: [['H', 'M. Aanjaneya and S. P. Pal, <a href="http://arXiv.org/abs/math.CO/0610925">Faultfree tromino tilings of rectangles</a>, arXiv:math/0610925 [math.CO], 2006.']],
  },
  {
    rule: 'links-authors',
    source: 'A004003 #139 -> #140, Michel Marcus',
    entry: 'A004003',
    before: [
      [
        'H',
        'Viet-Ha Nguyen, Kévin Perrot, Mathieu Vallet, <a href="https://doi.org/10.1016/j.tcs.2020.04.007">NP-completeness of the game Kingdomino(TM)</a>, Theoretical Computer Science (2020) Vol. 822, 23-35.',
      ],
    ],
    after: [
      [
        'H',
        'Viet-Ha Nguyen, Kévin Perrot, and Mathieu Vallet, <a href="https://doi.org/10.1016/j.tcs.2020.04.007">NP-completeness of the game Kingdomino(TM)</a>, Theoretical Computer Science (2020) Vol. 822, 23-35.',
      ],
    ],
  },
  {
    rule: 'links-order',
    source: 'A401988 #6 -> #8, Michel Marcus',
    entry: 'A401988',
    before: a401988(11, [A401988_BFILE, A401988_NOTES, A401988_FENDLEY]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
  },
  {
    rule: 'links-rec-index',
    source: 'A309117 #16 -> #17, Alois P. Heinz',
    entry: 'A309117',
    before: a309117(A309117_LENGTH, [['F', `${A309117_GF}.`]]),
    after: a309117(A309117_LENGTH, [
      ['H', A309117_REC],
      ['F', `${A309117_GF}.`],
    ]),
  },
  {
    rule: 'links-rec-index',
    source: 'A309117 #17, Alois P. Heinz: the order in two digits',
    entry: 'A309117',
    before: a309117(A309117_LENGTH, [
      ['H', A309117_REC.replace('order_08', 'order_8')],
      ['F', `${A309117_GF}.`],
    ]),
    after: a309117(A309117_LENGTH, [
      ['H', A309117_REC],
      ['F', `${A309117_GF}.`],
    ]),
  },
  {
    rule: 'links-placeholder',
    source: 'A004003 #122 -> #123, N. J. A. Sloane',
    entry: 'A004003',
    before: [['H', 'N. J. A. Sloane, <a href="/A004003/a004003_2.pdf">TITLE FOR LINK</a>']],
    after: [['H', 'N. J. A. Sloane, <a href="/A004003/a004003_2.pdf">Illustration for a(2) = 36</a> [Slide for an old talk]']],
  },
  {
    rule: 'links-notes-canonical',
    source: 'A401670 #3 -> #4, Jason Yuen; the page has moved again since',
    entry: 'A401670',
    before: [['H', 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/notes/torus.html">Tori and cylinders</a>.']],
    after: [['H', 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/notes/domicules/tori.html">Domicules: tilings of tori</a>.']],
  },
  {
    rule: 'links-mathworld',
    source: 'A401988 #9 -> #10, Andrew Howroyd',
    entry: 'A401988',
    before: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES, 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/PerfectMatching.html">Perfect Matching</a>.']),
  },
  {
    rule: 'bfile-link-text',
    source: 'A239264 #26 -> #27, Dawid Ryłko',
    entry: 'A239264',
    before: [['N', A239264_NAME], ['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Table of n, a(n) for n = 0..1034</a>']],
    after: [['N', A239264_NAME], ['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a>']],
  },
  {
    rule: 'bfile-link-author',
    source: 'A239264 #27 -> #29, Sean A. Irvine',
    entry: 'A239264',
    before: [['N', A239264_NAME], ['H', 'Alois P. Heinz and Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)']],
    after: [['N', A239264_NAME], ['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)']],
  },
  {
    rule: 'bfile-installed-name',
    source: 'A401673 #8 -> #9, OEIS Server',
    entry: 'A401673',
    before: [['H', 'Dawid Ryłko, <a href="/A401673/b401673_1.txt">Rows n = 0..10 of triangle, flattened</a>']],
    after: [['H', 'Dawid Ryłko, <a href="/A401673/b401673.txt">Rows n = 0..10 of triangle, flattened</a>']],
    options: { status: 'Approved' },
  },
  {
    rule: 'bfile-credit-kept',
    source: 'A239264 #35 -> #36, Dawid Ryłko',
    entry: 'A239264',
    before: [['H', 'Dawid Ryłko, <a href="/A239264/b239264_3.txt">Antidiagonals n = 0..46, flattened</a>']],
    after: [['H', 'Dawid Ryłko, <a href="/A239264/b239264_3.txt">Antidiagonals n = 0..46, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)']],
    options: { previous: [['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)']] },
  },
  {
    rule: 'extensions-unneeded',
    source: 'A239273 #34 -> #35, Stefano Spezia',
    entry: 'A239273',
    before: a239273([['E', 'a(10)-a(12) from _Dawid Ryłko_, Oct 15 2026']]),
    after: a239273(),
  },
  {
    rule: 'extensions-unneeded',
    source: 'SS "Extensions": nothing in this field for changes to the sequence one is creating',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['E', 'a(10)-a(11) from _Dawid Ryłko_, Nov 14 2026']]),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'signature-name',
    source: 'A239273 #47 -> #48, Alois P. Heinz',
    entry: 'A239273',
    before: [['H', 'Dawid Rylko, <a href="/A239273/b239273.txt">Table of n, a(n) for n = 0..12</a>']],
    after: [['H', 'Dawid Ryłko, <a href="/A239273/b239273.txt">Table of n, a(n) for n = 0..12</a>']],
  },
  {
    rule: 'signature-name',
    source: 'A239273 #41 -> #42 and A004003 #161, Michel Marcus: "you must sign with ~~~~"',
    entry: 'A239273',
    before: [['o', '(PARI) a(n) = T(2*n, 2*n); \\\\ T(h, w) defined in A239264. - Dawid Ryłko, Oct 15 2026']],
    after: [['o', '(PARI) a(n) = T(2*n, 2*n); \\\\ T(h, w) defined in A239264. - _Dawid Ryłko_, Oct 15 2026']],
  },
  {
    rule: 'signature-own-draft',
    source: 'SS "Programs": code by the sequence author in the original submission is not signed',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1]; \\\\ _Dawid Ryłko_, Nov 14 2026']]),
    after: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1];']]),
    options: { status: 'Proposed' },
  },
  {
    rule: 'double-space',
    source: 'A004003 #164 -> #165, Jason Yuen',
    entry: 'A004003',
    before: [
      ['H', 'P. W. Kasteleyn, <a href="https://doi.org/10.1063/1.1703953">Dimer statistics and phase transitions</a>, J. Mathematical Phys. 4 1963 287-293.  MR0153427 (27 #3394).'],
      ['t', 'a[n_] := Round[ N[ Product[ 2*Cos[(2i*Pi)/(2n+1)] + 2*Cos[(2j*Pi)/(2n+1)] + 4,  {i, 1, n}, {j, 1, n}], 300] ]; Table[a[n], {n, 0, 12}] (* _Jean-François Alcover_, Jan 04 2012, after Maple *)'],
    ],
    after: [
      ['H', 'P. W. Kasteleyn, <a href="https://doi.org/10.1063/1.1703953">Dimer statistics and phase transitions</a>, J. Mathematical Phys. 4 1963 287-293. MR0153427 (27 #3394).'],
      ['t', 'a[n_] := Round[ N[ Product[ 2*Cos[(2i*Pi)/(2n+1)] + 2*Cos[(2j*Pi)/(2n+1)] + 4, {i, 1, n}, {j, 1, n}], 300] ]; Table[a[n], {n, 0, 12}] (* _Jean-François Alcover_, Jan 04 2012, after Maple *)'],
    ],
  },
  {
    rule: 'formula-ie',
    source: 'A004003 #166 -> #167, Sean A. Irvine',
    entry: 'A004003',
    before: [['F', A004003_FORMULA]],
    after: [['F', A004003_FIXED]],
  },
  {
    rule: 'formula-commentary',
    source: 'A004003 #166 -> #167, Sean A. Irvine',
    entry: 'A004003',
    before: [['F', A004003_FORMULA]],
    after: [['F', A004003_FIXED]],
  },
  {
    rule: 'formula-program',
    source: 'A402163 #7 -> #8, Andrew Howroyd',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['F', A402163_FORMULA]]),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'comment-provenance',
    source: 'A402163 #7 -> #8, Andrew Howroyd',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['C', A402163_PROVENANCE]]),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'comment-future-proof',
    source: 'A401669 #2 -> #6, Sean A. Irvine',
    entry: 'A401669',
    before: [
      [
        'C',
        'The digits come from row transfer matrices on cylinders of circumference w <= 25, split by the parity of the number of dimers crossing a loop around the cylinder, and extrapolated in w. This gives s = 0.5655119110413253 +- 6*10^-16. The error bar is supported by several extrapolation models with backtests and by an extended-precision check of the rounding, but it is not a proof, so only the 14 digits shared by both ends of the interval are listed.',
      ],
      [
        'C',
        'Rigorous bounds are 0.545343749727 <= s <= 0.582767477484. They come from computer-assisted Collatz-Wielandt certificates on free strips of width 24, and the upper bound also weights the runs of cells whose dimers cross a cut. These bounds fix only the first digit.',
      ],
      ['C', 'The entropy per dimer is 2*s = 1.1310238220826... and the growth constant per site is exp(s) = 1.76034869404197..., both truncated to the digits valid for the whole interval.'],
      [
        'C',
        "For h*w even, the h X w king's graph has a Pfaffian orientation if and only if min(h,w) <= 2 (proved in the Zenodo preprint), so Kasteleyn's method, which gives Catalan/Pi (A143233) for dominoes, does not apply.",
      ],
    ],
    after: [
      [
        'C',
        'In Ryłko (2026), the digits come from row transfer matrices on cylinders of circumference w <= 25, split by the parity of the number of dimers crossing a loop around the cylinder, and extrapolated in w. This gives s = 0.5655119110413253 +- 6*10^-16. The error bar is supported by several extrapolation models with backtests and by an extended-precision check of the rounding, but it is not a proof.',
      ],
      [
        'C',
        'Rigorous bounds are 0.545343749727 <= s <= 0.582767477484 (Ryłko (2026)). They come from computer-assisted Collatz-Wielandt certificates on free strips of width 24, and the upper bound also weights the runs of cells whose dimers cross a cut.',
      ],
      ['C', 'The entropy per dimer is 2*s = 1.1310238220826... and the growth constant per site is exp(s) = 1.76034869404197....'],
      [
        'C',
        "For h*w even, the h X w king's graph has a Pfaffian orientation if and only if min(h,w) <= 2 (Ryłko (2026)), so Kasteleyn's method, which gives Catalan/Pi (A143233) for dominoes, does not apply.",
      ],
    ],
  },
  {
    rule: 'program-shared',
    source: 'A239273 #36 -> #37, Andrew Howroyd',
    entry: 'A239273',
    before: [
      ['o', '(PARI) \\\\ broken-profile DP over the cells in row-major order.'],
      ['o', A239264_T],
      ['o', 'a(n) = T(2*n, 2*n); \\\\ _Dawid Ryłko_, Oct 15 2026'],
    ],
    after: [['o', '(PARI) a(n) = T(2*n, 2*n); \\\\ T(h, w) defined in A239264. - _Dawid Ryłko_, Oct 15 2026']],
    options: {
      others: [
        {
          entry: 'A239264',
          rows: [
            ['o', '(PARI) \\\\ broken-profile DP over the cells in row-major order.'],
            ['o', `${A239264_T} \\\\ _Dawid Ryłko_, Oct 15 2026`],
          ],
        },
      ],
    },
  },
  {
    rule: 'non-ascii',
    source: 'SS "Non-ASCII characters": <= and >= not the Unicode signs',
    entry: 'A401669',
    before: [['C', 'Rigorous bounds are 0.545343749727 ≤ s ≤ 0.582767477484 (Ryłko (2026)).']],
    after: [['C', 'Rigorous bounds are 0.545343749727 <= s <= 0.582767477484 (Ryłko (2026)).']],
  },
  {
    rule: 'spelling',
    source: 'SS "Spelling and notation": neighbor (not neighbour)',
    entry: 'A402163',
    before: [['e', A402163_EXAMPLE.replace('row neighbor', 'row neighbour')]],
    after: [['e', A402163_EXAMPLE]],
  },
  {
    rule: 'common-mistakes',
    source: 'SS "Common mistakes in English": "counts the number of" is wrong',
    entry: 'A402163',
    before: [['C', "a(n) counts the number of perfect matchings of the king's graph on the 2n X 2n cylinder."]],
    after: [['C', "a(n) is the number of perfect matchings of the king's graph on the 2n X 2n cylinder."]],
  },
  {
    rule: 'references-online',
    source: 'A004003 #72 -> #73, Michel Marcus',
    entry: 'A004003',
    before: [
      ['D', 'Laura Florescu, Daniela Morar, David Perkinson, Nicholas Salter, Tianyuan Xu, Sandpiles and Dominos, Electronic Journal of Combinatorics, Volume 22(1), 2015.'],
      ['D', 'Pachter, Combinatorial approaches and conjectures ..., Elec. J. Comb. 4 (1997) #R29.'],
    ],
    after: [['D', 'Darko Veljan, Kombinatorika s teorijom grafova (Croatian) (Combinatorics with Graph Theory) mentions the value 12988816 = 2^4*901^2 for the 8 X 8 case on page 4.']],
  },
];

module.exports = { CASES };
