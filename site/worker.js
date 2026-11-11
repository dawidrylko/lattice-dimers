const unrankers = new Map();

const PIECE_LATTICES = { domino: 'square', domicule: 'king', triangular: 'triangular' };

const SAMPLERS = {
  domino: board => sampleRandomTiling(board),
  domicule: board => sampleDomiculeTiling(board),
  triangular: board => sampleDomiculeTiling({ ...board, lattice: 'triangular' }),
};

function selectNumbering(board, diagonals) {
  if (board.surface !== 'rectangle') {
    const options = {
      rowCount: board.rowCount,
      colCount: board.colCount,
      lattice: PIECE_LATTICES[board.pieces],
      torus: board.surface === 'torus',
      diagonals,
    };

    return {
      key: diagonals === null ? board.id : `${board.id}/${diagonals}`,
      large: diagonals !== null || !canUnrankCylinderTorus(options),
      create: onProgress => createCylinderTorusUnranker(options, onProgress),
      unrank: unrankCylinderTorusTiling,
    };
  }

  if (diagonals !== null) {
    return {
      key: `${board.id}/${diagonals}`,
      large: true,
      create: onProgress => createDiagonalUnranker({ ...board, diagonals }, onProgress),
      unrank: unrankDiagonalTiling,
    };
  }

  if (board.pieces !== 'domino') {
    return {
      key: board.id,
      large: !canUnrankDomicule(board),
      create: onProgress => createDomiculeUnranker({ ...board, lattice: PIECE_LATTICES[board.pieces] }, onProgress),
      unrank: unrankDomiculeTiling,
    };
  }

  return {
    key: board.id,
    large: !canUnrank(board),
    create: onProgress => createUnranker(board, onProgress),
    unrank: unrankTiling,
  };
}

function getUnranker(numbering, id) {
  const { key } = numbering;

  if (!unrankers.has(key)) {
    if (numbering.large) {
      [...unrankers.keys()].filter(other => unrankers.get(other).large).forEach(other => unrankers.delete(other));
    }

    const unranker = numbering.create(progress => postMessage({ id, type: 'progress', progress }));

    unrankers.set(key, { large: numbering.large, unranker });
  }

  return unrankers.get(key).unranker;
}

onmessage = ({ data }) => {
  const { id, type, board, diagonals = null } = data;

  try {
    if (type === 'rank') {
      const residues = data.primes.map((prime, j) =>
        rankTilingsModulo(board, data.tilings, prime, progress =>
          postMessage({ id, type: 'progress', progress: (j + progress) / data.primes.length }),
        ),
      );

      postMessage({ id, type: 'result', residues });
      return;
    }

    const tilings = [];

    if (type === 'page') {
      const numbering = selectNumbering(board, diagonals);
      const unranker = getUnranker(numbering, id);
      const first = BigInt(data.first);
      const end = first + BigInt(data.count);
      const last = end < unranker.total ? end : unranker.total;

      for (let rank = first; rank < last; rank++) {
        tilings.push(numbering.unrank(unranker, rank));
      }
    } else if (type === 'random') {
      for (let i = 0; i < data.count; i++) {
        tilings.push(SAMPLERS[board.pieces](board));
      }
    }

    postMessage({ id, type: 'result', tilings });
  } catch (error) {
    postMessage({ id, type: 'error', message: error.message });
  }
};
