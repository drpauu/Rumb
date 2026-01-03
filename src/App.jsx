import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { feature, mesh, neighbors as topoNeighbors } from "topojson-client";
import confetti from "canvas-confetti";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 700;
const MAP_ID = "catalunya";
const DEFAULT_TIME_LIMIT_MS = 180000;
const LEADERBOARD_KEY = "rumb-leaderboard-v2";
const HISTORY_KEY = "rumb-history-v1";
const ACHIEVEMENTS_KEY = "rumb-achievements-v2";
const PLAYER_KEY = "rumb-player-id";
const STREAK_KEY = "rumb-daily-streak-v1";
const WEEKLY_KEY = "rumb-weekly-v1";
const THEMES_KEY = "rumb-themes-v1";
const ACTIVE_THEME_KEY = "rumb-theme-active-v1";
const COLLECTIBLES_KEY = "rumb-segells-v1";
const GROUP_KEY = "rumb-group-v1";

const DIFFICULTIES = [
  {
    id: "facil",
    label: "Fàcil",
    ruleLevels: ["easy"],
    minLength: 4,
    timeLimitMs: 210000,
    hintsDisabled: false,
    fog: false
  },
  {
    id: "mitja",
    label: "Mitjà",
    ruleLevels: ["medium"],
    minLength: 4,
    timeLimitMs: 180000,
    hintsDisabled: false,
    fog: false
  },
  {
    id: "dificil",
    label: "Difícil",
    ruleLevels: ["hard"],
    minLength: 5,
    timeLimitMs: 150000,
    hintsDisabled: true,
    fog: true
  },
  {
    id: "expert",
    label: "Expert",
    ruleLevels: ["expert"],
    minLength: 6,
    timeLimitMs: 120000,
    hintsDisabled: true,
    fog: true
  }
];

const GAME_MODES = [
  { id: "normal", label: "Normal" },
  { id: "daily", label: "Diari" },
  { id: "weekly", label: "Setmanal" },
  { id: "event", label: "Esdeveniment" },
  { id: "speedrun", label: "Speedrun" },
  { id: "timed", label: "Contrarellotge" },
  { id: "explore", label: "Explora" }
];

const POWERUPS = [
  {
    id: "reveal-next",
    label: "Revela un pas",
    durationMs: 6000,
    uses: { facil: 2, mitja: 1, dificil: 1, expert: 0 }
  },
  {
    id: "temp-neighbors",
    label: "Veïnes (10s)",
    durationMs: 10000,
    uses: { facil: 2, mitja: 1, dificil: 1, expert: 0 }
  },
  {
    id: "temp-initials",
    label: "Inicials (10s)",
    durationMs: 10000,
    uses: { facil: 2, mitja: 1, dificil: 0, expert: 0 }
  }
];

const THEMES = [
  {
    id: "default",
    label: "Clàssic",
    vars: {
      "--bg": "#0f1114",
      "--panel": "#1a1d22",
      "--text": "#f7f6f2",
      "--muted": "#a8acb3",
      "--accent": "#59a6a2",
      "--accent-strong": "#2e6fda",
      "--success": "#2f8f4d",
      "--error": "#d6453a",
      "--stroke": "#202225",
      "--guess": "#f7e7a3"
    }
  },
  {
    id: "terra",
    label: "Terra Viva",
    vars: {
      "--bg": "#15130f",
      "--panel": "#221c16",
      "--text": "#f3ede4",
      "--muted": "#b7a99a",
      "--accent": "#c0865e",
      "--accent-strong": "#9c5f2e",
      "--success": "#4c8f6a",
      "--error": "#d45a47",
      "--stroke": "#2a1f18",
      "--guess": "#f0d9a2"
    }
  },
  {
    id: "mar",
    label: "Mar Blava",
    vars: {
      "--bg": "#0d1318",
      "--panel": "#16202a",
      "--text": "#e7f0f6",
      "--muted": "#9fb2c4",
      "--accent": "#4bb3d1",
      "--accent-strong": "#1f6f9a",
      "--success": "#3c9b7a",
      "--error": "#d0564a",
      "--stroke": "#0f1a22",
      "--guess": "#f2e1a3"
    }
  },
  {
    id: "pinyer",
    label: "Pinyer",
    vars: {
      "--bg": "#0f1410",
      "--panel": "#1b231a",
      "--text": "#edf5e8",
      "--muted": "#a6b7a2",
      "--accent": "#6bb274",
      "--accent-strong": "#3a7c49",
      "--success": "#4e9b5f",
      "--error": "#d65b4a",
      "--stroke": "#1a241a",
      "--guess": "#f0e0a2"
    }
  },
  {
    id: "nit",
    label: "Nit Lliure",
    vars: {
      "--bg": "#111115",
      "--panel": "#1d1e24",
      "--text": "#f5f2f0",
      "--muted": "#a6a5af",
      "--accent": "#e1a954",
      "--accent-strong": "#ba6a2b",
      "--success": "#2f8f4d",
      "--error": "#d6453a",
      "--stroke": "#232329",
      "--guess": "#f7e3a0"
    }
  }
];

const WEEKLY_MISSIONS = [
  {
    id: "setmana-costa",
    label: "Ruta a la Costa Brava",
    ruleId: "costa-brava",
    rewardTheme: "mar"
  },
  {
    id: "setmana-pirineu",
    label: "Travessa del Pirineu",
    ruleId: "pallars-sobira",
    rewardTheme: "pinyer"
  },
  {
    id: "setmana-vins",
    label: "Ruta de vins i caves",
    ruleId: "priorat-vins",
    rewardTheme: "terra"
  },
  {
    id: "setmana-capitals",
    label: "Ruta de capitals",
    ruleId: "barcelona-capital",
    rewardTheme: "nit"
  }
];

const EVENTS = [
  {
    id: "patum",
    label: "Setmana de la Patum",
    start: "06-18",
    end: "06-25",
    ruleId: "patum-bergueda",
    theme: "terra"
  },
  {
    id: "mercè",
    label: "La Mercè",
    start: "09-20",
    end: "09-26",
    ruleId: "barcelona-capital",
    theme: "nit"
  },
  {
    id: "temps-flors",
    label: "Temps de Flors",
    start: "05-07",
    end: "05-15",
    ruleId: "girona-capital",
    theme: "pinyer"
  },
  {
    id: "calcotada",
    label: "Calçotada Popular",
    start: "01-15",
    end: "02-15",
    ruleId: "calcots-valls",
    theme: "terra"
  }
];

const REGIONS = [
  {
    id: "barcelona",
    label: "Barcelona",
    comarques: [
      "Alt Penedès",
      "Anoia",
      "Bages",
      "Baix Llobregat",
      "Barcelonès",
      "Berguedà",
      "Garraf",
      "Maresme",
      "Osona",
      "Vallès Occidental",
      "Vallès Oriental"
    ]
  },
  {
    id: "girona",
    label: "Girona",
    comarques: [
      "Alt Empordà",
      "Baix Empordà",
      "Garrotxa",
      "Gironès",
      "Pla de l'Estany",
      "Ripollès",
      "Selva",
      "Cerdanya"
    ]
  },
  {
    id: "lleida",
    label: "Lleida",
    comarques: [
      "Alt Urgell",
      "Alta Ribagorça",
      "Garrigues",
      "Noguera",
      "Pallars Jussà",
      "Pallars Sobirà",
      "Pla d'Urgell",
      "Segarra",
      "Segrià",
      "Solsonès",
      "Urgell",
      "Val d'Aran"
    ]
  },
  {
    id: "tarragona",
    label: "Tarragona",
    comarques: [
      "Alt Camp",
      "Baix Camp",
      "Baix Ebre",
      "Baix Penedès",
      "Conca de Barberà",
      "Montsià",
      "Priorat",
      "Ribera d'Ebre",
      "Tarragonès",
      "Terra Alta"
    ]
  }
];

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
    label: "Has d'anar per la Plana de Vic (Osona).",
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
    label: "Has de passar per Montserrat (Bages).",
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
    label: "Has de passar per la Patum (Berguedà).",
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
    label: "Has de passar per Igualada (Anoia).",
    comarques: ["Anoia"]
  },
  {
    id: "cap-creus",
    kind: "mustIncludeAny",
    label: "Has de passar pel Cap de Creus (Alt Empordà).",
    comarques: ["Alt Empordà"]
  },
  {
    id: "reus-baix-camp",
    kind: "mustIncludeAny",
    label: "Has de passar per Reus (Baix Camp).",
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
    label: "Has de passar per la Seu d'Urgell (Alt Urgell).",
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
  "patum-bergueda",
  "ripolles",
  "noguera",
  "segarra",
  "solsones",
  "conca-barbera",
  "garrigues",
  "ribera-ebre",
  "urgell",
  "priorat-vins"
]);

const EXPERT_RULES = new Set([
  "val-aran",
  "alta-ribagorca",
  "pallars-sobira",
  "pallars-jussa",
  "terra-alta",
  "alt-urgell"
]);

const ACHIEVEMENTS = [
  { id: "ruta-perfecta", label: "Ruta perfecta (camí més curt)" },
  { id: "sense-pistes", label: "Sense pistes" },
  { id: "rapid", label: "Menys d'1 minut" },
  { id: "ruta-neta", label: "Ruta neta (sense extra)" },
  { id: "marato", label: "Marató (8+ comarques)", rewardTheme: "terra" },
  { id: "sense-repeticions", label: "Sense repeticions" },
  { id: "setmana-complerta", label: "Missió setmanal superada" },
  { id: "event-festa", label: "Esdeveniment completat" },
  { id: "streak-7", label: "7 dies seguits", rewardTheme: "pinyer" },
  { id: "streak-30", label: "30 dies seguits" },
  { id: "speedrun-rapid", label: "Speedrun sota 1:30", rewardTheme: "nit" },
  { id: "secret-perfecta", label: "Ruta impecable", secret: true },
  { id: "secret-explorador", label: "Col·leccionista de segells", secret: true }
];

function pickRandom(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getInitials(value) {
  const skip = new Set(["el", "la", "les", "l", "de", "del", "d", "dels"]);
  return value
    .replace(/'/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !skip.has(token.toLowerCase()))
    .map((token) => token[0].toUpperCase())
    .join("");
}

function formatTime(ms) {
  if (!Number.isFinite(ms)) return "—";
  const total = Math.max(ms, 0);
  const seconds = Math.floor(total / 1000);
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

function getRuleDifficulty(def) {
  if (EXPERT_RULES.has(def.id)) return "expert";
  if (HARD_RULES.has(def.id)) return "hard";
  if (EASY_RULES.has(def.id)) return "easy";
  return "medium";
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getDayKeyOffset(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return getDayKey(date);
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

function getActiveEvent(date = new Date()) {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return EVENTS.find((event) => {
    if (event.start <= event.end) {
      return key >= event.start && key <= event.end;
    }
    return key >= event.start || key <= event.end;
  });
}

function getStreakTitle(streak) {
  if (streak >= 30) return "Mestre dels Camins";
  if (streak >= 14) return "Cartògraf del Dia";
  if (streak >= 7) return "Ruter Constant";
  if (streak >= 3) return "Caminant";
  return "Explorador";
}

function getWeeklyMission(weekKey) {
  const seed = hashString(weekKey);
  const rng = mulberry32(seed);
  return pickRandom(WEEKLY_MISSIONS, rng);
}

function getThemeById(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES[0];
}

function getPowerupUses(difficultyId) {
  const uses = {};
  POWERUPS.forEach((powerup) => {
    uses[powerup.id] = powerup.uses[difficultyId] ?? 0;
  });
  return uses;
}

function formatRuleDifficulty(value) {
  if (value === "easy") return "Fàcil";
  if (value === "medium") return "Mitjà";
  if (value === "hard") return "Difícil";
  if (value === "expert") return "Expert";
  return "—";
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
    return findShortestPathInSet(ctx.startId, ctx.targetId, ctx.adjacency, allowed).length > 0;
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

function evaluateRule(rule, ctx) {
  if (!rule) return { satisfied: true, failed: false };
  if (rule.kind === "avoid") {
    const forbidden = rule.comarcaIds?.[0];
    if (!forbidden) return { satisfied: true, failed: false };
    const isForbidden = ctx.guessedSet.has(forbidden);
    return { satisfied: !isForbidden, failed: isForbidden };
  }
  if (rule.kind === "mustIncludeAny") {
    const has = rule.comarcaIds.some(
      (id) => ctx.allowedSet.has(id) && hasPathViaNode(ctx.startId, ctx.targetId, id, ctx.adjacency, ctx.allowedSet)
    );
    return { satisfied: has, failed: false };
  }
  return { satisfied: true, failed: false };
}

function getPlayerId() {
  if (typeof window === "undefined") return "anon";
  const stored = localStorage.getItem(PLAYER_KEY);
  if (stored) return stored;
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(PLAYER_KEY, id);
  return id;
}

export default function App() {
  const [comarques, setComarques] = useState([]);
  const [adjacency, setAdjacency] = useState(new Map());
  const [startId, setStartId] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [outline, setOutline] = useState(null);
  const [guessHistory, setGuessHistory] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [guessValue, setGuessValue] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [showNeighborHint, setShowNeighborHint] = useState(false);
  const [showNextHint, setShowNextHint] = useState(false);
  const [showInitials, setShowInitials] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [shortestPath, setShortestPath] = useState([]);
  const [activeRule, setActiveRule] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [gameMode, setGameMode] = useState(() => {
    if (typeof window === "undefined") return "normal";
    return localStorage.getItem("rumb-mode") || "normal";
  });
  const [difficulty, setDifficulty] = useState(() => {
    if (typeof window === "undefined") return "mitja";
    const stored =
      localStorage.getItem("rumb-difficulty") || localStorage.getItem("rumb-level");
    if (DIFFICULTIES.some((entry) => entry.id === stored)) return stored;
    if (stored === "1") return "facil";
    if (stored === "2") return "mitja";
    if (stored === "3") return "dificil";
    if (stored === "4") return "expert";
    return "mitja";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("rumb-sound") === "1";
  });
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem(ACTIVE_THEME_KEY) || "default";
  });
  const [unlockedThemes, setUnlockedThemes] = useState(() => {
    if (typeof window === "undefined") return new Set(["default"]);
    const raw = localStorage.getItem(THEMES_KEY);
    if (!raw) return new Set(["default"]);
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : ["default"];
      return new Set(list);
    } catch {
      return new Set(["default"]);
    }
  });
  const [collectibles, setCollectibles] = useState(() => {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(COLLECTIBLES_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [dailyStreak, setDailyStreak] = useState(() => {
    if (typeof window === "undefined") return { count: 0, lastDate: null };
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDate: null };
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? parsed
        : { count: 0, lastDate: null };
    } catch {
      return { count: 0, lastDate: null };
    }
  });
  const [completedWeeks, setCompletedWeeks] = useState(() => {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(WEEKLY_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [groupCode, setGroupCode] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("group") || localStorage.getItem(GROUP_KEY) || "";
  });
  const [rankingScope, setRankingScope] = useState("global");
  const [powerups, setPowerups] = useState({});
  const [tempRevealId, setTempRevealId] = useState(null);
  const [tempNeighborHint, setTempNeighborHint] = useState(false);
  const [tempInitialsHint, setTempInitialsHint] = useState(false);
  const [replayMode, setReplayMode] = useState(null);
  const [replayOrder, setReplayOrder] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState("idle");
  const [lastEntryId, setLastEntryId] = useState(null);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [groupCopyStatus, setGroupCopyStatus] = useState("idle");
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return new Set(parsed);
    } catch {
      return new Set();
    }
  });

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const copyTimerRef = useRef(null);
  const groupCopyTimerRef = useRef(null);
  const hintTimersRef = useRef({});
  const replayTimerRef = useRef(null);
  const audioRef = useRef(null);
  const playerIdRef = useRef(getPlayerId());

  const leaderboardEndpoint = import.meta.env.VITE_LEADERBOARD_URL || "";
  const isExploreMode = gameMode === "explore";
  const isTimedMode = gameMode === "timed";
  const isSpeedrunMode = gameMode === "speedrun";
  const isWeeklyMode = gameMode === "weekly";
  const isEventMode = gameMode === "event";
  const difficultyConfig = useMemo(() => {
    return DIFFICULTIES.find((entry) => entry.id === difficulty) || DIFFICULTIES[1];
  }, [difficulty]);
  const timeLimitMs = difficultyConfig.timeLimitMs || DEFAULT_TIME_LIMIT_MS;
  const timeLeftMs = Math.max(timeLimitMs - elapsedMs, 0);
  const weekKey = useMemo(() => getWeekKey(), []);
  const weeklyMission = useMemo(() => getWeeklyMission(weekKey), [weekKey]);
  const activeEvent = useMemo(() => getActiveEvent(), []);
  const displayStreak = useMemo(() => {
    if (!dailyStreak.lastDate) return 0;
    const today = getDayKey();
    const yesterday = getDayKeyOffset(-1);
    if (dailyStreak.lastDate === today || dailyStreak.lastDate === yesterday) {
      return dailyStreak.count || 0;
    }
    return 0;
  }, [dailyStreak]);
  const streakTitle = getStreakTitle(displayStreak);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("rumb-mode", gameMode);
    localStorage.setItem("rumb-difficulty", difficulty);
    localStorage.setItem("rumb-sound", soundEnabled ? "1" : "0");
    localStorage.setItem(ACTIVE_THEME_KEY, activeTheme);
    localStorage.setItem(GROUP_KEY, groupCode);
  }, [gameMode, difficulty, soundEnabled, activeTheme, groupCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEMES_KEY, JSON.stringify([...unlockedThemes]));
  }, [unlockedThemes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(COLLECTIBLES_KEY, JSON.stringify([...collectibles]));
  }, [collectibles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(WEEKLY_KEY, JSON.stringify([...completedWeeks]));
  }, [completedWeeks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  }, [history]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const theme = getThemeById(activeTheme);
    Object.entries(theme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [activeTheme]);

  useEffect(() => {
    if (!unlockedThemes.has(activeTheme)) {
      setActiveTheme("default");
    }
  }, [unlockedThemes, activeTheme]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const response = await fetch("/catalunya-comarques.topojson");
      const topology = await response.json();
      const objectKey = Object.keys(topology.objects)[0];
      const object = topology.objects[objectKey];
      const collection = feature(topology, object);
      const outlineMesh = mesh(topology, object, (a, b) => a === b);
      const ids = collection.features.map((featureItem) => featureItem.properties.id);
      const neighborIndex = topoNeighbors(object.geometries || []);
      const adjacencyMap = new Map();
      neighborIndex.forEach((neighbors, index) => {
        adjacencyMap.set(
          ids[index],
          new Set(neighbors.map((neighborIndexItem) => ids[neighborIndexItem]))
        );
      });
      if (!cancelled) {
        setComarques(collection.features || []);
        setAdjacency(adjacencyMap);
        setOutline(outlineMesh);
      }
    }

    loadData().catch(() => {
      if (!cancelled) {
        setComarques([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const zoomBehavior = zoom()
      .scaleExtent([0.8, 6])
      .on("zoom", (event) => {
        select(gRef.current).attr("transform", event.transform);
      });

    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      svg.on(".zoom", null);
    };
  }, [comarques.length]);

  useEffect(() => {
    if (!startedAt || isComplete || isFailed || isExploreMode) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);
    return () => clearInterval(interval);
  }, [startedAt, isComplete, isFailed, isExploreMode]);

  useEffect(() => {
    if (!isTimedMode || !startedAt || isComplete || isFailed) return;
    if (timeLeftMs <= 0) {
      setIsFailed(true);
      setShowModal(true);
      setResultData((prev) =>
        prev || {
          failed: true,
          attempts,
          timeMs: elapsedMs,
          playerPath: guessHistory,
          ruleLabel: activeRule?.label || "Sense norma",
          ruleDifficulty: activeRule?.difficulty || null,
          shortestPath: [],
          shortestCount: 0,
          distance: 0,
          mode: gameMode,
          difficulty,
          streak: displayStreak
        }
      );
    }
  }, [
    gameMode,
    startedAt,
    timeLeftMs,
    isComplete,
    isFailed,
    attempts,
    elapsedMs,
    guessHistory,
    activeRule,
    difficulty,
    dailyStreak
  ]);

  useEffect(() => {
    if (!comarques.length || !adjacency.size) return;
    resetGame();
  }, [comarques, adjacency, gameMode, difficulty, weeklyMission?.id, activeEvent?.id]);

  useEffect(() => {
    if (!leaderboardEndpoint && typeof window === "undefined") return;
    loadLeaderboard();
  }, [leaderboardEndpoint]);

  useEffect(() => {
    if (gameMode === "event" && !activeEvent) {
      setGameMode("normal");
    }
  }, [gameMode, activeEvent]);

  const comarcaById = useMemo(() => {
    return new Map(comarques.map((featureItem) => [featureItem.properties.id, featureItem]));
  }, [comarques]);

  const regionByName = useMemo(() => {
    const map = new Map();
    REGIONS.forEach((region) => {
      region.comarques.forEach((name) => {
        map.set(name, region);
      });
    });
    return map;
  }, []);

  const sortedNames = useMemo(() => {
    return comarques
      .map((featureItem) => featureItem.properties.name)
      .sort((a, b) => a.localeCompare(b, "ca"));
  }, [comarques]);

  const normalizedToId = useMemo(() => {
    const map = new Map();
    comarques.forEach((featureItem) => {
      const name = featureItem.properties.name;
      map.set(normalizeName(name), featureItem.properties.id);
    });
    return map;
  }, [comarques]);

  const initialsById = useMemo(() => {
    const map = new Map();
    comarques.forEach((featureItem) => {
      map.set(featureItem.properties.id, getInitials(featureItem.properties.name));
    });
    return map;
  }, [comarques]);

  const suggestions = useMemo(() => {
    const query = normalizeName(guessValue);
    if (!query) return [];
    return sortedNames
      .filter((name) => normalizeName(name).includes(query))
      .slice(0, 8);
  }, [guessValue, sortedNames]);

  const guessedIds = useMemo(() => {
    return [...new Set(guessHistory.map((entry) => entry.id))];
  }, [guessHistory]);

  const guessedSet = useMemo(() => new Set(guessedIds), [guessedIds]);

  const allowedSet = useMemo(() => {
    const ids = [...guessedIds];
    if (startId) ids.push(startId);
    if (targetId) ids.push(targetId);
    return new Set(ids);
  }, [guessedIds, startId, targetId]);

  const pathInGuesses = useMemo(() => {
    if (!startId || !targetId || !adjacency.size) return [];
    return findShortestPathInSet(startId, targetId, adjacency, allowedSet);
  }, [startId, targetId, adjacency, allowedSet]);

  const ruleStatus = useMemo(() => {
    return evaluateRule(activeRule, {
      startId,
      targetId,
      adjacency,
      allowedSet,
      guessedSet
    });
  }, [activeRule, startId, targetId, adjacency, allowedSet, guessedSet]);

  const hintsBlocked = difficultyConfig.hintsDisabled;
  const showNeighborHintActive = (showNeighborHint && !hintsBlocked) || tempNeighborHint;
  const showNextHintActive = showNextHint && !hintsBlocked;
  const showInitialsActive = (showInitials && !hintsBlocked) || tempInitialsHint;

  const replaySet = useMemo(() => {
    if (!replayOrder.length || replayIndex <= 0) return new Set();
    return new Set(replayOrder.slice(0, replayIndex));
  }, [replayOrder, replayIndex]);

  const neighborSet = useMemo(() => {
    if (!showNeighborHintActive || !currentId) return new Set();
    return adjacency.get(currentId) || new Set();
  }, [showNeighborHintActive, currentId, adjacency]);

  const nextHintId = useMemo(() => {
    if (!showNextHintActive || !shortestPath.length) return null;
    return (
      shortestPath.find(
        (id) => id !== startId && id !== targetId && !guessedSet.has(id)
      ) || null
    );
  }, [showNextHintActive, shortestPath, guessedSet, startId, targetId]);

  const { paths, viewBox, outlinePath } = useMemo(() => {
    if (!comarques.length) {
      return {
        paths: [],
        viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
        outlinePath: null
      };
    }

    const collection = {
      type: "FeatureCollection",
      features: comarques
    };

    const projection = geoMercator().fitSize([VIEW_WIDTH, VIEW_HEIGHT], collection);
    const generator = geoPath(projection);

    const mapped = comarques.map((featureItem) => ({
      id: featureItem.properties.id,
      name: featureItem.properties.name,
      path: generator(featureItem),
      centroid: generator.centroid(featureItem)
    }));

    return {
      paths: mapped,
      viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
      outlinePath: outline && !difficultyConfig.fog ? generator(outline) : null
    };
  }, [comarques, outline, difficultyConfig.fog]);

  useEffect(() => {
    if (isExploreMode || isComplete || isFailed) return;
    if (!pathInGuesses.length || !ruleStatus.satisfied) return;
    finishGame(pathInGuesses);
  }, [isExploreMode, isComplete, isFailed, pathInGuesses, ruleStatus]);

  useEffect(() => {
    if (!replayMode || !replayOrder.length) return;
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    replayTimerRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= replayOrder.length) {
          if (replayTimerRef.current) clearInterval(replayTimerRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 450);
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayMode, replayOrder]);

  useEffect(() => {
    if (!replayMode || !replayOrder.length) return;
    if (replayIndex >= replayOrder.length) {
      const timeout = setTimeout(() => {
        setReplayMode(null);
        setReplayOrder([]);
        setReplayIndex(0);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [replayIndex, replayMode, replayOrder.length]);

  function playTone(frequency) {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  function resetGame() {
    if (!comarques.length) return;
    const ids = comarques.map((featureItem) => featureItem.properties.id);
    const todayKey = getDayKey();
    const seed =
      gameMode === "daily"
        ? `${todayKey}-${difficulty}`
        : gameMode === "weekly"
          ? `${weekKey}-${difficulty}`
          : gameMode === "event"
            ? `${activeEvent?.id || todayKey}-${difficulty}`
            : null;
    const rng = seed ? mulberry32(hashString(seed)) : Math.random;
    const minLength = difficultyConfig.minLength || 4;
    const comarcaNames = comarques.map((featureItem) => featureItem.properties.name);
    const allowedLevels = difficultyConfig.ruleLevels || ["medium"];
    const rulePool = RULE_DEFS.filter((def) =>
      allowedLevels.includes(getRuleDifficulty(def))
    );
    const pool = rulePool.length ? rulePool : RULE_DEFS;
    const forcedRuleId = isWeeklyMode
      ? weeklyMission?.ruleId
      : isEventMode
        ? activeEvent?.ruleId
        : null;
    const forcedRuleDef = forcedRuleId
      ? RULE_DEFS.find((def) => def.id === forcedRuleId)
      : null;
    let start = null;
    let target = null;
    let nextShortest = [];
    let selectedRule = null;
    let attemptsLeft = 500;

    while (attemptsLeft > 0) {
      attemptsLeft -= 1;
      const candidateStart = pickRandom(ids, rng);
      const candidateTarget = pickRandom(ids, rng);
      if (candidateTarget === candidateStart) continue;
      const neighbors = adjacency.get(candidateStart);
      if (neighbors && neighbors.has(candidateTarget)) continue;
      const path = findShortestPath(candidateStart, candidateTarget, adjacency);
      if (!path.length) continue;
      if (path.length < minLength) continue;
      const startName = comarcaById.get(candidateStart)?.properties.name;
      const targetName = comarcaById.get(candidateTarget)?.properties.name;
      const ctx = {
        rng,
        startId: candidateStart,
        targetId: candidateTarget,
        startName,
        targetName,
        comarcaNames,
        normalizedToId,
        adjacency,
        allIds: ids
      };
      const candidateRule = forcedRuleDef
        ? prepareRule(forcedRuleDef, ctx)
        : pickRule(pool, ctx);
      if (!candidateRule) continue;
      if (forcedRuleDef && !isRuleFeasible(candidateRule, ctx)) continue;
      start = candidateStart;
      target = candidateTarget;
      nextShortest = path;
      selectedRule = candidateRule;
      break;
    }

    if (!start || !target || !selectedRule) {
      let fallbackAttempts = 500;
      while (fallbackAttempts > 0) {
        fallbackAttempts -= 1;
        const candidateStart = pickRandom(ids, rng);
        const candidateTarget = pickRandom(ids, rng);
        if (candidateTarget === candidateStart) continue;
        const neighbors = adjacency.get(candidateStart);
        if (neighbors && neighbors.has(candidateTarget)) continue;
        const path = findShortestPath(candidateStart, candidateTarget, adjacency);
        if (!path.length) continue;
        const startName = comarcaById.get(candidateStart)?.properties.name;
        const targetName = comarcaById.get(candidateTarget)?.properties.name;
        const ctx = {
          rng,
          startId: candidateStart,
          targetId: candidateTarget,
          startName,
          targetName,
          comarcaNames,
          normalizedToId,
          adjacency,
          allIds: ids
        };
        const candidateRule = pickRule(pool, ctx);
        if (!candidateRule) continue;
        start = candidateStart;
        target = candidateTarget;
        nextShortest = path;
        selectedRule = candidateRule;
        break;
      }
    }
    if (!start || !target) {
      start = ids[0];
      target = ids[1] || ids[0];
      nextShortest = findShortestPath(start, target, adjacency);
    }
    if (!selectedRule) {
      const startName = comarcaById.get(start)?.properties.name;
      const targetName = comarcaById.get(target)?.properties.name;
      selectedRule = pickRule(pool, {
        rng,
        startId: start,
        targetId: target,
        startName,
        targetName,
        comarcaNames,
        normalizedToId,
        adjacency,
        allIds: ids
      });
    }

    setStartId(start);
    setTargetId(target);
    setCurrentId(start);
    setGuessHistory([]);
    setAttempts(0);
    setHintsUsed(0);
    setHintLevel(0);
    setShowNeighborHint(false);
    setShowNextHint(false);
    setShowInitials(false);
    setTempRevealId(null);
    setTempNeighborHint(false);
    setTempInitialsHint(false);
    setPowerups(getPowerupUses(difficulty));
    setReplayMode(null);
    setReplayOrder([]);
    setReplayIndex(0);
    setGuessValue("");
    setIsSuggestionsOpen(false);
    setIsComplete(false);
    setIsFailed(false);
    setShowModal(false);
    setResultData(null);
    setShortestPath(nextShortest);
    setActiveRule(selectedRule);
    setElapsedMs(0);
    setStartedAt(isTimedMode ? Date.now() : null);
    setLastEntryId(null);
    setCopyStatus("idle");
  }

  function handleHintStep() {
    if (hintsBlocked) return;
    const nextLevel = Math.min(hintLevel + 1, 3);
    setHintLevel(nextLevel);
    setHintsUsed((prev) => prev + 1);
    if (nextLevel >= 1) setShowNeighborHint(true);
    if (nextLevel >= 2) setShowNextHint(true);
    if (nextLevel >= 3) setShowInitials(true);
  }

  function activateTempHint(key, durationMs, setter, resetValue) {
    if (hintTimersRef.current[key]) {
      clearTimeout(hintTimersRef.current[key]);
    }
    setter(resetValue === undefined ? true : resetValue);
    hintTimersRef.current[key] = setTimeout(() => {
      setter(resetValue === undefined ? false : null);
    }, durationMs);
  }

  function handlePowerupUse(powerupId) {
    if (isComplete || isFailed || isExploreMode) return;
    if (!powerups[powerupId]) return;
    if (powerupId === "reveal-next") {
      const revealId =
        shortestPath.find(
          (id) => id !== startId && id !== targetId && !guessedSet.has(id)
        ) || null;
      if (!revealId) return;
      setPowerups((prev) => ({
        ...prev,
        [powerupId]: Math.max((prev[powerupId] || 0) - 1, 0)
      }));
      setHintsUsed((prev) => prev + 1);
      if (hintTimersRef.current.reveal) clearTimeout(hintTimersRef.current.reveal);
      setTempRevealId(revealId);
      hintTimersRef.current.reveal = setTimeout(() => {
        setTempRevealId(null);
      }, POWERUPS.find((item) => item.id === powerupId)?.durationMs || 6000);
      return;
    }
    setPowerups((prev) => ({
      ...prev,
      [powerupId]: Math.max((prev[powerupId] || 0) - 1, 0)
    }));
    setHintsUsed((prev) => prev + 1);
    if (powerupId === "temp-neighbors") {
      const duration =
        POWERUPS.find((item) => item.id === powerupId)?.durationMs || 10000;
      activateTempHint("neighbors", duration, setTempNeighborHint);
      return;
    }
    if (powerupId === "temp-initials") {
      const duration =
        POWERUPS.find((item) => item.id === powerupId)?.durationMs || 10000;
      activateTempHint("initials", duration, setTempInitialsHint);
    }
  }

  function handleGuessSubmit(event) {
    event.preventDefault();
    if (!startId || !targetId || isComplete || isFailed || isExploreMode) return;

    const trimmed = guessValue.trim();
    if (!trimmed) return;

    const normalized = normalizeName(trimmed);
    const id = normalizedToId.get(normalized);
    if (!id) return;

    if (!startedAt && !isTimedMode) {
      setStartedAt(Date.now());
    }

    setAttempts((prev) => prev + 1);
    setCurrentId(id);
    setGuessValue("");
    setIsSuggestionsOpen(false);

    if (id === startId || id === targetId) {
      playTone(440);
      return;
    }

    const alreadyGuessed = guessedSet.has(id);
    if (!alreadyGuessed) {
      const name = comarcaById.get(id)?.properties.name || trimmed;
      setGuessHistory((prev) => [...prev, { id, name }]);
      playTone(520);
    } else {
      playTone(240);
    }
  }

  function handleGuessChange(event) {
    setGuessValue(event.target.value);
    setIsSuggestionsOpen(true);
  }

  function handleGuessFocus() {
    setIsSuggestionsOpen(true);
  }

  function handleGuessBlur() {
    setTimeout(() => setIsSuggestionsOpen(false), 150);
  }

  function handleSuggestionPick(name) {
    setGuessValue(name);
    setIsSuggestionsOpen(false);
  }

  function handleStartNext() {
    resetGame();
  }

  function handleZoomIn() {
    if (!zoomRef.current || !svgRef.current) return;
    select(svgRef.current).call(zoomRef.current.scaleBy, 1.2);
  }

  function handleZoomOut() {
    if (!zoomRef.current || !svgRef.current) return;
    select(svgRef.current).call(zoomRef.current.scaleBy, 0.85);
  }

  function handleRecenter() {
    if (!zoomRef.current || !svgRef.current) return;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }

  function handleThemeSelect(themeId) {
    if (!unlockedThemes.has(themeId)) return;
    setActiveTheme(themeId);
  }

  function handleGroupInvite() {
    const code = groupCode.trim();
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?group=${encodeURIComponent(
      code
    )}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setGroupCopyStatus("copied");
        if (groupCopyTimerRef.current) clearTimeout(groupCopyTimerRef.current);
        groupCopyTimerRef.current = setTimeout(() => {
          setGroupCopyStatus("idle");
        }, 1500);
      });
    }
  }

  function handleReplayStart(mode) {
    if (!isComplete || !startId || !targetId) return;
    const order =
      mode === "shortest"
        ? shortestPath.filter((id) => id !== startId && id !== targetId)
        : guessHistory.map((entry) => entry.id);
    if (!order.length) return;
    setReplayMode(mode);
    setReplayOrder(order);
    setReplayIndex(0);
  }

  function computeRank(entries, entry, key) {
    if (!entries.length) return null;
    const sorted = [...entries].sort((a, b) => {
      if (a[key] === b[key]) return (a.timeMs || 0) - (b.timeMs || 0);
      return a[key] - b[key];
    });
    const index = sorted.findIndex((item) => item.id === entry.id);
    if (index === -1) return null;
    return {
      rank: index + 1,
      total: sorted.length,
      topPercent: Math.ceil(((index + 1) / sorted.length) * 100)
    };
  }

  async function loadLeaderboard() {
    setLeaderboardStatus("loading");
    try {
      if (leaderboardEndpoint) {
        const response = await fetch(leaderboardEndpoint);
        const data = await response.json();
        setLeaderboardEntries(Array.isArray(data) ? data : []);
      } else if (typeof window !== "undefined") {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setLeaderboardEntries(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setLeaderboardEntries([]);
    } finally {
      setLeaderboardStatus("idle");
    }
  }

  async function submitLeaderboard(entry) {
    if (!entry) return [];
    try {
      if (leaderboardEndpoint) {
        await fetch(leaderboardEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry)
        });
        const response = await fetch(leaderboardEndpoint);
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setLeaderboardEntries(list);
        return list;
      }
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const updated = Array.isArray(parsed) ? [...parsed, entry] : [entry];
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated.slice(-500)));
      setLeaderboardEntries(updated.slice(-500));
      return updated.slice(-500);
    } catch {
      return leaderboardEntries;
    }
  }

  function finishGame(path) {
    const totalTime = startedAt ? Date.now() - startedAt : elapsedMs;
    const bonusMs = isTimedMode ? Math.max(timeLimitMs - totalTime, 0) : 0;
    const shortestCount = shortestPath.length ? shortestPath.length - 2 : 0;
    const foundCount = path.length ? Math.max(path.length - 2, 0) : 0;
    const distance = Math.max(foundCount - shortestCount, 0);
    const startName = startId ? comarcaById.get(startId)?.properties.name : "";
    const regionId = startName ? regionByName.get(startName)?.id || null : null;
    const ruleId = activeRule?.id || null;
    const ruleDifficulty = activeRule?.difficulty || null;

    let nextStreak = dailyStreak;
    if (gameMode === "daily") {
      const today = getDayKey();
      const yesterday = getDayKeyOffset(-1);
      if (dailyStreak.lastDate === today) {
        nextStreak = dailyStreak;
      } else if (dailyStreak.lastDate === yesterday) {
        nextStreak = {
          count: (dailyStreak.count || 0) + 1,
          lastDate: today
        };
      } else {
        nextStreak = { count: 1, lastDate: today };
      }
      setDailyStreak(nextStreak);
      if (typeof window !== "undefined") {
        localStorage.setItem(STREAK_KEY, JSON.stringify(nextStreak));
      }
    }

    const updatedCollectibles = new Set(collectibles);
    guessedIds.forEach((id) => updatedCollectibles.add(id));
    if (startId) updatedCollectibles.add(startId);
    if (targetId) updatedCollectibles.add(targetId);
    setCollectibles(updatedCollectibles);

    if (isWeeklyMode) {
      const updatedWeeks = new Set(completedWeeks);
      updatedWeeks.add(weekKey);
      setCompletedWeeks(updatedWeeks);
    }

    const normalizedGroup = groupCode.trim() || null;
    const entry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      playerId: playerIdRef.current,
      mode: gameMode,
      mapId: MAP_ID,
      difficulty,
      timeMs: totalTime,
      attempts,
      guesses: guessedIds.length,
      distance,
      shortest: shortestCount,
      found: foundCount,
      ruleId,
      ruleDifficulty,
      startId,
      targetId,
      region: regionId,
      group: normalizedGroup,
      eventId: isEventMode ? activeEvent?.id || null : null,
      weekKey: isWeeklyMode ? weekKey : null,
      createdAt: new Date().toISOString()
    };

    const shortestNames = shortestPath
      .filter((id) => id !== startId && id !== targetId)
      .map((pathId) => comarcaById.get(pathId)?.properties.name || pathId);

    const earned = new Set(unlocked);
    const noExtra = guessedIds.length <= foundCount;
    const noRepeat = attempts <= guessedIds.length;
    if (distance === 0) earned.add("ruta-perfecta");
    if (hintsUsed === 0) earned.add("sense-pistes");
    if (totalTime <= 60000) earned.add("rapid");
    if (noExtra) earned.add("ruta-neta");
    if (foundCount >= 8) earned.add("marato");
    if (noRepeat) earned.add("sense-repeticions");
    if (isWeeklyMode) earned.add("setmana-complerta");
    if (isEventMode) earned.add("event-festa");
    if (isSpeedrunMode && totalTime <= 90000) earned.add("speedrun-rapid");
    if (nextStreak.count >= 7) earned.add("streak-7");
    if (nextStreak.count >= 30) earned.add("streak-30");
    if (distance === 0 && hintsUsed === 0) earned.add("secret-perfecta");
    if (updatedCollectibles.size >= 20) earned.add("secret-explorador");

    setUnlocked(earned);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...earned]));
    }

    const nextThemes = new Set(unlockedThemes);
    ACHIEVEMENTS.forEach((achievement) => {
      if (earned.has(achievement.id) && achievement.rewardTheme) {
        nextThemes.add(achievement.rewardTheme);
      }
    });
    if (isWeeklyMode && weeklyMission?.rewardTheme) {
      nextThemes.add(weeklyMission.rewardTheme);
    }
    if (isEventMode && activeEvent?.theme) {
      nextThemes.add(activeEvent.theme);
    }
    nextThemes.add("default");
    setUnlockedThemes(nextThemes);

    setIsComplete(true);
    confetti({ particleCount: 180, spread: 70, origin: { y: 0.7 } });
    setLastEntryId(entry.id);

    setHistory((prev) => {
      const historyEntry = {
        id: entry.id,
        date: entry.createdAt,
        mode: gameMode,
        difficulty,
        timeMs: totalTime,
        attempts,
        distance,
        shortest: shortestCount,
        found: foundCount,
        rule: activeRule?.label || "Sense norma"
      };
      return [...prev, historyEntry].slice(-20);
    });

    submitLeaderboard(entry).then(() => {
      setResultData({
        attempts,
        timeMs: totalTime,
        playerPath: guessHistory,
        shortestPath: shortestNames,
        shortestCount,
        foundCount,
        distance,
        ruleLabel: activeRule?.label || "Sense norma",
        ruleDifficulty,
        hintsUsed,
        bonusMs,
        achievements: [...earned],
        entryId: entry.id,
        mode: gameMode,
        difficulty,
        streak: nextStreak.count || 0
      });
      setShowModal(true);
    });
  }

  function handleCopyResult() {
    if (!resultData) return;
    const timeLabel = formatTime(resultData.timeMs);
    const startName = startId ? comarcaById.get(startId)?.properties.name : "";
    const targetName = targetId ? comarcaById.get(targetId)?.properties.name : "";
    const guessNames = resultData.playerPath.map((entry) => entry.name).join(", ");
    const text = [
      `Rumb Comarcal: ${startName} → ${targetName}`,
      `Mode: ${resultData.mode}`,
      `Dificultat: ${resultData.difficulty}`,
      `Temps: ${timeLabel}`,
      `Intents: ${resultData.attempts}`,
      `Comarques: ${guessNames || "(cap)"}`,
      `Norma: ${resultData.ruleLabel}`,
      `Distància camí curt: +${resultData.distance}`,
      `Ratxa diària: ${resultData.streak || 0}`
    ].join("\n");

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyStatus("copied");
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 1500);
      });
    }
  }

  const startName = startId ? comarcaById.get(startId)?.properties.name : null;
  const currentName = currentId ? comarcaById.get(currentId)?.properties.name : null;
  const targetName = targetId ? comarcaById.get(targetId)?.properties.name : null;
  const startRegion = startName ? regionByName.get(startName) : null;
  const timeLabel = isTimedMode ? formatTime(timeLeftMs) : formatTime(elapsedMs);
  const isWeeklyCompleted = completedWeeks.has(weekKey);
  const stampsCount = collectibles.size;
  const totalComarques = comarques.length;
  const activeRuleDifficulty = activeRule?.difficulty || (activeRule ? getRuleDifficulty(activeRule) : null);
  const visibleModes = useMemo(() => {
    if (activeEvent) return GAME_MODES;
    return GAME_MODES.filter((mode) => mode.id !== "event");
  }, [activeEvent]);
  const modifierLabel = useMemo(() => {
    const parts = [];
    parts.push(difficultyConfig.hintsDisabled ? "Sense pistes" : "Pistes actives");
    parts.push(difficultyConfig.fog ? "Boira" : "Mapa clar");
    if (isTimedMode) {
      parts.push(`Límit ${formatTime(timeLimitMs)}`);
    }
    return parts.join(" · ");
  }, [difficultyConfig.hintsDisabled, difficultyConfig.fog, isTimedMode, timeLimitMs]);
  const weeklyRuleLabel = useMemo(() => {
    return (
      RULE_DEFS.find((rule) => rule.id === weeklyMission?.ruleId)?.label || "—"
    );
  }, [weeklyMission]);
  const weeklyRewardLabel = useMemo(() => {
    return THEMES.find((theme) => theme.id === weeklyMission?.rewardTheme)?.label || "—";
  }, [weeklyMission]);
  const eventRuleLabel = useMemo(() => {
    if (!activeEvent) return null;
    return RULE_DEFS.find((rule) => rule.id === activeEvent.ruleId)?.label || "—";
  }, [activeEvent]);

  const scopedEntries = useMemo(() => {
    let list = leaderboardEntries.filter((entry) => entry.mapId === MAP_ID || !entry.mapId);
    const groupFilter = groupCode.trim();
    if (rankingScope === "group") {
      if (!groupFilter) return [];
      list = list.filter((entry) => entry.group === groupFilter);
    }
    if (rankingScope === "region" && startRegion?.id) {
      list = list.filter((entry) => entry.region === startRegion.id);
    }
    return list;
  }, [leaderboardEntries, rankingScope, groupCode, startRegion]);

  const modeEntries = useMemo(() => {
    if (isSpeedrunMode || isTimedMode) {
      return scopedEntries.filter(
        (entry) => entry.mode === gameMode && entry.difficulty === difficulty
      );
    }
    return scopedEntries;
  }, [scopedEntries, isSpeedrunMode, isTimedMode, gameMode, difficulty]);

  const rankings = useMemo(() => {
    if (!lastEntryId) return null;
    const scopedEntry = modeEntries.find((item) => item.id === lastEntryId);
    if (scopedEntry) {
      return {
        time: computeRank(modeEntries, scopedEntry, "timeMs"),
        distance: computeRank(modeEntries, scopedEntry, "distance")
      };
    }
    if (rankingScope !== "global") return null;
    const fallback = leaderboardEntries.find((item) => item.id === lastEntryId);
    if (!fallback) return null;
    return {
      time: computeRank(leaderboardEntries, fallback, "timeMs"),
      distance: computeRank(leaderboardEntries, fallback, "distance")
    };
  }, [lastEntryId, modeEntries, leaderboardEntries, rankingScope]);

  const leaderboardByTime = useMemo(() => {
    return [...modeEntries].sort((a, b) => a.timeMs - b.timeMs).slice(0, 5);
  }, [modeEntries]);

  const leaderboardByDistance = useMemo(() => {
    return [...modeEntries]
      .sort((a, b) => {
        if (a.distance === b.distance) return a.timeMs - b.timeMs;
        return a.distance - b.distance;
      })
      .slice(0, 5);
  }, [modeEntries]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Travle · Catalunya</p>
          <h1>Rumb Comarcal</h1>
          <p className="subtitle">
            Troba un camí entre comarques escrivint-les en qualsevol ordre.
          </p>
        </div>
        <div className="streak-card">
          <span className="label">Ratxa diària</span>
          <span className="value">{displayStreak} dies</span>
          <span className="muted">{streakTitle}</span>
        </div>
      </header>

      <section className="game-layout">
        <div className={`map-wrap ${difficultyConfig.fog ? "fog" : ""}`}>
          <div className="prompt">
            <div className="route">
              {startName && targetName ? (
                <span>
                  Ruta: <strong>{startName}</strong> → <strong>{targetName}</strong>
                </span>
              ) : (
                <span>Carregant dades...</span>
              )}
            </div>
            <div className="status">
              {isExploreMode
                ? "Explora el mapa"
                : isComplete
                  ? `Has completat el camí.`
                  : isFailed
                    ? "Temps esgotat"
                    : currentName
                      ? `Darrera: ${currentName}`
                      : "—"}
            </div>
          </div>
          <div className="map-controls">
            <button type="button" onClick={handleZoomIn} aria-label="Apropar">
              +
            </button>
            <button type="button" onClick={handleZoomOut} aria-label="Allunyar">
              −
            </button>
            <button type="button" onClick={handleRecenter}>
              Recentrar
            </button>
          </div>

          <svg ref={svgRef} className="map" viewBox={viewBox} role="img">
            <g ref={gRef}>
              {outlinePath ? <path className="outline" d={outlinePath} /> : null}
              {paths.map((featureItem) => {
                const isStart = featureItem.id === startId;
                const isTarget = featureItem.id === targetId;
                const isCurrent = featureItem.id === currentId && !isExploreMode;
                const isGuessed = guessedSet.has(featureItem.id);
                const isReplay = replaySet.has(featureItem.id);
                const isPowerReveal = tempRevealId === featureItem.id;
                const isRevealed =
                  isExploreMode || isStart || isTarget || isGuessed || isReplay || isPowerReveal;
                const isNeighbor =
                  showNeighborHintActive &&
                  !isRevealed &&
                  neighborSet.has(featureItem.id) &&
                  !isStart &&
                  !isTarget;
                const isHint =
                  showNextHintActive &&
                  !isRevealed &&
                  nextHintId === featureItem.id &&
                  !isStart &&
                  !isTarget;
                const isHidden = !isRevealed && !isNeighbor && !isHint;
                const isOutline = showInitialsActive && isHidden;

                const classes = [
                  "comarca",
                  isHidden && "is-hidden",
                  isOutline && "is-outline",
                  isGuessed && "is-guessed",
                  isStart && "is-start",
                  isTarget && "is-target",
                  isCurrent && "is-current",
                  isNeighbor && "is-neighbor",
                  isHint && "is-hint",
                  isReplay && "is-replay",
                  isPowerReveal && "is-reveal"
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <path
                    key={featureItem.id}
                    d={featureItem.path}
                    className={classes}
                  />
                );
              })}
              {showInitialsActive ? (
                <g className="initials">
                  {paths.map((featureItem) => {
                    const centroid = featureItem.centroid;
                    if (!centroid) return null;
                    const [x, y] = centroid;
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                    return (
                      <text
                        key={`init-${featureItem.id}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        className="initial"
                      >
                        {initialsById.get(featureItem.id)}
                      </text>
                    );
                  })}
                </g>
              ) : null}
            </g>
          </svg>
        </div>

        <aside className="side-panel">
          <div className="panel-card">
            <div className="stats">
              <div className="stat">
                <span className="label">Inici</span>
                <span className="value">{startName || "—"}</span>
              </div>
              <div className="stat">
                <span className="label">Destí</span>
                <span className="value">{targetName || "—"}</span>
              </div>
              <div className="stat">
                <span className="label">Temps</span>
                <span className="value">{timeLabel}</span>
              </div>
              <div className="stat">
                <span className="label">Ratxa</span>
                <span className="value">{displayStreak}</span>
              </div>
              <div className="stat">
                <span className="label">Segells</span>
                <span className="value">
                  {totalComarques ? `${stampsCount}/${totalComarques}` : "—"}
                </span>
              </div>
            </div>
            <form className="guess-form" onSubmit={handleGuessSubmit}>
              <label className="label" htmlFor="guess-input">
                Escriu una comarca
              </label>
              <input
                id="guess-input"
                type="text"
                value={guessValue}
                onChange={handleGuessChange}
                onFocus={handleGuessFocus}
                onBlur={handleGuessBlur}
                disabled={isComplete || isFailed || isExploreMode}
              />
              <div className={`suggestions ${isSuggestionsOpen ? "is-open" : ""}`}>
                {suggestions.length ? (
                  suggestions.map((name) => (
                    <button
                      className="suggestion"
                      type="button"
                      key={name}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionPick(name)}
                    >
                      {name}
                    </button>
                  ))
                ) : (
                  <div className="suggestion empty">Cap coincidència</div>
                )}
              </div>
              <button type="submit" className="submit" disabled={isComplete || isFailed}>
                Prova
              </button>
            </form>
            <button className="reset" onClick={resetGame} type="button">
              Nova partida
            </button>
          </div>

          <div className="panel-card">
            <span className="label">Mode</span>
            <div className="mode-buttons">
              {visibleModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-button ${gameMode === mode.id ? "active" : ""}`}
                  onClick={() => setGameMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <label className="label" htmlFor="difficulty-select">
              Dificultat
            </label>
            <select
              id="difficulty-select"
              className="level-select"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              {DIFFICULTIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <div className="stat-row">
              <span className="label">Modificadors</span>
              <span className="value">{modifierLabel}</span>
            </div>
            {isTimedMode ? (
              <div className="stat-row">
                <span className="label">Temps restant</span>
                <span className="value">{timeLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="panel-card">
            <span className="label">Missió setmanal</span>
            <div className={`mission ${isWeeklyCompleted ? "done" : ""}`}>
              <div className="mission-title">{weeklyMission?.label || "—"}</div>
              <p className="muted">{weeklyRuleLabel}</p>
              <div className="stat-row">
                <span className="label">Premi</span>
                <span className="value">{weeklyRewardLabel}</span>
              </div>
              <button
                type="button"
                className="submit"
                onClick={() => {
                  if (gameMode === "weekly") {
                    resetGame();
                  } else {
                    setGameMode("weekly");
                  }
                }}
              >
                Juga la missió
              </button>
              {isWeeklyCompleted ? (
                <span className="badge">Completada</span>
              ) : null}
            </div>
            <span className="label">Esdeveniment</span>
            {activeEvent ? (
              <div className="mission">
                <div className="mission-title">{activeEvent.label}</div>
                <p className="muted">{eventRuleLabel}</p>
                <div className="stat-row">
                  <span className="label">Tema</span>
                  <span className="value">
                    {THEMES.find((theme) => theme.id === activeEvent.theme)?.label || "—"}
                  </span>
                </div>
                <button
                  type="button"
                  className="submit"
                  onClick={() => {
                    if (gameMode === "event") {
                      resetGame();
                    } else {
                      setGameMode("event");
                    }
                  }}
                >
                  Juga l'esdeveniment
                </button>
              </div>
            ) : (
              <p className="muted">Cap esdeveniment actiu avui.</p>
            )}
          </div>

          <div className="panel-card">
            <span className="label">Norma activa</span>
            <div
              className={`rule-chip ${
                ruleStatus.failed ? "bad" : ruleStatus.satisfied ? "good" : ""
              }`}
            >
              {activeRule?.label || "Sense norma"}
            </div>
            <div className="stat-row">
              <span className="label">Dificultat norma</span>
              <span className="value">{formatRuleDifficulty(activeRuleDifficulty)}</span>
            </div>
            <span className="label">Llegenda</span>
            <div className="legend">
              <div className="legend-item">
                <span className="swatch start" />
                <span>Inici</span>
              </div>
              <div className="legend-item">
                <span className="swatch target" />
                <span>Destí</span>
              </div>
              <div className="legend-item">
                <span className="swatch guess" />
                <span>Comarques escrites</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <span className="label">Ajuda</span>
            <div className="hint-buttons">
              <button
                type="button"
                className="hint-button"
                onClick={handleHintStep}
                disabled={hintsBlocked}
              >
                Pista escalonada
              </button>
              <button
                type="button"
                className={`hint-button ${showNeighborHint ? "active" : ""}`}
                onClick={() => setShowNeighborHint((prev) => !prev)}
                disabled={hintsBlocked}
              >
                Veïnes
              </button>
              <button
                type="button"
                className={`hint-button ${showNextHint ? "active" : ""}`}
                onClick={() => setShowNextHint((prev) => !prev)}
                disabled={hintsBlocked}
              >
                Camí més curt
              </button>
              <button
                type="button"
                className={`hint-button ${showInitials ? "active" : ""}`}
                onClick={() => setShowInitials((prev) => !prev)}
                disabled={hintsBlocked}
              >
                Inicials
              </button>
              <button
                type="button"
                className={`hint-button ${soundEnabled ? "active" : ""}`}
                onClick={() => setSoundEnabled((prev) => !prev)}
              >
                So
              </button>
            </div>
            {hintsBlocked ? (
              <span className="muted">Les pistes estan desactivades en aquest nivell.</span>
            ) : null}
            {tempRevealId ? (
              <span className="muted">
                Pista activa: {comarcaById.get(tempRevealId)?.properties.name || "—"}
              </span>
            ) : null}
          </div>

          <div className="panel-card">
            <span className="label">Comodins</span>
            <div className="powerups">
              {POWERUPS.map((powerup) => (
                <button
                  key={powerup.id}
                  type="button"
                  className="powerup-button"
                  onClick={() => handlePowerupUse(powerup.id)}
                  disabled={
                    !powerups[powerup.id] || isComplete || isFailed || isExploreMode
                  }
                >
                  <span>{powerup.label}</span>
                  <span className="badge">{powerups[powerup.id] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <span className="label">Comarques escrites</span>
            <ul className="path-list">
              {guessHistory.map((entry, index) => (
                <li key={`${entry.id}-${index}`} className="guess-item">
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card">
            <span className="label">Estadístiques</span>
            <div className="stats-grid">
              <div className="stat-row">
                <span className="label">Intents</span>
                <span className="value">{attempts}</span>
              </div>
              <div className="stat-row">
                <span className="label">Úniques</span>
                <span className="value">{guessedIds.length}</span>
              </div>
              <div className="stat-row">
                <span className="label">Pistes</span>
                <span className="value">{hintsUsed}</span>
              </div>
              <div className="stat-row">
                <span className="label">Camí curt</span>
                <span className="value">
                  {shortestPath.length ? Math.max(shortestPath.length - 2, 0) : "—"}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">Distància</span>
                <span className="value">
                  {resultData ? `+${resultData.distance}` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <span className="label">Progressió</span>
            <div className="stat-row">
              <span className="label">Segells</span>
              <span className="value">
                {totalComarques ? `${stampsCount}/${totalComarques}` : "—"}
              </span>
            </div>
            <span className="label">Temes</span>
            <div className="theme-grid">
              {THEMES.map((theme) => {
                const isUnlocked = unlockedThemes.has(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-button ${
                      activeTheme === theme.id ? "active" : ""
                    }`}
                    onClick={() => handleThemeSelect(theme.id)}
                    disabled={!isUnlocked}
                  >
                    <span>{theme.label}</span>
                    {!isUnlocked ? <span className="lock">Bloquejat</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel-card">
            <span className="label">Ranking</span>
            <div className="scope-buttons">
              <button
                type="button"
                className={`scope-button ${rankingScope === "global" ? "active" : ""}`}
                onClick={() => setRankingScope("global")}
              >
                Global
              </button>
              <button
                type="button"
                className={`scope-button ${rankingScope === "region" ? "active" : ""}`}
                onClick={() => setRankingScope("region")}
                disabled={!startRegion}
              >
                Regió
              </button>
              <button
                type="button"
                className={`scope-button ${rankingScope === "group" ? "active" : ""}`}
                onClick={() => setRankingScope("group")}
              >
                Grup
              </button>
            </div>
            {rankingScope === "region" ? (
              <span className="muted">
                Regió actual: {startRegion?.label || "—"}
              </span>
            ) : null}
            {rankingScope === "group" ? (
              <div className="group-row">
                <input
                  type="text"
                  value={groupCode}
                  onChange={(event) => setGroupCode(event.target.value)}
                  placeholder="Codi de grup"
                />
                <button type="button" className="submit" onClick={handleGroupInvite}>
                  {groupCopyStatus === "copied" ? "Copiat" : "Invita"}
                </button>
              </div>
            ) : null}
            {rankingScope === "group" && !groupCode.trim() ? (
              <span className="muted">Defineix un codi per veure el ranking del grup.</span>
            ) : null}
            <div className="stats-grid">
              <div className="stat-row">
                <span className="label">Top temps</span>
                <span className="value">
                  {rankings?.time ? `Top ${rankings.time.topPercent}%` : "—"}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">Top ruta</span>
                <span className="value">
                  {rankings?.distance ? `Top ${rankings.distance.topPercent}%` : "—"}
                </span>
              </div>
            </div>
            <div className="ranking-lists">
              <div>
                <span className="label">Millors temps</span>
                <ol className="ranking-list">
                  {leaderboardByTime.map((entry) => (
                    <li key={entry.id}>
                      {formatTime(entry.timeMs)}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <span className="label">Ruta més curta</span>
                <ol className="ranking-list">
                  {leaderboardByDistance.map((entry) => (
                    <li key={entry.id}>+{entry.distance}</li>
                  ))}
                </ol>
              </div>
            </div>
            {leaderboardStatus === "loading" ? (
              <span className="muted">Carregant ranking...</span>
            ) : null}
          </div>

          <div className="panel-card">
            <span className="label">Historial</span>
            <ol className="history-list">
              {[...history]
                .slice(-8)
                .reverse()
                .map((entry, index) => (
                  <li key={entry.id} className="history-item">
                    <span className="history-index">#{index + 1}</span>
                    <span className="history-main">
                      {formatTime(entry.timeMs)} · {entry.attempts || 0} intents · +
                      {entry.distance ?? 0}
                    </span>
                    <span className="muted">
                      {entry.mode || "normal"} · {entry.difficulty || "—"}
                    </span>
                  </li>
                ))}
            </ol>
          </div>

          <div className="panel-card">
            <span className="label">Assoliments</span>
            <div className="achievements">
              {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = unlocked.has(achievement.id);
                const label = isUnlocked
                  ? achievement.label
                  : achievement.secret
                    ? "Assoliment secret"
                    : achievement.label;
                return (
                  <div
                    key={achievement.id}
                    className={`achievement ${isUnlocked ? "unlocked" : ""}`}
                  >
                    <span>{label}</span>
                    {isUnlocked && achievement.rewardTheme ? (
                      <span className="muted">Desbloqueja tema</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      {showModal && resultData ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>
              {isFailed
                ? "Temps esgotat"
                : "Felicitats per completar el nivell!"}
            </h2>
            <p className="modal-subtitle">Intents: {resultData.attempts}</p>
            <p className="modal-subtitle">Temps: {formatTime(resultData.timeMs)}</p>
            <p className="modal-subtitle">
              Mode: {resultData.mode} · Dificultat: {resultData.difficulty}
            </p>
            <p className="modal-subtitle">
              Ratxa diària: {resultData.streak || 0} · {getStreakTitle(resultData.streak || 0)}
            </p>
            <p className="modal-subtitle">Norma: {resultData.ruleLabel}</p>
            <p className="modal-subtitle">
              Dificultat norma: {formatRuleDifficulty(resultData.ruleDifficulty)}
            </p>
            {resultData.bonusMs ? (
              <p className="modal-subtitle">
                Bonus contrarellotge: {formatTime(resultData.bonusMs)}
              </p>
            ) : null}
            <div className="modal-section">
              <span className="label">El teu recorregut</span>
              <ul className="path-list">
                {resultData.playerPath.map((entry, index) => (
                  <li key={`player-${entry.id}-${index}`} className="guess-item">
                    {entry.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-section">
              <span className="label">Resultat correcte</span>
              <p className="modal-subtitle">
                Camí més curt: {resultData.shortestCount} comarques
              </p>
              <ol className="shortest-list">
                {resultData.shortestPath.map((name, index) => (
                  <li key={`short-${name}-${index}`}>{name}</li>
                ))}
              </ol>
            </div>
            <div className="modal-section">
              <span className="label">Ranking</span>
              <p className="modal-subtitle">
                Top temps: {rankings?.time ? `Top ${rankings.time.topPercent}%` : "—"}
              </p>
              <p className="modal-subtitle">
                Top ruta: {rankings?.distance ? `Top ${rankings.distance.topPercent}%` : "—"}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="submit"
                type="button"
                onClick={() => handleReplayStart("player")}
              >
                Reprodueix el teu camí
              </button>
              <button
                className="submit"
                type="button"
                onClick={() => handleReplayStart("shortest")}
              >
                Reprodueix el camí curt
              </button>
              <button className="reset" type="button" onClick={handleStartNext}>
                Nova partida
              </button>
              <button
                className="submit"
                type="button"
                onClick={handleCopyResult}
              >
                {copyStatus === "copied" ? "Copiat!" : "Copiar resultat"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
