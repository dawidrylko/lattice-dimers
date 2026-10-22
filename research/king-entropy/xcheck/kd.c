/*
 * kd.c - independent cross-check of the king-graph dimer computations.
 *
 * Perfect matchings of the king's graph (and, for validation, the square and
 * triangular lattices) on a strip of width w, free (open sides) or periodic
 * across the width (cylinder), by a cell-by-cell transfer applied in place.
 *
 * Cells are scanned row by row, p = r*w + c. Before cell p is processed the
 * state holds the occupancy of the cells p .. p+w (n = w+1 bits; cell q sits
 * at bit q mod n, so the bit freed by cell p is reused for cell p+w+1). On the
 * cylinder one extra bit F (bit n) holds the cell (r+1, w-1) when (r, 0) has
 * claimed it through the wrap-around down-left edge; it is moved into the
 * window when that cell enters it (after cell (r, w-2)). A logical state s is
 * stored at index s ^ X; one cell step flips bit q of X, which turns the update
 * into a single pass that reads one half of the array and writes the other.
 *
 * Modes (all output is plain text on stdout):
 *   count <lat> <bc> <w> <K> <p1> ... <pm>
 *       Z(k, w) mod each prime for k = 0..K (lines "k r1 ... rm").
 *   power <lat> <bc> <w> <sector|e0> <maxit> <seed> <tol>
 *       power iteration on T^2 restricted to a parity sector (or started from
 *       the empty state), one line per iteration: lambda^2 estimate (l1 ratio),
 *       Collatz-Wielandt min and max over the support, in hex and decimal.
 *   cert <lat> <w> <down|up> <z_hex> <iters> <seed>
 *       free strip, outside covers of the side columns at weight z (z = 0 for
 *       the plain strip). Runs <iters> power iterations from e0 in round-to-
 *       nearest, then one product y = A v in the given directed rounding mode
 *       and prints min (down) or max (up) of y_i / v_i over supp v, rounded in
 *       the same direction, plus the support checks.
 *
 * Arithmetic: REAL is long double unless compiled with -DUSE_DOUBLE.
 * Build: see build.sh (gcc -O2 -fopenmp -frounding-math -ffp-contract=off).
 */
#include <fenv.h>
#include <float.h>
#include <inttypes.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>


#ifdef USE_DOUBLE
typedef double REAL;
#define RFMT "%.17g"
#define RHEX "%a"
#define STRTOR strtod
#define RNAME "double"
#else
typedef long double REAL;
#define RFMT "%.21Lg"
#define RHEX "%La"
#define STRTOR strtold
#define RNAME "long double"
#endif

enum { KING = 0, SQ = 1, TRI = 2 };

typedef struct {
    int q;          /* bit position of the current cell */
    int np;         /* number of partner bits */
    uint64_t P[6];  /* partner bits (positions other than q) */
    int dr;         /* down-right partner lands on bit q itself */
    int merge;      /* cylinder: move F into bit q after this step */
    int side;       /* cell in column 0 or w-1 (outside covers) */
} step_t;

static int W, CYL, LAT, NB;
static uint64_t NSTATES, FBIT;
static int g_round = FE_TONEAREST;

static void make_step(long p, step_t *st)
{
    int n = W + 1, c = (int)(p % W);
    memset(st, 0, sizeof *st);
    st->q = (int)(p % n);
    st->np = 0;
    st->dr = 0;
    st->merge = 0;
    st->side = (c == 0 || c == W - 1);
    if (c + 1 <= W - 1) st->P[st->np++] = 1ULL << ((p + 1) % n);           /* right */
    if (CYL && c == 0) st->P[st->np++] = 1ULL << ((p + W - 1) % n);        /* left, wrap */
    if (LAT == KING) {                                                      /* down-left */
        if (c >= 1) st->P[st->np++] = 1ULL << ((p + W - 1) % n);
        else if (CYL) st->P[st->np++] = FBIT;
    }
    st->P[st->np++] = 1ULL << ((p + W) % n);                                /* down */
    if (LAT == KING || LAT == TRI) {                                        /* down-right */
        if (c <= W - 2) {
            if (CYL && c == W - 2) { st->P[st->np++] = FBIT; st->merge = 1; }
            else st->dr = 1;
        } else if (CYL) {
            st->P[st->np++] = 1ULL << ((p + 1) % n);                        /* wrap to (r+1, 0) */
        }
    }
}

static inline uint64_t insert_bit(uint64_t k, int q, uint64_t b)
{
    uint64_t low = k & ((1ULL << q) - 1);
    return ((k >> q) << (q + 1)) | (b << q) | low;
}

/* ---------- real arithmetic ---------- */

static void step_real(REAL *a, uint64_t *X, const step_t *st, REAL zs)
{
    uint64_t half = NSTATES >> 1, x = *X, Q = 1ULL << st->q, xq = (x >> st->q) & 1;
    int q = st->q, np = st->np;
    uint64_t P0 = st->P[0], P1 = st->P[1], P2 = st->P[2], P3 = st->P[3], P4 = st->P[4];
#pragma omp parallel
    {
        fesetround(g_round);
#pragma omp for schedule(static)
        for (uint64_t k = 0; k < half; k++) {
            uint64_t j = insert_bit(k, q, xq), t = j ^ x;
            REAL acc = a[j ^ Q];
            if (np > 0 && (t & P0)) acc += a[j ^ P0];
            if (np > 1 && (t & P1)) acc += a[j ^ P1];
            if (np > 2 && (t & P2)) acc += a[j ^ P2];
            if (np > 3 && (t & P3)) acc += a[j ^ P3];
            if (np > 4 && (t & P4)) acc += a[j ^ P4];
            if (zs != 0) acc += zs * a[j];
            a[j ^ Q] = acc;
        }
        if (!st->dr) {
#pragma omp for schedule(static)
            for (uint64_t k = 0; k < half; k++) a[insert_bit(k, q, xq)] = 0;
        }
    }
    *X = x ^ Q;
    if (st->merge) {
        uint64_t xn = *X, xf = (xn >> (NB - 1)) & 1, xq2 = (xn >> q) & 1;
        uint64_t quarter = NSTATES >> 2;
#pragma omp parallel for schedule(static)
        for (uint64_t k = 0; k < quarter; k++) {
            /* logical F = 1, Q = 0 */
            uint64_t j = insert_bit(k, q, xq2) | ((xf ^ 1ULL) << (NB - 1));
            a[j ^ FBIT ^ Q] = a[j];
            a[j] = 0;
        }
    }
}

/* ---------- modular arithmetic, m primes interleaved ---------- */

static void step_mod(uint64_t *a, int m, const uint64_t *pr, uint64_t *X, const step_t *st)
{
    uint64_t half = NSTATES >> 1, x = *X, Q = 1ULL << st->q, xq = (x >> st->q) & 1;
    int q = st->q, np = st->np;
#pragma omp parallel
    {
#pragma omp for schedule(static)
        for (uint64_t k = 0; k < half; k++) {
            uint64_t j = insert_bit(k, q, xq), t = j ^ x;
            uint64_t *dst = a + (j ^ Q) * m;
            for (int i = 0; i < np; i++) {
                if (!(t & st->P[i])) continue;
                const uint64_t *src = a + (j ^ st->P[i]) * m;
                for (int e = 0; e < m; e++) {
                    uint64_t s = dst[e] + src[e];
                    dst[e] = s >= pr[e] ? s - pr[e] : s;
                }
            }
        }
        if (!st->dr) {
#pragma omp for schedule(static)
            for (uint64_t k = 0; k < half; k++) memset(a + insert_bit(k, q, xq) * m, 0, sizeof(uint64_t) * m);
        }
    }
    *X = x ^ Q;
    if (st->merge) {
        uint64_t xn = *X, xf = (xn >> (NB - 1)) & 1, xq2 = (xn >> q) & 1;
        uint64_t quarter = NSTATES >> 2;
#pragma omp parallel for schedule(static)
        for (uint64_t k = 0; k < quarter; k++) {
            uint64_t j = insert_bit(k, q, xq2) | ((xf ^ 1ULL) << (NB - 1));
            memcpy(a + (j ^ FBIT ^ Q) * m, a + j * m, sizeof(uint64_t) * m);
            memset(a + j * m, 0, sizeof(uint64_t) * m);
        }
    }
}

static void setup(const char *lat, const char *bc, int w)
{
    W = w;
    if (!strcmp(lat, "king")) LAT = KING;
    else if (!strcmp(lat, "sq")) LAT = SQ;
    else if (!strcmp(lat, "tri")) LAT = TRI;
    else { fprintf(stderr, "lattice?\n"); exit(2); }
    if (!strcmp(bc, "free")) CYL = 0;
    else if (!strcmp(bc, "cyl")) CYL = 1;
    else { fprintf(stderr, "bc?\n"); exit(2); }
    if (CYL && w < 3) { fprintf(stderr, "cylinder needs w >= 3\n"); exit(2); }
    NB = w + 1 + CYL;
    FBIT = CYL ? (1ULL << (w + 1)) : 0;
    NSTATES = 1ULL << NB;
}

/* logical index of row set A (bit k = column k) at the start of a row, cell p0 */
static inline uint64_t row_state(uint64_t A, long p0)
{
    int n = W + 1;
    uint64_t s = 0;
    for (int k = 0; k < W; k++)
        if (A >> k & 1) s |= 1ULL << ((p0 + k) % n);
    return s;
}

static uint64_t rng_state;
static uint64_t splitmix(void)
{
    uint64_t z = (rng_state += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

static int mode_count(int argc, char **argv)
{
    /* count lat bc w K p1..pm */
    if (argc < 7) return 2;
    setup(argv[2], argv[3], atoi(argv[4]));
    int K = atoi(argv[5]), m = argc - 6;
    uint64_t pr[64];
    for (int i = 0; i < m; i++) pr[i] = strtoull(argv[6 + i], 0, 10);
    uint64_t *a = calloc(NSTATES * m, sizeof(uint64_t));
    if (!a) { fprintf(stderr, "alloc\n"); return 3; }
    for (int i = 0; i < m; i++) a[i] = 1 % pr[i];
    uint64_t X = 0;
    printf("# count lat=%s bc=%s w=%d K=%d primes=%d threads=%d\n", argv[2], argv[3], W, K, m, omp_get_max_threads());
    printf("0");
    for (int i = 0; i < m; i++) printf(" %" PRIu64, a[i]);
    printf("\n");
    step_t st;
    for (int r = 0; r < K; r++) {
        for (int c = 0; c < W; c++) {
            make_step((long)r * W + c, &st);
            step_mod(a, m, pr, &X, &st);
        }
        uint64_t j = row_state(0, (long)(r + 1) * W) ^ X;
        printf("%d", r + 1);
        for (int i = 0; i < m; i++) printf(" %" PRIu64, a[j * m + i]);
        printf("\n");
        fflush(stdout);
    }
    free(a);
    return 0;
}

/* one application of T^2 to the row vector u (2^W entries), result in u2 */
static void apply_T2(REAL *a, const REAL *u, REAL *u2, REAL zside)
{
    uint64_t R = 1ULL << W, X = 0;
    memset(a, 0, sizeof(REAL) * NSTATES);
    for (uint64_t A = 0; A < R; A++) a[row_state(A, 0)] = u[A];
    step_t st;
    for (long p = 0; p < 2L * W; p++) {
        make_step(p, &st);
        step_real(a, &X, &st, st.side ? zside : 0);
    }
    REAL tot = 0, got = 0;
    for (uint64_t i = 0; i < NSTATES; i++) tot += a[i];
    for (uint64_t A = 0; A < R; A++) {
        u2[A] = a[row_state(A, 2L * W) ^ X];
        got += u2[A];
    }
    if (!(fabsl((long double)(tot - got)) <= 1e-12L * (long double)tot)) {
        fprintf(stderr, "mass outside row states: %Lg of %Lg\n", (long double)(tot - got), (long double)tot);
        exit(4);
    }
}

static int mode_power(int argc, char **argv)
{
    /* power lat bc w sector maxit seed tol */
    if (argc < 9) return 2;
    setup(argv[2], argv[3], atoi(argv[4]));
    int e0 = !strcmp(argv[5], "e0"), sector = e0 ? 0 : atoi(argv[5]);
    int maxit = atoi(argv[6]);
    rng_state = strtoull(argv[7], 0, 10);
    long double tol = strtold(argv[8], 0);
    uint64_t R = 1ULL << W;
    REAL *a = malloc(sizeof(REAL) * NSTATES), *u = malloc(sizeof(REAL) * R), *u2 = malloc(sizeof(REAL) * R);
    if (!a || !u || !u2) { fprintf(stderr, "alloc\n"); return 3; }
    REAL s = 0;
    for (uint64_t A = 0; A < R; A++) {
        if (e0) u[A] = (A == 0);
        else u[A] = (__builtin_popcountll(A) & 1) == sector ? (REAL)((splitmix() >> 11) + 1) : 0;
        s += u[A];
    }
    for (uint64_t A = 0; A < R; A++) u[A] /= s;
    printf("# power lat=%s bc=%s w=%d start=%s real=%s mant=%d threads=%d\n", argv[2], argv[3], W, argv[5], RNAME,
           (int)(sizeof(REAL) == 8 ? DBL_MANT_DIG : LDBL_MANT_DIG), omp_get_max_threads());
    printf("# it est_hex cwmin_hex cwmax_hex est cwmin cwmax nsupp zero_viol\n");
    long double prev = -1;
    int calm = 0;
    for (int it = 1; it <= maxit; it++) {
        apply_T2(a, u, u2, 0);
        REAL tot = 0, mn = INFINITY, mx = 0;
        uint64_t nsupp = 0, viol = 0;
        for (uint64_t A = 0; A < R; A++) {
            tot += u2[A];
            if (u[A] > 0) {
                REAL r = u2[A] / u[A];
                if (r < mn) mn = r;
                if (r > mx) mx = r;
                nsupp++;
            } else if (u2[A] > 0) viol++;
        }
        printf("%d " RHEX " " RHEX " " RHEX " " RFMT " " RFMT " " RFMT " %" PRIu64 " %" PRIu64 "\n", it, tot, mn, mx, tot,
               mn, mx, nsupp, viol);
        fflush(stdout);
        for (uint64_t A = 0; A < R; A++) u[A] = u2[A] / tot;
        long double lt = logl((long double)tot);
        if (prev >= 0 && fabsl(lt - prev) < tol && viol == 0) calm++;
        else calm = 0;
        prev = lt;
        if (calm >= 3 && it >= 8) break;
    }
    free(a); free(u); free(u2);
    return 0;
}

static int mode_cert(int argc, char **argv)
{
    /* cert lat w down|up z_hex iters seed */
    if (argc < 8) return 2;
    setup(argv[2], "free", atoi(argv[3]));
    int up = !strcmp(argv[4], "up");
    REAL z = STRTOR(argv[5], 0);
    int iters = atoi(argv[6]);
    rng_state = strtoull(argv[7], 0, 10);
    uint64_t R = 1ULL << W;
    REAL *a = malloc(sizeof(REAL) * NSTATES), *u = malloc(sizeof(REAL) * R), *u2 = malloc(sizeof(REAL) * R);
    if (!a || !u || !u2) { fprintf(stderr, "alloc\n"); return 3; }
    for (uint64_t A = 0; A < R; A++) u[A] = (A == 0);
    g_round = FE_TONEAREST;
    fesetround(g_round);
    for (int it = 1; it <= iters; it++) {
        apply_T2(a, u, u2, z);
        REAL tot = 0;
        for (uint64_t A = 0; A < R; A++) tot += u2[A];
        for (uint64_t A = 0; A < R; A++) u[A] = u2[A] / tot;
    }
    /* certificate: one product in directed rounding */
    g_round = up ? FE_UPWARD : FE_DOWNWARD;
    fesetround(g_round);
    apply_T2(a, u, u2, z);
    REAL best = up ? 0 : INFINITY, vmin = INFINITY;
    uint64_t nsupp = 0, viol = 0;
    for (uint64_t A = 0; A < R; A++) {
        if (u[A] > 0) {
            REAL r = u2[A] / u[A];
            if (up ? r > best : r < best) best = r;
            if (u[A] < vmin) vmin = u[A];
            nsupp++;
        } else if (u2[A] != 0) viol++;
    }
    REAL v0 = u[0];
    fesetround(FE_TONEAREST);
    printf("# cert lat=%s w=%d dir=%s z=" RHEX " iters=%d real=%s\n", argv[2], W, argv[4], z, iters, RNAME);
    printf("ratio_hex " RHEX "\nratio " RFMT "\nv0_hex " RHEX "\nvmin_supp " RHEX "\nnsupp %" PRIu64 "\nzero_viol %" PRIu64 "\n",
           best, best, v0, vmin, nsupp, viol);
    free(a); free(u); free(u2);
    return 0;
}

int main(int argc, char **argv)
{
    if (argc < 2) { fprintf(stderr, "usage: kd count|power|cert ...\n"); return 2; }
    if (!strcmp(argv[1], "count")) return mode_count(argc, argv);
    if (!strcmp(argv[1], "power")) return mode_power(argc, argv);
    if (!strcmp(argv[1], "cert")) return mode_cert(argc, argv);
    fprintf(stderr, "unknown mode\n");
    return 2;
}
