import { geoCentroid } from "d3-geo";

export function buildCentroidMap(features) {
  const map = new Map();
  if (!Array.isArray(features)) return map;
  features.forEach((feature) => {
    const id = feature?.properties?.id;
    if (!id) return;
    const centroid = geoCentroid(feature);
    if (!Array.isArray(centroid) || centroid.length < 2) return;
    const [lon, lat] = centroid;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    map.set(id, { lat, lon });
  });
  return map;
}

export function buildNeighborSet(shortestPathIds, adjacency) {
  const set = new Set();
  if (!Array.isArray(shortestPathIds) || !adjacency) return set;
  shortestPathIds.forEach((id) => {
    const neighbors = adjacency.get(id);
    if (!neighbors) return;
    neighbors.forEach((neighbor) => set.add(neighbor));
  });
  return set;
}
