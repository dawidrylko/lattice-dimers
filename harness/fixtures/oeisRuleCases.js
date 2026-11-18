const fs = require('fs');
const path = require('path');
const { parseBFile } = require('../../oeis/editorRules');

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
const A401988_FENDLEY_ARXIV =
  'Paul Fendley, R. Moessner and S. L. Sondhi, <a href="https://arxiv.org/abs/cond-mat/0206159">Classical dimers on the triangular lattice</a>, arXiv:cond-mat/0206159 [cond-mat.stat-mech], 2002-3.';
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
const A401669_NAME =
  "Decimal expansion of the entropy per site of the dimer coverings (perfect matchings) of the king's graph (square lattice with both diagonals), i.e., of domicule tilings.";
const PERFECT_MATCHING = 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/PerfectMatching.html">Perfect Matching</a>.';
const KING_GRAPH = 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/KingGraph.html">King Graph</a>.';
const A401673_BFILE = parseBFile(fs.readFileSync(path.join(__dirname, '..', '..', 'oeis', 'A401673', 'b401673.txt'), 'utf-8'));
const A239273_LIVE = [
  ['N', 'Number of domicule tilings of a 2n X 2n square grid.'],
  ['Y', 'Even bisection of main diagonal of A239264.'],
  ['Y', 'Cf. A004003, A243510, A243424, A220638.'],
];
const PACHTER_TITLE = 'Combinatorial Approaches and Conjectures for 2-Divisibility Problems Concerning Domino Tilings of Polyominoes';

const STYLE_SHEET = 'constructed: the pair is written for the test';

function constructed(rule, entry, type, before, after, section, expect) {
  return { rule, source: `SS "${section}"; ${STYLE_SHEET}`, entry, before: [[type, before]], after: [[type, after]], ...(expect ? { expect } : {}) };
}

const STYLE_SHEET_CASES = [
  constructed('common-mistakes', 'A401669', 'C', 'The bound holds for every width greater or equal to 2.', 'The bound holds for every width greater than or equal to 2.', 'Common mistakes in English', 'greater than or equal to'),
  constructed('common-mistakes', 'A401669', 'C', 'The bound holds for every width less or equal to 20.', 'The bound holds for every width less than or equal to 20.', 'Common mistakes in English', 'less than or equal to'),
  constructed('common-mistakes', 'A401669', 'C', 'The transfer matrix allows to compute s to 12 digits.', 'The transfer matrix allows one to compute s to 12 digits.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'The amount of tilings grows like 9.6^(n^2).', 'The number of tilings grows like 9.6^(n^2).', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'Let k be integer.', 'Let k be an integer.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'The tiles come in couples of cells.', 'The tiles come in pairs of cells.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'Except a(0) = 1, all terms are odd.', 'Except for a(0) = 1, all terms are odd.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'Every tiling fulfills the parity rule.', 'Every tiling satisfies the parity rule.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'The rows and columns are respectfully given by A239264 and A004003.', 'The rows and columns are respectively given by A239264 and A004003.', 'Common mistakes in English'),
  constructed('common-mistakes', 'A402163', 'C', 'The tiles meet in triplets of cells.', 'The tiles meet in triples of cells.', 'Common mistakes in English'),
  constructed('spelling', 'A402163', 'C', 'The same count holds on a decagon.', 'The same count holds on a 10-gon.', 'Spelling and notation'),
  constructed('spelling', 'A402163', 'C', 'The same count holds on a dodecagon.', 'The same count holds on a 12-gon.', 'Spelling and notation'),
  constructed('spelling', 'A402163', 'C', 'The terms grow like fibonacci numbers.', 'The terms grow like Fibonacci numbers.', 'Spelling and notation'),
  constructed('spelling', 'A402163', 'F', 'g.c.d.(a(n), a(n+1)) = 1.', 'gcd(a(n), a(n+1)) = 1.', 'Spelling and notation'),
  {
    rule: 'limit-notation',
    source: 'A239273 #54 -> #55, Alois P. Heinz, 2026-11-18',
    entry: 'A239273',
    before: [['F', 'lim_{n->oo} log(a(n))/(4*n^2) = A401669. - _Dawid Ryłko_, Nov 18 2026']],
    after: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. - _Dawid Ryłko_, Nov 18 2026']],
    expect: 'Limit_',
  },
  constructed('limit-notation', 'A401669', 'F', 's = Limit_{n->oo} log(A239273(n))/(4*n^2).', 's = lim_{n->oo} log(A239273(n))/(4*n^2).', 'Spelling and notation', 'lim_'),
  constructed('limit-notation', 'A401669', 'C', 'The limit exists. lim_{w->oo} log(lambda_w)/w = s.', 'The limit exists. Limit_{w->oo} log(lambda_w)/w = s.', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ 2^(1/8) * (Sqrt[2] - 1)^(n - 1/2).', 'a(n) ~ 2^(1/8) * (sqrt(2) - 1)^(n - 1/2).', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ 2*pi*n.', 'a(n) ~ 2*Pi*n.', 'Spelling and notation', 'Pi'),
  constructed('math-notation', 'A402345', 'F', 'Sum_{n>=1} 1/n^2 = pi^2/6.', 'Sum_{n>=1} 1/n^2 = Pi^2/6.', 'Spelling and notation', 'Pi'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ c^n, where pi = 3.14159...', 'a(n) ~ c^n, where Pi = 3.14159...', 'Spelling and notation', 'Pi'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ exp(2*G*n*(2*n+1)/pi).', 'a(n) ~ exp(2*G*n*(2*n+1)/Pi).', 'Spelling and notation', 'Pi'),
  constructed('math-notation', 'A239273', 'F', 'a(n) ~ c * d**(n^2) / f^n.', 'a(n) ~ c * d^(n^2) / f^n.', 'Spelling and notation'),
  constructed('math-notation', 'A239273', 'F', 'a(n) = c * d^(n^2) * (1 +/- 1/n).', 'a(n) = c * d^(n^2) * (1 +- 1/n).', 'Spelling and notation'),
  constructed('math-notation', 'A239273', 'C', 'Each a[n] is odd for n > 0.', 'Each a(n) is odd for n > 0.', 'Spelling and notation'),
  constructed('math-notation', 'A401673', 'F', 'sum_{k=0..n^2} T(n,k) = A239273(n).', 'Sum_{k=0..n^2} T(n,k) = A239273(n).', 'Spelling and notation'),
  constructed('math-notation', 'A401673', 'F', 'T(n,k) = 0 for k > ceil(n^2/2).', 'T(n,k) = 0 for k > ceiling(n^2/2).', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ GAMMA(1/4) * c^n.', 'a(n) ~ Gamma(1/4) * c^n.', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ Zeta(3) * c^n.', 'a(n) ~ zeta(3) * c^n.', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n)^(1/n) tends to Inf.', 'a(n)^(1/n) tends to infinity.', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) \\le 9^(n^2).', 'a(n) <= 9^(n^2).', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) grth 0.', 'a(n) > 0.', 'Spelling and notation'),
  constructed('math-notation', 'A309117', 'F', 'G.f.: 1/(1-z)/(1-z^2).', 'G.f.: 1/((1-z)*(1-z^2)).', 'Spelling and notation'),
  constructed('math-notation', 'A309117', 'F', 'a(n) = 1/6n^3 + O(n^2).', 'a(n) = n^3/6 + O(n^2).', 'Spelling and notation'),
  constructed('math-notation', 'A402345', 'F', 'a(n) ~ E^(c*n^2).', 'a(n) ~ e^(c*n^2).', 'Spelling and notation'),
  constructed('math-notation', 'A402163', 'F', 'a(n) % 8 = 1 for n > 0.', 'a(n) mod 8 = 1 for n > 0.', 'Spelling and notation'),
  constructed('math-notation', 'A402163', 'C', 'The board has Floor(n/2) rows of each kind.', 'The board has floor(n/2) rows of each kind.', 'Spelling and notation', 'floor'),
  constructed('math-notation', 'A402163', 'C', 'The counts grow like the Tribonacci numbers.', 'The counts grow like the tribonacci numbers.', 'Spelling and notation'),
  constructed('data-format', 'A239273', 'S', '1, 3, 280', '1, 3, 280, 3037561', 'Data', 'at least 4'),
  {
    rule: 'data-format',
    source: `KW: bref marks a sequence too short for analysis; ${STYLE_SHEET}`,
    entry: 'A239273',
    before: [['S', '1, 3, 280'], ['K', 'nonn']],
    after: [['S', '1, 3, 280'], ['K', 'nonn,bref']],
  },
  {
    rule: 'data-format',
    source: `KW: fini and full give the whole sequence, which may have fewer than 4 terms; ${STYLE_SHEET}`,
    entry: 'A239273',
    before: [['S', '1, 3, 280'], ['K', 'nonn']],
    after: [['S', '1, 3, 280'], ['K', 'nonn,fini,full']],
  },
  constructed('data-format', 'A239273', 'S', '1,\t3, 280, 3037561', '1, 3, 280, 3037561', 'Data', 'tab'),
  constructed('keyword-consistency', 'A239273', 'K', 'nonn,foo', 'nonn', 'Keywords', 'foo'),
  {
    rule: 'links-order',
    source: `SS "Links": index entries are placed at the end; ${STYLE_SHEET}`,
    entry: 'A239273',
    before: [
      ['S', '1, 3, 280, 3037561'],
      ['H', '<a href="/wiki/Index_to_OEIS:_Section_Ki">Index entries for sequences related to the king\'s graph</a>.'],
      ['H', 'Wikipedia, <a href="https://en.wikipedia.org/wiki/King%27s_graph">King\'s graph</a>.'],
    ],
    after: [
      ['S', '1, 3, 280, 3037561'],
      ['H', 'Wikipedia, <a href="https://en.wikipedia.org/wiki/King%27s_graph">King\'s graph</a>.'],
      ['H', '<a href="/wiki/Index_to_OEIS:_Section_Ki">Index entries for sequences related to the king\'s graph</a>.'],
    ],
  },
  {
    rule: 'extensions-unneeded',
    source: `SS "Extensions": comments are signed in place, so "Added a comment" is not needed; ${STYLE_SHEET}`,
    entry: 'A239264',
    before: [['C', 'A comment. - _Someone Else_, Nov 18 2026'], ['E', 'Added a comment. - _Someone Else_, Nov 18 2026']],
    after: [['C', 'A comment. - _Someone Else_, Nov 18 2026']],
  },
];

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
    source: 'SS "Spelling and notation": n X n (not n x n), constructed',
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
    rule: 'links-arxiv-version',
    source: 'A401988 #12 -> #13, Vaclav Kotesovec',
    entry: 'A401988',
    before: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_FENDLEY_ARXIV, A401988_NOTES]),
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed after review: an arXiv line of another work whose title contains this one does not count',
    entry: 'A401988',
    before: a401988(11, [
      A401988_BFILE,
      A401988_FENDLEY,
      'John Doe, <a href="https://arxiv.org/abs/2601.00001">Classical dimers on the triangular lattice revisited</a>, arXiv:2601.00001 [cond-mat.stat-mech], 2026.',
    ]),
    after: a401988(11, [
      A401988_BFILE,
      A401988_FENDLEY,
      A401988_FENDLEY_ARXIV,
      'John Doe, <a href="https://arxiv.org/abs/2601.00001">Classical dimers on the triangular lattice revisited</a>, arXiv:2601.00001 [cond-mat.stat-mech], 2026.',
    ]),
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed after review: the text before the link of another work whose title contains this one does not count',
    entry: 'A401988',
    before: a401988(11, [
      A401988_BFILE,
      A401988_FENDLEY,
      'John Doe, Classical dimers on the triangular lattice revisited, <a href="https://arxiv.org/abs/2601.00001">arXiv:2601.00001</a> [cond-mat.stat-mech], 2026.',
    ]),
    after: a401988(11, [
      A401988_BFILE,
      A401988_FENDLEY,
      A401988_FENDLEY_ARXIV,
      'John Doe, Classical dimers on the triangular lattice revisited, <a href="https://arxiv.org/abs/2601.00001">arXiv:2601.00001</a> [cond-mat.stat-mech], 2026.',
    ]),
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
    source: 'SS "Extensions": nothing in this field for changes to the sequence one is creating, constructed',
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
    source: 'SS "Programs": code by the sequence author in the original submission is not signed, constructed',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1]; \\\\ _Dawid Ryłko_, Nov 14 2026']]),
    after: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1];']]),
    options: { status: 'Proposed' },
  },
  {
    rule: 'signature-own-draft',
    source: 'constructed: ~~~~ typed into the edit form writes the same signature',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1]; ~~~~']]),
    after: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1];']]),
    options: { status: 'Proposed' },
  },
  {
    rule: 'double-space',
    source: 'A004003 #164 -> #165, Jason Yuen: LINKS',
    entry: 'A004003',
    before: [['H', 'P. W. Kasteleyn, <a href="https://doi.org/10.1063/1.1703953">Dimer statistics and phase transitions</a>, J. Mathematical Phys. 4 1963 287-293.  MR0153427 (27 #3394).']],
    after: [['H', 'P. W. Kasteleyn, <a href="https://doi.org/10.1063/1.1703953">Dimer statistics and phase transitions</a>, J. Mathematical Phys. 4 1963 287-293. MR0153427 (27 #3394).']],
  },
  {
    rule: 'double-space',
    source: 'A004003 #164 -> #165, Jason Yuen: MATHEMATICA',
    entry: 'A004003',
    before: [['t', 'a[n_] := Round[ N[ Product[ 2*Cos[(2i*Pi)/(2n+1)] + 2*Cos[(2j*Pi)/(2n+1)] + 4,  {i, 1, n}, {j, 1, n}], 300] ]; Table[a[n], {n, 0, 12}] (* _Jean-François Alcover_, Jan 04 2012, after Maple *)']],
    after: [['t', 'a[n_] := Round[ N[ Product[ 2*Cos[(2i*Pi)/(2n+1)] + 2*Cos[(2j*Pi)/(2n+1)] + 4, {i, 1, n}, {j, 1, n}], 300] ]; Table[a[n], {n, 0, 12}] (* _Jean-François Alcover_, Jan 04 2012, after Maple *)']],
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
    source: 'SS "Non-ASCII characters": <= and >= not the Unicode signs, constructed',
    entry: 'A401669',
    before: [['C', 'Rigorous bounds are 0.545343749727 ≤ s ≤ 0.582767477484 (Ryłko (2026)).']],
    after: [['C', 'Rigorous bounds are 0.545343749727 <= s <= 0.582767477484 (Ryłko (2026)).']],
  },
  {
    rule: 'spelling',
    source: 'SS "Spelling and notation": neighbor (not neighbour), constructed',
    entry: 'A402163',
    before: [['e', A402163_EXAMPLE.replace('row neighbor', 'row neighbour')]],
    after: [['e', A402163_EXAMPLE]],
  },
  {
    rule: 'common-mistakes',
    source: 'SS "Common mistakes in English": "counts the number of" is wrong, constructed',
    entry: 'A402163',
    before: [['C', "a(n) counts the number of perfect matchings of the king's graph on the 2n X 2n cylinder."]],
    after: [['C', "a(n) is the number of perfect matchings of the king's graph on the 2n X 2n cylinder."]],
  },
  ...STYLE_SHEET_CASES,
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
  {
    rule: 'data-rows',
    source: 'constructed from A401673: rows 0..3 while row 4 still fits, as Alois P. Heinz filled it (#5)',
    entry: 'A401673',
    before: a401673(A401673_DATA.split(',').slice(0, 18).join(','), 'nonn,tabf'),
    after: a401673(A401673_DATA, 'nonn,tabf'),
    options: { bFile: A401673_BFILE },
    expect: 'Row 4 still fits',
  },
  {
    rule: 'keyword-consistency',
    source: 'KW, constructed: a negative term with nonn',
    entry: 'A401988',
    before: [['S', '1,-2,3'], ['N', 'Constructed.'], ['K', 'nonn'], ['O', '0,1']],
    after: [['S', '1,-2,3'], ['N', 'Constructed.'], ['K', 'sign'], ['O', '0,1']],
    expect: 'use sign',
  },
  {
    rule: 'keyword-consistency',
    source: 'KW, constructed: sign without a negative term',
    entry: 'A402163',
    before: a402163(A402163_DATA, [], 'sign'),
    after: a402163(A402163_DATA),
    expect: 'use nonn',
  },
  {
    rule: 'keyword-consistency',
    source: 'KW, on A401669 without cons',
    entry: 'A401669',
    before: [['S', '5,6,5,5,1,1,9,1,1,0,4,1,3,2'], ['N', A401669_NAME], ['K', 'nonn'], ['O', '0,1']],
    after: [['S', '5,6,5,5,1,1,9,1,1,0,4,1,3,2'], ['N', A401669_NAME], ['K', 'nonn,cons'], ['O', '0,1']],
    expect: 'cons',
  },
  {
    rule: 'capital-x',
    source: 'SS "Spelling and notation", constructed: 2nX2n',
    entry: 'A402163',
    before: [['N', 'Number of domicule tilings of a 2nX2n cylindrical grid.']],
    after: [['N', A402163_NAME]],
  },
  {
    rule: 'capital-x',
    source: 'SS "Spelling and notation", constructed: n by n',
    entry: 'A402163',
    before: [['C', 'On the n by n cylinder the count is odd.']],
    after: [['C', 'On the n X n cylinder the count is odd.']],
  },
  {
    rule: 'capital-x',
    source: 'SS "Spelling and notation", constructed: n-by-n',
    entry: 'A402163',
    before: [['C', 'On the n-by-n cylinder the count is odd.']],
    after: [['C', 'On the n X n cylinder the count is odd.']],
  },
  {
    rule: 'line-period',
    source: 'constructed: a line ending with a colon continues on the next line of its field',
    entry: 'A401673',
    before: [['C', 'The first rows are:']],
    after: [
      ['C', 'The first rows are:'],
      ['C', '1; 2, 1.'],
    ],
  },
  {
    rule: 'line-period',
    source: 'constructed: the edit form signs a line typed with " - ~~~~" at its end, so the period goes before it',
    entry: 'A239273',
    before: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669 - ~~~~']],
    after: [
      ['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. - ~~~~'],
      ['F', 'a(n) ~ c * d^(n^2) / f^n, where c = 1.43791803..., d = exp(4*A401669) = 9.6027320273133..., f = 6.93196613224... (conjectured). - ~~~~'],
    ],
  },
  {
    rule: 'signature-dash',
    source: 'SS "Comments": ~~~~ writes the name and the date, the dash before it is typed, constructed',
    entry: 'A239273',
    before: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. ~~~~']],
    after: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. - ~~~~']],
    expect: ' - ~~~~',
  },
  {
    rule: 'signature-dash',
    source: 'SS "Signing your name when you contribute to an existing sequence": examples too, constructed',
    entry: 'A239273',
    before: [['e', 'a(1) = 3: the three tilings drawn below. ~~~~']],
    after: [['e', 'a(1) = 3: the three tilings drawn below. - ~~~~']],
  },
  {
    rule: 'crossrefs-form',
    source: 'SS "Cross-references", constructed: an A-number twice',
    entry: 'A309117',
    before: [
      ['Y', 'Cf. A011900, A307349.'],
      ['Y', 'Cf. A011900.'],
    ],
    after: [['Y', 'Cf. A011900, A307349.']],
    expect: 'appears twice',
  },
  {
    rule: 'crossrefs-form',
    source: 'SS "Cross-references", constructed: the entry itself',
    entry: 'A309117',
    before: [['Y', 'Cf. A011900, A309117.']],
    after: [['Y', 'Cf. A011900.']],
    expect: 'the entry itself',
  },
  {
    rule: 'crossrefs-form',
    source: 'SS "Cross-references", constructed: a link',
    entry: 'A309117',
    before: [['Y', 'Cf. <a href="/A011900">A011900</a>.']],
    after: [['Y', 'Cf. A011900.']],
    expect: 'A link in CROSSREFS',
  },
  {
    rule: 'crossrefs-reverse',
    source: 'A239273 #45 -> #46, Alois P. Heinz',
    entry: 'A401673',
    before: [['Y', 'Row sums give A239273.']],
    after: [['Y', 'Row sums give A239273.']],
    options: { mode: 'draft', others: [{ entry: 'A239273', live: true, rows: A239273_LIVE }] },
    afterOptions: { mode: 'draft', others: [{ entry: 'A239273', live: true, rows: [...A239273_LIVE, ['Y', 'Row sums of A401673.']] }] },
  },
  {
    rule: 'links-https',
    source: 'A309117 #13, Sean A. Irvine: http',
    entry: 'A309117',
    before: [['H', 'Dawid Ryłko, <a href="http://dawidrylko.github.io/lattice-dimers/">Lattice dimers</a>.']],
    after: [['H', 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/">Lattice dimers</a>.']],
    expect: 'Use https',
  },
  {
    rule: 'links-https',
    source: 'A004003 #149, Michel Marcus: dx.doi.org',
    entry: 'A004003',
    before: [['H', 'M. Ciucu, <a href="https://dx.doi.org/10.1006/jcta.1996.2725">Enumeration of perfect matchings in graphs with reflective symmetry</a>, J. Combin. Theory Ser. A 77 (1997), 67-97.']],
    after: [['H', 'M. Ciucu, <a href="https://doi.org/10.1006/jcta.1996.2725">Enumeration of perfect matchings in graphs with reflective symmetry</a>, J. Combin. Theory Ser. A 77 (1997), 67-97.']],
    expect: 'Link the DOI',
  },
  {
    rule: 'links-https',
    source: 'A004003 #148, Michel Marcus: math.CO/',
    entry: 'A004003',
    before: [['H', 'H. Cohn, <a href="https://arxiv.org/abs/math.CO/0008222">2-adic behavior of numbers of domino tilings</a>, arXiv:math/0008222 [math.CO], 2000.']],
    after: [['H', 'H. Cohn, <a href="https://arxiv.org/abs/math/0008222">2-adic behavior of numbers of domino tilings</a>, arXiv:math/0008222 [math.CO], 2000.']],
    expect: 'Link arXiv',
  },
  {
    rule: 'links-order',
    source: 'SS "Links", constructed: the b-file second',
    entry: 'A401988',
    before: a401988(11, [A401988_FENDLEY, A401988_BFILE, A401988_NOTES]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES]),
    expect: 'b-file link first',
  },
  {
    rule: 'links-order',
    source: 'SS "Links", constructed: an index entry before a link',
    entry: 'A401988',
    before: a401988(11, [A401988_BFILE, '<a href="/index/Do#domino">Index entries for sequences related to dominoes</a>.', A401988_FENDLEY, A401988_NOTES]),
    after: a401988(11, [A401988_BFILE, A401988_FENDLEY, A401988_NOTES, '<a href="/index/Do#domino">Index entries for sequences related to dominoes</a>.']),
    expect: 'index entries last',
  },
  {
    rule: 'links-rec-index',
    source: 'A309117 #17, Alois P. Heinz, constructed: a wrong signature',
    entry: 'A309117',
    before: a309117(A309117_LENGTH, [
      ['H', A309117_REC.replace('2,-1)', '2,1)')],
      ['F', `${A309117_GF}.`],
    ]),
    after: a309117(A309117_LENGTH, [
      ['H', A309117_REC],
      ['F', `${A309117_GF}.`],
    ]),
    expect: 'signature fails',
  },
  {
    rule: 'links-title-truncated',
    source: 'A004003 #150 -> #151, Michel Marcus',
    entry: 'A004003',
    before: [['H', 'Lior Pachter, <a href="https://doi.org/10.37236/1314">Combinatorial approaches and conjectures ...</a>, Elec. J. Comb. 4 (1997) #R29.']],
    after: [['H', `Lior Pachter, <a href="https://doi.org/10.37236/1314">${PACHTER_TITLE}</a>, Elec. J. Comb. 4 (1997) #R29.`]],
  },
  {
    rule: 'links-notes-canonical',
    source: 'constructed: a page the site does not have',
    entry: 'A401670',
    before: [['H', 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/notes/domicules/nowhere.html">Nowhere</a>.']],
    after: [['H', 'Dawid Ryłko, <a href="https://dawidrylko.github.io/lattice-dimers/notes/domicules/tori.html">Domicules: tilings of tori</a>.']],
    expect: 'is not a page',
  },
  {
    rule: 'links-mathworld',
    source: "A239264 #40 -> #41, Andrew Howroyd: King Graph, constructed on the name of A401669, which says king's graph",
    entry: 'A401669',
    before: [['S', '5,6,5,5'], ['N', A401669_NAME], ['H', PERFECT_MATCHING]],
    after: [['S', '5,6,5,5'], ['N', A401669_NAME], ['H', KING_GRAPH], ['H', PERFECT_MATCHING]],
    expect: 'KingGraph',
  },
  {
    rule: 'bfile-link-author',
    source: 'A004003 #156, Alois P. Heinz: only a credit follows </a>; constructed tail',
    entry: 'A239264',
    before: [['N', A239264_NAME], ['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a>, computed with PARI']],
    after: [['N', A239264_NAME], ['H', 'Dawid Ryłko, <a href="/A239264/b239264_2.txt">Antidiagonals n = 0..44, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)']],
    expect: 'After </a>',
  },
  {
    rule: 'example-aligned',
    source: 'A401673 #5 -> #6, Alois P. Heinz',
    entry: 'A401673',
    before: [
      ['e', 'Triangle begins:'],
      ['e', '  1;'],
      ['e', '  2, 1;'],
      ['e', '  36, 126, 105, 12, 1;'],
      ['e', '  6728, 84132, 413932, 934213, 1000638, 491689, 99554, 6638, 36, 1;'],
      ['e', '  ...'],
    ],
    after: [
      ['e', 'Triangle begins:'],
      ['e', '     1;'],
      ['e', '     2,     1;'],
      ['e', '    36,   126,    105,     12,       1;'],
      ['e', '  6728, 84132, 413932, 934213, 1000638, 491689, 99554, 6638, 36, 1;'],
      ['e', '  ...'],
    ],
  },
  {
    rule: 'links-authors',
    source: 'constructed: Jr. joins the name before it, so three authors still want "and"',
    entry: 'A004003',
    before: [['H', 'John Doe, Jr., Mary Roe, Ann Poe, <a href="https://doi.org/10.37236/1314">A constructed title</a>, 2026.']],
    after: [['H', 'John Doe, Jr., Mary Roe, and Ann Poe, <a href="https://doi.org/10.37236/1314">A constructed title</a>, 2026.']],
  },
  {
    rule: 'links-title-truncated',
    source: 'constructed: the one-character ellipsis and a space before </a>',
    entry: 'A004003',
    before: [['H', 'Lior Pachter, <a href="https://doi.org/10.37236/1314">Combinatorial approaches and conjectures … </a>, Elec. J. Comb. 4 (1997) #R29.']],
    after: [['H', `Lior Pachter, <a href="https://doi.org/10.37236/1314">${PACHTER_TITLE}</a>, Elec. J. Comb. 4 (1997) #R29.`]],
  },
  {
    rule: 'formula-program',
    source: 'constructed: "see PROG" points to the program as "see PARI program" does',
    entry: 'A402163',
    before: a402163(A402163_DATA, [['F', 'a(n) = (M_{2n}^(2n))[0,0]; see PROG.']]),
    after: a402163(A402163_DATA),
  },
  {
    rule: 'example-aligned',
    source: 'constructed: rows that each end with a comma are rows, not wrapped lines',
    entry: 'A401673',
    before: [
      ['e', '  1,'],
      ['e', '  2, 1,'],
      ['e', '  36, 126, 105,'],
    ],
    after: [
      ['e', '   1,'],
      ['e', '   2,   1,'],
      ['e', '  36, 126, 105,'],
    ],
  },
  {
    rule: 'example-aligned',
    source: 'constructed: two rows are already a table',
    entry: 'A401673',
    before: [
      ['e', '  1;'],
      ['e', '  36, 126;'],
    ],
    after: [
      ['e', '   1;'],
      ['e', '  36, 126;'],
    ],
  },
];

const CLEAN = [
  {
    rule: 'signature-dash',
    source: 'SS "Programs": a program is signed inside its comment, "\\\\ ~~~~", with no dash',
    entry: 'A239273',
    rows: [['o', '(PARI) a(n) = T(2*n, 2*n); \\\\ ~~~~']],
  },
  {
    rule: 'signature-dash',
    source: 'SS "Signing your name when you contribute to an existing sequence": a block opens with "From ~~~~: (Start)"',
    entry: 'A239273',
    rows: [
      ['C', 'From ~~~~: (Start)'],
      ['C', 'The first rows are 1 and 2, 1. (End)'],
    ],
  },
  {
    rule: 'signature-dash',
    source: 'constructed: the tilde of an asymptotic formula is not a signature',
    entry: 'A239273',
    rows: [['F', 'a(n) ~ c * d^n. - ~~~~']],
  },
  {
    rule: 'line-period',
    source: 'constructed: ~~~~ typed without the dash is left to signature-dash',
    entry: 'A239273',
    rows: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. ~~~~']],
  },
  {
    rule: 'line-period',
    source: 'SS "Signing your name when you contribute to an existing sequence": "From ~~~~: (Start)" opens a block that "(End)" closes',
    entry: 'A239273',
    rows: [
      ['C', 'From _Dawid Ryłko_, Nov 18 2026: (Start)'],
      ['C', 'The first rows are 1 and 2, 1.'],
      ['C', 'Each row sums to a term of A239273. (End)'],
      ['F', 'From ~~~~: (Start)'],
      ['F', 'a(0) = 1.'],
      ['F', '(End)'],
    ],
  },
  {
    rule: 'comment-provenance',
    source: 'narrowed after review: "agree with" and "checked by" describe the mathematics',
    entry: 'A402163',
    rows: [
      ['C', 'The first terms agree with the estimate exp(4*s*n^2), where s = A401669.'],
      ['C', 'a(1) = 9 is checked by hand in EXAMPLE.'],
    ],
  },
  {
    rule: 'comment-future-proof',
    source: 'narrowed after review: a cited paper is not a self-reference',
    entry: 'A401988',
    rows: [['C', 'The paper by Fendley, Moessner and Sondhi gives the entropy of the triangular lattice.']],
  },
  {
    rule: 'formula-commentary',
    source: 'narrowed after review: only a comparison with "unlike" is commentary',
    entry: 'A239273',
    rows: [['F', 'a(n) = T(2n, 2n), T as in A239264; this gives a(1) = 3.']],
  },
  {
    rule: 'formula-program',
    source: 'narrowed after review: a formula that only mentions a program stands on its own',
    entry: 'A239273',
    rows: [['F', 'a(n) = A239264(2n, 2n); the PARI program of A239264 computes the whole array.']],
  },
  {
    rule: 'links-arxiv-label',
    source: 'narrowed after review: the identifier as the link text',
    entry: 'A004003',
    rows: [['H', 'Henry Cohn, 2-adic behavior of numbers of domino tilings, <a href="https://arxiv.org/abs/math/0008222">arXiv:math/0008222</a> [math.CO], 2000.']],
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed: a Zenodo record and an arXiv DOI are open',
    entry: 'A401988',
    rows: a401988(11, [
      A401988_BFILE,
      'Dawid Ryłko, <a href="https://doi.org/10.5281/zenodo.23686056">The dimer entropy of the king\'s graph</a>, Zenodo preprint, 2026.',
      'Henry Cohn, <a href="https://doi.org/10.48550/arXiv.math/0008222">2-adic behavior of numbers of domino tilings</a>, 2000.',
    ]),
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed: the arXiv version with its identifier as the link text and the title before it',
    entry: 'A401988',
    rows: a401988(11, [
      A401988_BFILE,
      A401988_FENDLEY,
      'Paul Fendley, R. Moessner and S. L. Sondhi, Classical dimers on the triangular lattice, <a href="https://arxiv.org/abs/cond-mat/0206159">arXiv:cond-mat/0206159</a> [cond-mat.stat-mech], 2002.',
    ]),
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed after review: the arXiv version linked on the line of the DOI',
    entry: 'A401988',
    rows: a401988(11, [
      A401988_BFILE,
      'Paul Fendley, R. Moessner and S. L. Sondhi, <a href="https://doi.org/10.1103/PhysRevB.66.214513">Classical dimers on the triangular lattice</a>, Phys. Rev. B 66 (2002), 214513; <a href="https://arxiv.org/abs/cond-mat/0206159">arXiv:cond-mat/0206159</a> [cond-mat.stat-mech].',
    ]),
  },
  {
    rule: 'links-arxiv-version',
    source: 'narrowed after review: a copy that holds only some lines of an entry',
    entry: 'A004003',
    rows: [['H', A401988_FENDLEY]],
  },
  {
    rule: 'links-authors',
    source: 'narrowed after review: one author followed by the title',
    entry: 'A004003',
    rows: [['H', 'Henry Cohn, 2-adic behavior of numbers of domino tilings, <a href="https://arxiv.org/abs/math/0008222">arXiv:math/0008222</a> [math.CO], 2000.']],
  },
  {
    rule: 'links-authors',
    source: 'narrowed after review: Jr. belongs to the name before it',
    entry: 'A004003',
    rows: [['H', 'John Doe, Jr., <a href="https://doi.org/10.37236/1314">A constructed title</a>, 2026.']],
  },
  {
    rule: 'references-online',
    source: 'SS "References": a reference in both REFERENCES and LINKS is "perfectly normal"',
    entry: 'A004003',
    rows: [
      ['D', 'Lior Pachter, Combinatorial approaches and conjectures for 2-divisibility problems concerning domino tilings of polyominoes, Elec. J. Comb. 4 (1997) #R29.'],
      ['H', `Lior Pachter, <a href="https://doi.org/10.37236/1314">${PACHTER_TITLE}</a>, Elec. J. Comb. 4 (1997) #R29.`],
    ],
  },
  {
    rule: 'capital-x',
    source: 'narrowed after review: n by 2 after divide or replace, and 2x in a g.f., are arithmetic',
    entry: 'A402163',
    rows: [
      ['C', 'For even n, divide n by 2 and use the formula for n/2.'],
      ['C', 'Replace n by 2n in A239273 to get the square of side 4n.'],
      ['F', 'G.f.: 1/(1 - 2x - x^2).'],
    ],
  },
  {
    rule: 'signature-own-draft',
    source: 'SS "Programs": a signature is wanted once the entry is approved',
    entry: 'A402163',
    rows: a402163(A402163_DATA, [['o', '(PARI) a(n) = (M(2*n)^(2*n))[1, 1]; \\\\ _Dawid Ryłko_, Nov 14 2026']]),
    options: { status: 'Approved' },
  },
  {
    rule: 'links-mathworld',
    source: "narrowed after review: domicule tilings ask for Perfect Matching, not King Graph, unless the text says king's graph",
    entry: 'A402163',
    rows: a402163(A402163_DATA, [['H', PERFECT_MATCHING]]),
  },
  {
    rule: 'crossrefs-reverse',
    source: 'the live A239264 does not name A401670 back, which lists it in a Cf. line',
    entry: 'A401670',
    rows: [['Y', 'Cf. A239264, A239273, A401669.']],
    options: { mode: 'draft', others: [{ entry: 'A239264', live: true, rows: [['Y', 'Cf. A004003.']] }] },
  },
  {
    rule: 'crossrefs-reverse',
    source: 'a partial copy of an entry of someone else says nothing about its CROSSREFS',
    entry: 'A401673',
    rows: [['Y', 'Row sums give A239273.']],
    options: { others: [{ entry: 'A239273', rows: [['H', 'Dawid Ryłko, <a href="/A239273/b239273.txt">Table of n, a(n) for n = 0..12</a>']] }] },
  },
  {
    rule: 'example-aligned',
    source: 'a sentence and a single row are not a table',
    entry: 'A402163',
    rows: [
      ['e', A402163_EXAMPLE],
      ['e', '  1, 9, 2649;'],
    ],
  },
  {
    rule: 'example-aligned',
    source: 'a row wrapped onto the next line is left out of the columns',
    entry: 'A401673',
    rows: [
      ['e', 'Triangle begins:'],
      ['e', '     1;'],
      ['e', '     2,     1;'],
      ['e', '    36,   126,    105,     12,       1;'],
      ['e', '  6728, 84132, 413932, 934213, 1000638, 491689, 99554,'],
      ['e', '  6638, 36, 1;'],
      ['e', '     1,     2,      3;'],
      ['e', '  ...'],
    ],
  },
  {
    rule: 'crossrefs-reverse',
    source: 'a CROSSREFS sentence that names the entry itself asks nothing of it',
    entry: 'A401673',
    rows: [['Y', 'Column k=0, T(n, 0) of A401673, gives A004003.']],
    options: { mode: 'draft', others: [{ entry: 'A004003', live: true, rows: [['Y', 'Column k=0 of A401673.']] }] },
  },
  {
    rule: 'limit-notation',
    source: 'the published A401669: lim_ inside the sentence "s = lim_..." is the Style Sheet form',
    entry: 'A401669',
    rows: [['F', 's = lim_{h,w->oo} log(A239264(h,w))/(h*w) = lim_{n->oo} log(A239273(n))/(4*n^2).']],
  },
  {
    rule: 'limit-notation',
    source: 'the live draft of A239273 (#56, read 2026-11-18): Limit_ at the start of the FORMULA line',
    entry: 'A239273',
    rows: [['F', 'Limit_{n->oo} log(a(n))/(4*n^2) = A401669. - _Dawid Ryłko_, Nov 18 2026']],
  },
  {
    rule: 'limit-notation',
    source: 'constructed: "e.g." and "i.e." do not end a sentence, and after a colon either form passes',
    entry: 'A401669',
    rows: [
      ['C', 'The limit is reached slowly, e.g. lim_{w->oo} log(lambda_w)/w = s.'],
      ['F', 'Conjecture: lim_{n->oo} a(n+1)/a(n)^2 = 1.'],
      ['F', 'Conjecture: Limit_{n->oo} a(n+1)/a(n)^2 = 1.'],
    ],
  },
  {
    rule: 'math-notation',
    source: 'the live A402345 (#12) and the live draft of A239273 (#56): asymptotics with ^, sqrt, exp, Pi and the tilde',
    entry: 'A402345',
    rows: [
      ['F', 'a(n) ~ 2^(1/8) * (sqrt(2) - 1)^(n - 1/2) * exp(2*G*n*(2*n+1)/Pi), where G is the Catalan constant A006752. - _Vaclav Kotesovec_, Nov 17 2026'],
      ['F', 'a(n) = A239264(2n,2n).'],
      ['F', 'a(n) ~ c * d^(n^2) / f^n, where c = 1.43791803..., d = exp(4*A401669) = 9.6027320273133..., f = 6.93196613224... (conjectured). - _Dawid Ryłko_, Nov 18 2026'],
    ],
  },
  {
    rule: 'math-notation',
    source: 'the EXAMPLE drawings of the live draft of A239273 (#56): o-o, X, / and \\ are tiles, not notation',
    entry: 'A239273',
    rows: [
      ['e', '  |o o o-o| |o o o-o| |o-o o-o| |o o o o| |o o-o o|'],
      ['e', '  | X     | | X     | |       | | X  | || | \\   / |'],
      ['e', '  |   /  || |   / / | ||  X  || |       | ||     ||'],
    ],
  },
  {
    rule: 'math-notation',
    source: 'constructed: pi(x) for the prime counting function, inf(S), a percentage, Floor at a sentence start and ** in a drawing are not the mistakes of the Style Sheet',
    entry: 'A402163',
    rows: [
      ['F', 'a(n) <= pi(n) - pi(n/2), where pi(x) is the number of primes <= x.'],
      ['C', 'a(n) is the number of permutations pi of [n] with pi(1) < pi(2).'],
      ['C', 'Here pi is the prime counting function A000720 and pi*(x) its variant.'],
      ['F', 'lim inf a(n)/n = 1 and lim sup a(n)/n = 2.'],
      ['C', 'Here s(pi) is the sign of pi, LIS(pi)*LDS(pi) >= n and sigma <= pi in the Bruhat order.'],
      ['C', 'The statistic maj pi^(-1) - maj pi is even, and pi - p0 is a cycle.'],
      ['C', 'The board is cut 1/2 a row from the top.'],
      ['F', 'inf(S) = 1, where S is the set of ratios a(n+1)/a(n).'],
      ['F', 'About 50% of the tilings are symmetric.'],
      ['C', 'Floor(n/2) rows are of each kind.'],
      ['e', '  |**|  **  |**|'],
    ],
  },
  {
    rule: 'common-mistakes',
    source: 'constructed: "Except when", "amount of" for what is not counted and "integer-valued" are correct English',
    entry: 'A402163',
    rows: [
      ['C', 'Except when n = 0, all terms are odd.'],
      ['C', 'The amount of memory grows as 3^n.'],
      ['C', 'The amount of progress is small and the amount of analysis large.'],
      ['C', 'Let f be integer-valued.'],
    ],
  },
  {
    rule: 'links-order',
    source: 'SS "Links": index entries may live under /wiki/Index; constructed lines',
    entry: 'A239273',
    rows: [
      ['S', '1, 3, 280, 3037561'],
      ['H', 'Eric Weisstein\'s World of Mathematics, <a href="https://mathworld.wolfram.com/KingGraph.html">King Graph</a>.'],
      ['H', 'Wikipedia, <a href="https://en.wikipedia.org/wiki/King%27s_graph">King\'s graph</a>.'],
      ['H', '<a href="/wiki/Index_to_OEIS:_Section_Ki">Index entries for sequences related to the king\'s graph</a>.'],
    ],
  },
];

module.exports = { CASES, CLEAN };
