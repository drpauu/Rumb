import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { feature, neighbors as topoNeighbors } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  "gambes-palamos"
]);

const HARD_RULES = new Set([
  "ripolles",
  "noguera",
  "segarra",
  "solsones",
  "conca-barbera",
  "garrigues",
  "ribera-ebre",
  "urgell"
]);

const EXPERT_RULES = new Set([
  "val-aran",
  "alta-ribagorca",
  "pallars-sobira",
  "pallars-jussa",
  "terra-alta",
  "alt-urgell",
  "patum-bergueda",
  "priorat-vins"
]);

const RULE_TAGS = {
  "border-france": ["geo"],
  "border-andorra": ["geo"],
  "border-aragon": ["geo"],
  "border-valencia": ["geo"],
  "border-sea": ["geo"],
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
  "valles-occidental": ["geo"]
};

function getRuleDifficulty(def) {
  if (EXPERT_RULES.has(def.id)) return "expert";
  if (HARD_RULES.has(def.id)) return "hard";
  if (EASY_RULES.has(def.id)) return "easy";
  return "medium";
}

function getRuleTags(def) {
  return RULE_TAGS[def.id] || ["geo"];
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), t | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

function findShortestPath(startId, targetId, adjacency) {
  if (!startId || !targetId) return [];
  if (startId === targetId) return [startId];
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
      if (next === targetId) {
        const path = [targetId];
        let step = targetId;
        while (prev.has(step)) {
          step = prev.get(step);
          path.push(step);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function findShortestPathInSet(startId, targetId, adjacency, allowedSet) {
  if (!startId || !targetId) return [];
  if (!allowedSet.has(startId) || !allowedSet.has(targetId)) return [];
  if (startId === targetId) return [startId];
  const queue = [startId];
  const visited = new Set([startId]);
  const prev = new Map();

  while (queue.length) {
    const current = queue.shift();
    const neighbors = adjacency.get(current) || new Set();
    for (const next of neighbors) {
      if (visited.has(next) || !allowedSet.has(next)) continue;
      visited.add(next);
      prev.set(next, current);
      if (next === targetId) {
        const path = [targetId];
        let step = targetId;
        while (prev.has(step)) {
          step = prev.get(step);
          path.push(step);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function hasPathViaNode(startId, targetId, nodeId, adjacency, allowedSet) {
  if (!allowedSet.has(nodeId)) return false;
  const toNode = findShortestPathInSet(startId, nodeId, adjacency, allowedSet);
  if (!toNode.length) return false;
  const toTarget = findShortestPathInSet(nodeId, targetId, adjacency, allowedSet);
  return toTarget.length > 0;
}

function findShortestPathWithRule(startId, targetId, adjacency, rule, allIds) {
  if (!rule) return findShortestPath(startId, targetId, adjacency);
  if (rule.kind === "avoid") {
    const blocked = new Set(rule.comarcaIds || []);
    const allowed = new Set(allIds.filter((id) => !blocked.has(id)));
    return findShortestPathInSet(startId, targetId, adjacency, allowed);
  }
  if (rule.kind === "mustIncludeAny") {
    const candidates = rule.comarcaIds || [];
    let best = [];
    candidates.forEach((nodeId) => {
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

function resolveRule(def, ctx) {
  if (def.kind !== "avoid-random") return def;
  const pool = ctx.comarcaNames.filter(
    (name) => name !== ctx.startName && name !== ctx.targetName
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

function prepareRule(def, ctx) {
  const resolved = resolveRule(def, ctx);
  const difficulty = resolved.difficulty || getRuleDifficulty(def);
  const names = resolved.comarques || [];
  const comarcaIds = names
    .map((name) => ctx.normalizedToId.get(normalizeName(name)))
    .filter(Boolean);
  return { ...resolved, comarcaIds, difficulty };
}

function isRuleFeasible(rule, ctx) {
  if (!rule) return false;
  if (rule.kind === "avoid") {
    const blocked = rule.comarcaIds?.[0];
    if (!blocked) return false;
    const allowed = new Set(ctx.allIds.filter((id) => id !== blocked));
    return (
      findShortestPathInSet(ctx.startId, ctx.targetId, ctx.adjacency, allowed).length > 0
    );
  }
  if (rule.kind === "mustIncludeAny") {
    const allowed = new Set(ctx.allIds);
    return rule.comarcaIds.some((id) =>
      hasPathViaNode(ctx.startId, ctx.targetId, id, ctx.adjacency, allowed)
    );
  }
  return true;
}

function pickRule(defs, ctx) {
  const attempts = Math.max(defs.length * 3, 60);
  for (let i = 0; i < attempts; i += 1) {
    const def = pickRandom(defs, ctx.rng);
    const rule = prepareRule(def, ctx);
    if (rule.kind !== "avoid" && !rule.comarcaIds.length) continue;
    if (isRuleFeasible(rule, ctx)) return rule;
  }
  return null;
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / 604800000);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function loadTopology() {
  const topoPath = path.resolve(__dirname, "..", "public", "catalunya-comarques.topojson");
  const raw = fs.readFileSync(topoPath, "utf8");
  const topology = JSON.parse(raw);
  const objectKey = Object.keys(topology.objects)[0];
  const object = topology.objects[objectKey];
  const collection = feature(topology, object);
  const ids = collection.features.map((featureItem) => featureItem.properties.id);
  const names = collection.features.map((featureItem) => featureItem.properties.name);
  const normalizedToId = new Map();
  collection.features.forEach((featureItem) => {
    normalizedToId.set(normalizeName(featureItem.properties.name), featureItem.properties.id);
  });
  const neighborIndex = topoNeighbors(object.geometries || []);
  const adjacencyMap = new Map();
  neighborIndex.forEach((neighbors, index) => {
    adjacencyMap.set(
      ids[index],
      new Set(neighbors.map((neighborIndexItem) => ids[neighborIndexItem]))
    );
  });
  return { ids, names, normalizedToId, adjacencyMap, collection };
}

function buildLevel({ rng, ids, names, normalizedToId, adjacency, minInternal, rulePool }) {
  const minLength = Math.max(minInternal + 2, 3);
  const pool = rulePool.length ? rulePool : RULE_DEFS;
  let start = null;
  let target = null;
  let shortest = [];
  let selectedRule = null;
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
    const candidateRule = pickRule(pool, ctx);
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

async function run() {
  const mode = process.argv[2];
  if (!mode || !["daily", "weekly"].includes(mode)) {
    console.error("Usa: node scripts/generate-level.mjs daily|weekly");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Falten SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { ids, names, normalizedToId, adjacencyMap } = loadTopology();

  const today = new Date();
  const dayKey = getDayKey(today);
  const weekKey = getWeekKey(today);
  const difficultyId = "cap-colla-rutes";
  const seed = mode === "daily" ? `${dayKey}-${difficultyId}` : `${weekKey}-${difficultyId}`;
  const rng = mulberry32(hashString(seed));
  const minInternal = mode === "daily" ? 4 : 8;
  const highPool = RULE_DEFS.filter((def) => {
    const difficultyLevel = getRuleDifficulty(def);
    const tags = getRuleTags(def);
    const hasCultural = tags.includes("cultural");
    const hasGeo = tags.includes("geo");
    return difficultyLevel === "expert" && (hasCultural || hasGeo);
  });
  const rulePool = highPool.length ? highPool : RULE_DEFS;

  if (mode === "daily") {
    const existing = await supabase
      .from("calendar_daily")
      .select("date")
      .eq("date", dayKey)
      .maybeSingle();
    if (existing.data) {
      console.log("Ja existeix el nivell diari per avui.");
      return;
    }
  }

  if (mode === "weekly") {
    const existing = await supabase
      .from("calendar_weekly")
      .select("week_key")
      .eq("week_key", weekKey)
      .maybeSingle();
    if (existing.data) {
      console.log("Ja existeix el nivell setmanal per aquesta setmana.");
      return;
    }
  }

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
      level_type: mode,
      date: mode === "daily" ? dayKey : null,
      week_key: mode === "weekly" ? weekKey : null,
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
    throw insertLevel.error;
  }

  const levelId = insertLevel.data.id;
  if (mode === "daily") {
    const insertCalendar = await supabase
      .from("calendar_daily")
      .insert({ date: dayKey, level_id: levelId });
    if (insertCalendar.error) throw insertCalendar.error;
  }

  if (mode === "weekly") {
    const insertCalendar = await supabase
      .from("calendar_weekly")
      .insert({ week_key: weekKey, level_id: levelId });
    if (insertCalendar.error) throw insertCalendar.error;
  }

  console.log(`Nivell ${mode} creat: ${levelId}`);
}

run().catch((err) => {
  console.error("Error generant nivell:", err.message || err);
  process.exit(1);
});
