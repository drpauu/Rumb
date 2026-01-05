function buildShortestPathCache(adjacency) {
  if (!adjacency || !adjacency.size) return new Map();
  const ids = [...adjacency.keys()];
  const cache = new Map();

  ids.forEach((startId) => {
    const queue = [startId];
    const visited = new Set([startId]);
    const prev = new Map();

    while (queue.length) {
      const current = queue.shift();
      const neighbors = adjacency.get(current) || new Set();
      for (const next of neighbors) {
        if (visited.has(next)) continue;
        visited.add(next);
        prev.set(next, current);
        queue.push(next);
      }
    }

    const targetMap = new Map();
    ids.forEach((targetId) => {
      if (targetId === startId) {
        targetMap.set(targetId, [startId]);
        return;
      }
      if (!visited.has(targetId)) return;
      const path = [targetId];
      let step = targetId;
      while (prev.has(step)) {
        step = prev.get(step);
        path.push(step);
        if (step === startId) break;
      }
      targetMap.set(targetId, path.reverse());
    });
    cache.set(startId, targetMap);
  });

  return cache;
}

function deserializeAdjacency(list) {
  if (!Array.isArray(list)) return new Map();
  return new Map(list.map(([id, neighbors]) => [id, new Set(neighbors || [])]));
}

function serializeShortestPathCache(cache) {
  if (!cache || !cache.size) return [];
  return [...cache.entries()].map(([startId, targets]) => [
    startId,
    [...targets.entries()]
  ]);
}

self.onmessage = (event) => {
  const adjacencyList = event.data?.adjacency;
  const adjacency = deserializeAdjacency(adjacencyList);
  const cache = buildShortestPathCache(adjacency);
  self.postMessage({ cache: serializeShortestPathCache(cache) });
};
