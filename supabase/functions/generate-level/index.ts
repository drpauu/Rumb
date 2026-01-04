import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { feature, neighbors as topoNeighbors } from "https://esm.sh/topojson-client@3.1.0";
import topology from "./catalunya-comarques.topojson.json" assert { type: "json" };

const BORDER_TOUCH = {
  france: [
    "Alt Empordà",
    "Garrotxa",
    "Ripollès",
    "Cerdanya",
    "Alt Urgell",
    "Pallars Sobirà",
    "Alta Ribagorça",
    "Val d'Aran"
  ],
  andorra: ["Alt Urgell", "Cerdanya"],
  aragon: [
    "Val d'Aran",
    "Alta Ribagorça",
    "Pallars Sobirà",
    "Pallars Jussà",
    "Alt Urgell",
    "Noguera",
    "Segrià",
    "Garrigues",
    "Ribera d'Ebre",
    "Terra Alta"
  ],
  valencia: ["Montsià", "Baix Ebre"],
  sea: [
    "Alt Empordà",
    "Baix Empordà",
    "Selva",
    "Maresme",
    "Barcelonès",
    "Baix Llobregat",
    "Garraf",
    "Baix Penedès",
    "Tarragonès",
    "Baix Camp",
    "Baix Ebre",
    "Montsià"
  ]
};

const RULE_DEFS = [
  {
    id: "border-france",
    kind: "mustIncludeAny",
    label: "Has de tocar la frontera amb França.",
    comarques: BORDER_TOUCH.france
  },
  {
    id: "border-andorra",
    kind: "mustIncludeAny",
    label: "Has de tocar la frontera amb Andorra.",
    comarques: BORDER_TOUCH.andorra
  },
  {
    id: "border-aragon",
    kind: "mustIncludeAny",
    label: "Has de tocar la frontera amb Aragó.",
    comarques: BORDER_TOUCH.aragon
  },
  {
    id: "border-valencia",
    kind: "mustIncludeAny",
    label: "Has de tocar la frontera amb València.",
    comarques: BORDER_TOUCH.valencia
  },
  {
    id: "border-sea",
    kind: "mustIncludeAny",
    label: "Has de tocar la frontera amb el Mar Mediterrani.",
    comarques: BORDER_TOUCH.sea
  },
  {
    id: "avoid-random",
    kind: "avoid-random",
    label: "No pots passar per {comarca}."
  },
  {
    id: "calcots-valls",
    kind: "mustIncludeAny",
    label: "Has de passar per Valls (calçots).",
    comarques: ["Alt Camp"]
  },
  {
    id: "volcans-garrotxa",
    kind: "mustIncludeAny",
    label: "Has de passar per la Garrotxa (volcans).",
    comarques: ["Garrotxa"]
  },
  {
    id: "plana-vic",
    kind: "mustIncludeAny",
    label: "Has d'anar per la Plana de Vic.",
    comarques: ["Osona"]
  },
  {
    id: "plana-cerdanya",
    kind: "mustIncludeAny",
    label: "Has d'anar per la Plana de la Cerdanya.",
    comarques: ["Cerdanya"]
  },
  {
    id: "gambes-palamos",
    kind: "mustIncludeAny",
    label: "Has d'anar a pescar gambes vermelles a Palamós.",
    comarques: ["Baix Empordà"]
  },
  {
    id: "barcelona-capital",
    kind: "mustIncludeAny",
    label: "Has de passar per Barcelona.",
    comarques: ["Barcelonès"]
  },
  {
    id: "girona-capital",
    kind: "mustIncludeAny",
    label: "Has de passar per Girona.",
    comarques: ["Gironès"]
  },
  {
    id: "tarragona-capital",
    kind: "mustIncludeAny",
    label: "Has de passar per Tarragona.",
    comarques: ["Tarragonès"]
  },
  {
    id: "lleida-capital",
    kind: "mustIncludeAny",
    label: "Has de passar per Lleida.",
    comarques: ["Segrià"]
  },
  {
    id: "delta-ebre",
    kind: "mustIncludeAny",
    label: "Has de passar pel Delta de l'Ebre.",
    comarques: ["Baix Ebre", "Montsià"]
  },
  {
    id: "priorat-vins",
    kind: "mustIncludeAny",
    label: "Has de tastar vins del Priorat.",
    comarques: ["Priorat"]
  },
  {
    id: "penedes-cava",
    kind: "mustIncludeAny",
    label: "Has de brindar amb cava al Penedès.",
    comarques: ["Alt Penedès", "Baix Penedès"]
  },
  {
    id: "montserrat-bages",
    kind: "mustIncludeAny",
    label: "Has de passar per Montserrat.",
    comarques: ["Bages"]
  },
  {
    id: "costa-brava",
    kind: "mustIncludeAny",
    label: "Has de passar per la Costa Brava.",
    comarques: ["Alt Empordà", "Baix Empordà", "Selva"]
  },
  {
    id: "costa-daurada",
    kind: "mustIncludeAny",
    label: "Has de passar per la Costa Daurada.",
    comarques: ["Tarragonès", "Baix Camp", "Baix Penedès"]
  },
  {
    id: "montseny",
    kind: "mustIncludeAny",
    label: "Has de passar pel Montseny.",
    comarques: ["Osona", "Vallès Oriental", "Selva"]
  },
  {
    id: "pla-urgell",
    kind: "mustIncludeAny",
    label: "Has de passar pel Pla d'Urgell.",
    comarques: ["Pla d'Urgell"]
  },
  {
    id: "pla-estany",
    kind: "mustIncludeAny",
    label: "Has de passar pel Pla de l'Estany.",
    comarques: ["Pla de l'Estany"]
  },
  {
    id: "val-aran",
    kind: "mustIncludeAny",
    label: "Has de passar per la Vall d'Aran.",
    comarques: ["Val d'Aran"]
  },
  {
    id: "alta-ribagorca",
    kind: "mustIncludeAny",
    label: "Has de passar per l'Alta Ribagorça.",
    comarques: ["Alta Ribagorça"]
  },
  {
    id: "pallars-sobira",
    kind: "mustIncludeAny",
    label: "Has de passar pel Pallars Sobirà.",
    comarques: ["Pallars Sobirà"]
  },
  {
    id: "pallars-jussa",
    kind: "mustIncludeAny",
    label: "Has de passar pel Pallars Jussà.",
    comarques: ["Pallars Jussà"]
  },
  {
    id: "noguera",
    kind: "mustIncludeAny",
    label: "Has de passar per la Noguera.",
    comarques: ["Noguera"]
  },
  {
    id: "segarra",
    kind: "mustIncludeAny",
    label: "Has de passar per la Segarra.",
    comarques: ["Segarra"]
  },
  {
    id: "solsones",
    kind: "mustIncludeAny",
    label: "Has de passar pel Solsonès.",
    comarques: ["Solsonès"]
  },
  {
    id: "patum-bergueda",
    kind: "mustIncludeAny",
    label: "Has de passar per la Patum.",
    comarques: ["Berguedà"]
  },
  {
    id: "ripolles",
    kind: "mustIncludeAny",
    label: "Has de passar pel Ripollès.",
    comarques: ["Ripollès"]
  },
  {
    id: "maresme",
    kind: "mustIncludeAny",
    label: "Has de passar pel Maresme.",
    comarques: ["Maresme"]
  },
  {
    id: "garraf",
    kind: "mustIncludeAny",
    label: "Has de passar pel Garraf.",
    comarques: ["Garraf"]
  },
  {
    id: "conca-barbera",
    kind: "mustIncludeAny",
    label: "Has de passar per la Conca de Barberà.",
    comarques: ["Conca de Barberà"]
  },
  {
    id: "urgell",
    kind: "mustIncludeAny",
    label: "Has de passar per l'Urgell.",
    comarques: ["Urgell"]
  },
  {
    id: "garrigues",
    kind: "mustIncludeAny",
    label: "Has de passar per les Garrigues.",
    comarques: ["Garrigues"]
  },
  {
    id: "ribera-ebre",
    kind: "mustIncludeAny",
    label: "Has de passar per la Ribera d'Ebre.",
    comarques: ["Ribera d'Ebre"]
  },
  {
    id: "terra-alta",
    kind: "mustIncludeAny",
    label: "Has de passar per la Terra Alta.",
    comarques: ["Terra Alta"]
  },
  {
    id: "anoia-igualada",
    kind: "mustIncludeAny",
    label: "Has de passar per Igualada.",
    comarques: ["Anoia"]
  },
  {
    id: "cap-creus",
    kind: "mustIncludeAny",
    label: "Has de passar pel Cap de Creus.",
    comarques: ["Alt Empordà"]
  },
  {
    id: "reus-baix-camp",
    kind: "mustIncludeAny",
    label: "Has de passar per Reus.",
    comarques: ["Baix Camp"]
  },
  {
    id: "baix-llobregat",
    kind: "mustIncludeAny",
    label: "Has de passar pel Baix Llobregat.",
    comarques: ["Baix Llobregat"]
  },
  {
    id: "valles-occidental",
    kind: "mustIncludeAny",
    label: "Has de passar pel Vallès Occidental.",
    comarques: ["Vallès Occidental"]
  },
  {
    id: "alt-urgell",
    kind: "mustIncludeAny",
    label: "Has de passar per la Seu d'Urgell.",
    comarques: ["Alt Urgell"]
  },
  {
    id: "barraques-girona",
    kind: "mustIncludeAny",
    label: "Has de passar per les barraques de Girona.",
    comarques: ["Gironès"]
  },
  {
    id: "bany-salou",
    kind: "mustIncludeAny",
    label: "Has d'anar a fer-te un bany a Salou.",
    comarques: ["Tarragonès"]
  },
  {
    id: "tapes-cadaques",
    kind: "mustIncludeAny",
    label: "Has d'anar a menjar tapes a Cadaqués.",
    comarques: ["Alt Empordà"]
  },
  {
    id: "anxoves-escala",
    kind: "mustIncludeAny",
    label: "Has d'anar a menjar anxoves a l'Escala.",
    comarques: ["Alt Empordà"]
  },
  {
    id: "avoid-cadi",
    kind: "avoid",
    label: "No pots passar per la Serra del Cadí.",
    comarques: ["Cerdanya", "Alt Urgell", "Berguedà"]
  }
];

const EASY_RULES = new Set([
  "border-france",
  "border-andorra",
  "border-aragon",
  "border-valencia",
  "border-sea",
  "barcelona-capital",
  "girona-capital",
  "tarragona-capital",
  "lleida-capital",
  "costa-brava",
  "costa-daurada",
  "maresme",
  "garraf",
  "baix-llobregat",
  "anoia-igualada",
  "cap-creus",
  "reus-baix-camp",
  "penedes-cava",
  "gambes-palamos",
  "bany-salou"
]);

const HARD_RULES = new Set([
  "ripolles",
  "noguera",
  "segarra",
  "solsones",
  "conca-barbera",
  "garrigues",
  "ribera-ebre",
  "urgell",
  "barraques-girona"
]);

const EXPERT_RULES = new Set([
  "val-aran",
  "alta-ribagorca",
  "pallars-sobira",
  "pallars-jussa",
  "terra-alta",
  "alt-urgell",
  "avoid-cadi",
  "patum-bergueda",
  "priorat-vins",
  "tapes-cadaques",
  "anxoves-escala"
]);

const RULE_TAGS: Record<string, string[]> = {
  "border-france": ["geo"],
  "border-andorra": ["geo"],
  "border-aragon": ["geo"],
  "border-valencia": ["geo"],
  "border-sea": ["geo"],
  "avoid-random": ["geo"],
  "calcots-valls": ["cultural"],
  "volcans-garrotxa": ["geo"],
  "plana-vic": ["geo"],
  "plana-cerdanya": ["geo"],
  "gambes-palamos": ["cultural"],
  "barcelona-capital": ["cultural"],
  "girona-capital": ["cultural"],
  "tarragona-capital": ["cultural"],
  "lleida-capital": ["cultural"],
  "delta-ebre": ["geo"],
  "priorat-vins": ["cultural"],
  "penedes-cava": ["cultural"],
  "montserrat-bages": ["cultural", "geo"],
  "costa-brava": ["geo"],
  "costa-daurada": ["geo"],
  montseny: ["geo"],
  "pla-urgell": ["geo"],
  "pla-estany": ["geo"],
  "val-aran": ["geo"],
  "alta-ribagorca": ["geo"],
  "pallars-sobira": ["geo"],
  "pallars-jussa": ["geo"],
  noguera: ["geo"],
  segarra: ["geo"],
  solsones: ["geo"],
  "patum-bergueda": ["cultural"],
  ripolles: ["geo"],
  maresme: ["geo"],
  garraf: ["geo"],
  "conca-barbera": ["geo"],
  urgell: ["geo"],
  garrigues: ["geo"],
  "ribera-ebre": ["geo"],
  "terra-alta": ["geo"],
  "anoia-igualada": ["cultural"],
  "cap-creus": ["geo"],
  "reus-baix-camp": ["cultural"],
  "baix-llobregat": ["geo"],
  "valles-occidental": ["geo"],
  "alt-urgell": ["geo"],
  "barraques-girona": ["cultural"],
  "bany-salou": ["cultural"],
  "tapes-cadaques": ["cultural"],
  "anxoves-escala": ["cultural"],
  "avoid-cadi": ["geo"]
};

const difficultyId = "cap-colla-rutes";
const DAILY_MIN_INTERNAL = 4;
const WEEKLY_MIN_INTERNAL = 8;

function getRuleDifficulty(def: any) {
  if (def.difficulty) return def.difficulty;
  if (EXPERT_RULES.has(def.id)) return "expert";
  if (HARD_RULES.has(def.id)) return "hard";
  if (EASY_RULES.has(def.id)) return "easy";
  return "medium";
}

function getRuleTags(def: any) {
  if (def.tags && def.tags.length) return def.tags;
  return RULE_TAGS[def.id] || ["geo"];
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), t | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(list: T[], rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

function findShortestPath(startId: string, targetId: string, adjacency: Map<string, Set<string>>) {
  if (!startId || !targetId) return [];
  if (startId === targetId) return [startId];
  const queue = [startId];
  const visited = new Set([startId]);
  const prev = new Map<string, string>();

  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || new Set();
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, current);
      if (next === targetId) {
        const path = [targetId];
        let step = targetId;
        while (prev.has(step)) {
          step = prev.get(step)!;
          path.push(step);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function findShortestPathInSet(
  startId: string,
  targetId: string,
  adjacency: Map<string, Set<string>>,
  allowedSet: Set<string>
) {
  if (!startId || !targetId) return [];
  if (!allowedSet.has(startId) || !allowedSet.has(targetId)) return [];
  if (startId === targetId) return [startId];
  const queue = [startId];
  const visited = new Set([startId]);
  const prev = new Map<string, string>();

  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || new Set();
    for (const next of neighbors) {
      if (visited.has(next) || !allowedSet.has(next)) continue;
      visited.add(next);
      prev.set(next, current);
      if (next === targetId) {
        const path = [targetId];
        let step = targetId;
        while (prev.has(step)) {
          step = prev.get(step)!;
          path.push(step);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function hasPathViaNode(
  startId: string,
  targetId: string,
  nodeId: string,
  adjacency: Map<string, Set<string>>,
  allowedSet: Set<string>
) {
  if (!allowedSet.has(nodeId)) return false;
  const toNode = findShortestPathInSet(startId, nodeId, adjacency, allowedSet);
  if (!toNode.length) return false;
  const toTarget = findShortestPathInSet(nodeId, targetId, adjacency, allowedSet);
  return toTarget.length > 0;
}

function findShortestPathWithRule(
  startId: string,
  targetId: string,
  adjacency: Map<string, Set<string>>,
  rule: any,
  allIds: string[]
) {
  if (!rule) return findShortestPath(startId, targetId, adjacency);
  if (rule.kind === "avoid") {
    const blocked = new Set(rule.comarcaIds || []);
    const allowed = new Set(allIds.filter((id) => !blocked.has(id)));
    return findShortestPathInSet(startId, targetId, adjacency, allowed);
  }
  if (rule.kind === "mustIncludeAny") {
    const candidates = rule.comarcaIds || [];
    let best: string[] = [];
    candidates.forEach((nodeId: string) => {
      const first = findShortestPath(startId, nodeId, adjacency);
      const second = findShortestPath(nodeId, targetId, adjacency);
      if (!first.length || !second.length) return;
      const combined = first.concat(second.slice(1));
      if (!best.length || combined.length < best.length) {
        best = combined;
      }
    });
    return best.length ? best : findShortestPath(startId, targetId, adjacency);
  }
  return findShortestPath(startId, targetId, adjacency);
}

function resolveRule(def: any, ctx: any) {
  if (def.kind !== "avoid-random") return def;
  const pool = ctx.comarcaNames.filter(
    (name: string) => name !== ctx.startName && name !== ctx.targetName
  );
  const pick = pool.length ? pickRandom(pool, ctx.rng) : ctx.comarcaNames[0];
  return {
    id: `${def.id}-${normalizeName(pick).replace(/\s+/g, "-")}`,
    kind: "avoid",
    label: `No pots passar per ${pick}.`,
    comarques: [pick],
    difficulty: "medium"
  };
}

function prepareRule(def: any, ctx: any) {
  const resolved = resolveRule(def, ctx);
  const difficulty = resolved.difficulty || getRuleDifficulty(def);
  const tags = resolved.tags || getRuleTags(def);
  const names = resolved.comarques || [];
  const comarcaIds = names
    .map((name: string) => ctx.normalizedToId.get(normalizeName(name)))
    .filter(Boolean);
  return { ...resolved, comarcaIds, difficulty, tags };
}

function isRuleFeasible(rule: any, ctx: any) {
  if (!rule) return false;
  if (rule.kind === "avoid") {
    const blocked = rule.comarcaIds || [];
    if (!blocked.length) return false;
    const blockedSet = new Set(blocked);
    const allowed = new Set(ctx.allIds.filter((id: string) => !blockedSet.has(id)));
    return findShortestPathInSet(ctx.startId, ctx.targetId, ctx.adjacency, allowed).length > 0;
  }
  if (rule.kind === "mustIncludeAny") {
    const allowed = new Set(ctx.allIds);
    return rule.comarcaIds.some((id: string) =>
      hasPathViaNode(ctx.startId, ctx.targetId, id, ctx.adjacency, allowed)
    );
  }
  return true;
}

function pickRule(defs: any[], ctx: any) {
  const attempts = Math.max(defs.length * 3, 60);
  for (let i = 0; i < attempts; i += 1) {
    const def = pickRandom(defs, ctx.rng);
    const rule = prepareRule(def, ctx);
    if (rule.kind !== "avoid" && !rule.comarcaIds.length) continue;
    if (isRuleFeasible(rule, ctx)) return rule;
  }
  return null;
}

function buildLevel({
  rng,
  ids,
  names,
  normalizedToId,
  adjacency,
  minInternal,
  rulePool
}: {
  rng: () => number;
  ids: string[];
  names: string[];
  normalizedToId: Map<string, string>;
  adjacency: Map<string, Set<string>>;
  minInternal: number;
  rulePool: any[];
}) {
  const minLength = Math.max(minInternal + 2, 3);
  let start: string | null = null;
  let target: string | null = null;
  let shortest: string[] = [];
  let selectedRule: any = null;
  let attemptsLeft = 500;

  while (attemptsLeft > 0) {
    attemptsLeft -= 1;
    const candidateStart = pickRandom(ids, rng);
    const candidateTarget = pickRandom(ids, rng);
    if (candidateTarget === candidateStart) continue;
    const neighbors = adjacency.get(candidateStart);
    if (neighbors && neighbors.has(candidateTarget)) continue;
    const startName = names[ids.indexOf(candidateStart)];
    const targetName = names[ids.indexOf(candidateTarget)];
    const ctx = {
      rng,
      startId: candidateStart,
      targetId: candidateTarget,
      startName,
      targetName,
      comarcaNames: names,
      normalizedToId,
      adjacency,
      allIds: ids
    };
    const candidateRule = pickRule(rulePool, ctx);
    if (!candidateRule) continue;
    const path = findShortestPathWithRule(
      candidateStart,
      candidateTarget,
      adjacency,
      candidateRule,
      ids
    );
    if (!path.length) continue;
    if (path.length < minLength) continue;
    start = candidateStart;
    target = candidateTarget;
    shortest = path;
    selectedRule = candidateRule;
    break;
  }

  if (!start || !target) {
    start = ids[0];
    target = ids[1] || ids[0];
    shortest = findShortestPath(start, target, adjacency);
  }

  if (!selectedRule) {
    const ctx = {
      rng,
      startId: start,
      targetId: target,
      startName: names[ids.indexOf(start)],
      targetName: names[ids.indexOf(target)],
      comarcaNames: names,
      normalizedToId,
      adjacency,
      allIds: ids
    };
    selectedRule = pickRule(rulePool, ctx);
  }

  const avoidIds =
    selectedRule?.kind === "avoid" ? selectedRule.comarcaIds || [] : [];
  const mustPassIds =
    selectedRule?.kind === "mustIncludeAny" ? selectedRule.comarcaIds || [] : [];

  return {
    start_id: start,
    target_id: target,
    shortest_path: shortest,
    rule_id: selectedRule?.id || null,
    avoid_ids: avoidIds.length ? avoidIds : null,
    must_pass_ids: mustPassIds.length ? mustPassIds : null
  };
}

function getWeekKey(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / 604800000);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMadridParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    lookup[part.type] = part.value;
  });
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    weekday: lookup.weekday
  };
}

function getDayKeyFromParts(parts: { year: number; month: number; day: number }) {
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
}

const objectKey = Object.keys(topology.objects)[0];
const collection = feature(topology, topology.objects[objectKey]);
const ids = collection.features.map((featureItem: any) => featureItem.properties.id);
const names = collection.features.map((featureItem: any) => featureItem.properties.name);
const normalizedToId = new Map<string, string>();
collection.features.forEach((featureItem: any) => {
  normalizedToId.set(normalizeName(featureItem.properties.name), featureItem.properties.id);
});
const neighborIndex = topoNeighbors(topology.objects[objectKey].geometries || []);
const adjacencyMap = new Map<string, Set<string>>();
neighborIndex.forEach((neighbors: number[], index: number) => {
  adjacencyMap.set(
    ids[index],
    new Set(neighbors.map((neighborIndexItem) => ids[neighborIndexItem]))
  );
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const force = url.searchParams.get("force") === "1";
  const madrid = getMadridParts();
  const dayKey = getDayKeyFromParts(madrid);
  const localDate = new Date(Date.UTC(madrid.year, madrid.month - 1, madrid.day));
  const weekKey = getWeekKey(localDate);
  const isMonday = madrid.weekday === "Mon";
  const shouldRunNow = madrid.hour === 0 && madrid.minute >= 0 && madrid.minute <= 4;

  if (!force && !shouldRunNow && !mode) {
    return new Response(
      JSON.stringify({ ok: true, ran: false, reason: "fora_de_franges" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falten credencials de Supabase." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const highPool = RULE_DEFS.filter((def) => {
    const difficultyLevel = getRuleDifficulty(def);
    const tags = getRuleTags(def);
    const hasCultural = tags.includes("cultural");
    const hasGeo = tags.includes("geo");
    return difficultyLevel === "expert" && (hasCultural || hasGeo);
  });
  const rulePool = highPool.length ? highPool : RULE_DEFS;

  async function createLevel(targetMode: "daily" | "weekly") {
    if (targetMode === "daily") {
      const existing = await supabase
        .from("calendar_daily")
        .select("date")
        .eq("date", dayKey)
        .maybeSingle();
      if (existing.data) return { created: false, reason: "ja_existeix" };
    }

    if (targetMode === "weekly") {
      const existing = await supabase
        .from("calendar_weekly")
        .select("week_key")
        .eq("week_key", weekKey)
        .maybeSingle();
      if (existing.data) return { created: false, reason: "ja_existeix" };
    }

    const seed = targetMode === "daily" ? `${dayKey}-${difficultyId}` : `${weekKey}-${difficultyId}`;
    const rng = mulberry32(hashString(seed));
    const minInternal = targetMode === "daily" ? DAILY_MIN_INTERNAL : WEEKLY_MIN_INTERNAL;

    const levelData = buildLevel({
      rng,
      ids,
      names,
      normalizedToId,
      adjacency: adjacencyMap,
      minInternal,
      rulePool
    });

    const insertLevel = await supabase
      .from("levels")
      .insert({
        level_type: targetMode,
        date: targetMode === "daily" ? dayKey : null,
        week_key: targetMode === "weekly" ? weekKey : null,
        difficulty_id: difficultyId,
        rule_id: levelData.rule_id,
        start_id: levelData.start_id,
        target_id: levelData.target_id,
        shortest_path: levelData.shortest_path,
        avoid_ids: levelData.avoid_ids,
        must_pass_ids: levelData.must_pass_ids
      })
      .select("id")
      .single();

    if (insertLevel.error) {
      return { created: false, reason: insertLevel.error.message };
    }

    const levelId = insertLevel.data.id;
    if (targetMode === "daily") {
      const insertCalendar = await supabase
        .from("calendar_daily")
        .insert({ date: dayKey, level_id: levelId });
      if (insertCalendar.error) return { created: false, reason: insertCalendar.error.message };
    }

    if (targetMode === "weekly") {
      const insertCalendar = await supabase
        .from("calendar_weekly")
        .insert({ week_key: weekKey, level_id: levelId });
      if (insertCalendar.error) return { created: false, reason: insertCalendar.error.message };
    }

    return { created: true, levelId };
  }

  const runDaily = force || mode === "daily" || (!mode && shouldRunNow);
  const runWeekly = force || mode === "weekly" || (!mode && shouldRunNow && isMonday);

  const dailyResult = runDaily ? await createLevel("daily") : null;
  const weeklyResult = runWeekly ? await createLevel("weekly") : null;

  return new Response(
    JSON.stringify({
      ok: true,
      ranDaily: Boolean(runDaily),
      ranWeekly: Boolean(runWeekly),
      dailyResult,
      weeklyResult
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
