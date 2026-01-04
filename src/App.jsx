import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { feature, mesh, neighbors as topoNeighbors } from "topojson-client";
import confetti from "canvas-confetti";
import { supabase } from "./lib/supabase.js";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 700;
const MAP_ID = "catalunya";
const DEFAULT_TIME_LIMIT_MS = 180000;
const LEADERBOARD_KEY = "rumb-leaderboard-v2";
const HISTORY_KEY = "rumb-history-v1";
const ACHIEVEMENTS_KEY = "rumb-achievements-v2";
const ACHIEVEMENTS_CLAIMED_KEY = "rumb-achievements-claimed-v1";
const PLAYER_KEY = "rumb-player-id";
const STREAK_KEY = "rumb-daily-streak-v1";
const WEEKLY_KEY = "rumb-weekly-v1";
const THEMES_KEY = "rumb-themes-v1";
const ACTIVE_THEME_KEY = "rumb-theme-active-v1";
const COLLECTIBLES_KEY = "rumb-segells-v1";
const GROUP_KEY = "rumb-group-v1";
const GROUP_META_KEY = "rumb-group-meta-v1";
const ROVELLONS_KEY = "rumb-rovellons-v1";
const DIFFICULTY_UNLOCKS_KEY = "rumb-difficulty-unlocks-v1";
const LEVEL_STATS_KEY = "rumb-level-stats-v1";
const DAILY_RESULTS_KEY = "rumb-daily-results-v1";
const WEEKLY_RESULTS_KEY = "rumb-weekly-results-v1";
const LANGUAGE_KEY = "rumb-language-v1";
const MUSIC_SETTINGS_KEY = "rumb-music-settings-v1";
const SFX_SETTINGS_KEY = "rumb-sfx-settings-v1";

const DIFFICULTIES = [
  {
    id: "pixapi",
    label: "Pixapí",
    ruleLevels: ["easy"],
    minInternal: 3,
    hintsDisabled: false,
    fog: false
  },
  {
    id: "dominguero",
    label: "Dominguero",
    ruleLevels: ["easy", "medium"],
    minInternal: 4,
    hintsDisabled: false,
    fog: false
  },
  {
    id: "tastaolletes",
    label: "Tastaolletes",
    ruleLevels: ["medium"],
    minInternal: 5,
    hintsDisabled: true,
    fog: false
  },
  {
    id: "rondinaire",
    label: "Rondinaire",
    ruleLevels: ["medium", "hard"],
    minInternal: 6,
    hintsDisabled: true,
    fog: true
  },
  {
    id: "ciclista-cuneta",
    label: "Ciclista de cuneta",
    ruleLevels: ["hard"],
    minInternal: 7,
    hintsDisabled: true,
    fog: true
  },
  {
    id: "ninja-pirineu",
    label: "Ninja del Pirineu",
    ruleLevels: ["hard", "expert"],
    minInternal: 8,
    hintsDisabled: true,
    fog: true
  },
  {
    id: "cap-colla-rutes",
    label: "Cap de colla de rutes",
    ruleLevels: ["expert"],
    minInternal: 9,
    hintsDisabled: true,
    fog: true
  }
];

const DIFFICULTY_COSTS = {
  dominguero: 60,
  tastaolletes: 90,
  rondinaire: 130,
  "ciclista-cuneta": 180,
  "ninja-pirineu": 240,
  "cap-colla-rutes": 320
};

const PRIMARY_MODES = [
  { id: "normal", label: "Normal" },
  { id: "timed", label: "Contrarellotge" },
  { id: "explore", label: "Explora" }
];

const DAILY_MIN_INTERNAL = 4;
const WEEKLY_MIN_INTERNAL = 8;
const EXPLORE_MIN_INTERNAL = 8;

const POWERUPS = [
  {
    id: "reveal-next",
    label: "Revela un pas",
    durationMs: 5000,
    penaltyMs: 4000,
    uses: {
      pixapi: 2,
      dominguero: 2,
      tastaolletes: 1,
      rondinaire: 1,
      "ciclista-cuneta": 1,
      "ninja-pirineu": 0,
      "cap-colla-rutes": 0
    }
  },
  {
    id: "temp-neighbors",
    label: "Veïnes (5s)",
    durationMs: 5000,
    penaltyMs: 3000,
    uses: {
      pixapi: 2,
      dominguero: 2,
      tastaolletes: 1,
      rondinaire: 1,
      "ciclista-cuneta": 0,
      "ninja-pirineu": 0,
      "cap-colla-rutes": 0
    }
  },
  {
    id: "temp-initials",
    label: "Inicials (5s)",
    durationMs: 5000,
    penaltyMs: 2000,
    uses: {
      pixapi: 2,
      dominguero: 1,
      tastaolletes: 1,
      rondinaire: 0,
      "ciclista-cuneta": 0,
      "ninja-pirineu": 0,
      "cap-colla-rutes": 0
    }
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

const THEME_COSTS = {
  terra: 80,
  mar: 90,
  pinyer: 100,
  nit: 120
};

const MUSIC_TRACKS = [
  {
    id: "segadors",
    label: "Els Segadors (melodia)",
    tempo: 360,
    notes: [392, 440, 494, 523, 494, 440, 392, 349, 392, 440],
    lyrics:
      "Catalunya triomfant, tornarà a ser rica i plena; endarrere aquesta gent tan ufana i tan superba."
  },
  {
    id: "sardana",
    label: "Sardana de plaça",
    tempo: 320,
    notes: [330, 392, 440, 494, 440, 392, 349, 392, 440, 392],
    lyrics: "Un pas endavant, un pas enrere, a plaça i amb somriure."
  },
  {
    id: "rumba",
    label: "Rumba catalana",
    tempo: 260,
    notes: [392, 523, 587, 523, 494, 440, 392, 440, 494, 523],
    lyrics: "Palmes i guitarres, ritme a la Rambla i alegria."
  }
];

const LANGUAGES = [
  { id: "ca", label: "Català" },
  { id: "aranes", label: "Aranés" },
  { id: "gironi", label: "Gironí" },
  { id: "barceloni", label: "Barceloní" },
  { id: "tarragoni", label: "Tarragoní" },
  { id: "lleidata", label: "Lleidatà" }
];

const STRINGS = {
  ca: {
    start: "Inici",
    target: "Destí",
    rule: "Norma",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps restant",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanal",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanal",
    calendar: "Calendari",
    calendarLoading: "Carregant calendari...",
    calendarEmpty: "Sense nivells",
    completed: "Completat",
    mode: "Mode",
    normal: "Normal",
    timed: "Contrarellotge",
    explore: "Explora",
    buy: "Compra",
    locked: "Bloquejat",
    unlock: "Desbloqueja",
    powerups: "Comodins",
    stats: "Estadístiques",
    attempts: "Intents",
    bestTime: "Millor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfecte",
    ranking: "Rànquing",
    global: "Global",
    province: "Província",
    group: "Grup",
    groupName: "Nom del grup",
    groupCode: "Codi (5 xifres)",
    createGroup: "Crea codi",
    joinGroup: "Uneix-me",
    achievements: "Assoliments",
    collect: "Recollir",
    config: "Configuració",
    theme: "Tema",
    music: "Música",
    sounds: "Sons",
    language: "Idioma",
    volume: "Volum",
    newGame: "Nova partida",
    guessLabel: "Escriu una comarca",
    submit: "Prova",
    noMatch: "Cap coincidència",
    levelLocked: "Nivell bloquejat",
    buyFor: "Compra per {value}",
    reward: "Premi",
    dailyDone: "Diari completat",
    weeklyDone: "Setmanal completat",
    noRule: "Sense norma",
    path: "Camí escrit",
    fixedDifficulty: "Dificultat fixa per aquest mode.",
    yourPath: "El teu recorregut",
    correctPath: "Resultat correcte",
    shortestCount: "Camí més curt: {value} comarques",
    topTime: "Top temps",
    topAttempts: "Top intents",
    topRoute: "Top ruta",
    bestTimes: "Millors temps",
    shortestRoute: "Ruta més curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rànquing...",
    noRewards: "Sense premis per recollir.",
    copy: "Copia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats per completar el nivell!",
    timeOut: "Temps esgotat",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "Has completat tots els assoliments. Ara et toca ser cap de colla de rutes.",
    ok: "D'acord"
  },
  aranes: {
    start: "Inici",
    target: "Destin",
    rule: "Nòrma",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps restant",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanau",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanau",
    completed: "Completat",
    mode: "Mòde",
    normal: "Normau",
    timed: "Contrarrelòtge",
    explore: "Explòra",
    buy: "Crompa",
    locked: "Bloquejat",
    unlock: "Desblòqueja",
    powerups: "Comodins",
    stats: "Estadistiques",
    attempts: "Intents",
    bestTime: "Melhor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfècte",
    ranking: "Rank",
    global: "Globau",
    province: "Província",
    group: "Grop",
    groupName: "Nòm deth grop",
    groupCode: "Còde (5 chifres)",
    createGroup: "Crea còde",
    joinGroup: "Jòin-me",
    achievements: "Assoliments",
    collect: "Recuelh",
    config: "Configuracion",
    theme: "Tèma",
    music: "Musica",
    sounds: "Sons",
    language: "Lengua",
    volume: "Vòlum",
    newGame: "Nau partida",
    guessLabel: "Escriu ua comarca",
    submit: "Prova",
    noMatch: "Cap coincidéncia",
    levelLocked: "Nivell bloquejat",
    buyFor: "Crompa per {value}",
    reward: "Prèmi",
    dailyDone: "Diari completat",
    weeklyDone: "Setmanau completat",
    noRule: "Sense nòrma",
    path: "Camín escrit",
    fixedDifficulty: "Dificultat fixa entà aguest mòde.",
    yourPath: "Eth tòn recorregut",
    correctPath: "Resultat corrècte",
    shortestCount: "Camín mès curt: {value} comarques",
    topTime: "Top temps",
    topAttempts: "Top intents",
    topRoute: "Top ròta",
    bestTimes: "Melhors temps",
    shortestRoute: "Ròta mès curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rank...",
    noRewards: "Sense prèmis entà recuelh.",
    copy: "Còpia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats per completar eth nivèu!",
    timeOut: "Temps esgotat",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "As completat tots es assoliments. Ara te tòca èster cap de colla de rutes.",
    ok: "D'acord"
  },
  gironi: {
    start: "Inici, noi",
    target: "Destí, nano",
    rule: "Norma, eh",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps que queda, va",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanal",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanal",
    completed: "Fet i ben fet",
    mode: "Mode",
    normal: "Normalet",
    timed: "Contrarellotge a saco",
    explore: "Explora-ho tot",
    buy: "Pilla-ho",
    locked: "Tancat amb pany",
    unlock: "Desbloqueja-ho",
    powerups: "Comodins, nano",
    stats: "Números i tralla",
    attempts: "Intents",
    bestTime: "Millor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfecte, nano!",
    ranking: "Rànquing",
    global: "Global",
    province: "Província",
    group: "Colla",
    groupName: "Nom de la colla",
    groupCode: "Codi (5 xifres)",
    createGroup: "Crea codi",
    joinGroup: "Entra-hi",
    achievements: "Assoliments",
    collect: "Recull",
    config: "Ajustos",
    theme: "Tema",
    music: "Música",
    sounds: "Sorollets",
    language: "Parla",
    volume: "Volum",
    newGame: "Nova partida",
    guessLabel: "Escriu una comarca, noi",
    submit: "Prova",
    noMatch: "No hi ha res, nano",
    levelLocked: "Nivell bloquejat",
    buyFor: "Pilla per {value}",
    reward: "Premi",
    dailyDone: "Diari fet",
    weeklyDone: "Setmanal fet",
    noRule: "Sense norma, noi",
    path: "Camí escrit",
    fixedDifficulty: "Dificultat fixa, no toquis res.",
    yourPath: "El teu recorregut",
    correctPath: "Resultat bo de veritat",
    shortestCount: "Camí més curt: {value} comarques",
    topTime: "Top temps, noi",
    topAttempts: "Top intents, nano",
    topRoute: "Top ruta",
    bestTimes: "Millors temps",
    shortestRoute: "Ruta més curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rànquing, espera...",
    noRewards: "No hi ha premis per recollir, noi.",
    copy: "Copia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats, ho has petat!",
    timeOut: "Temps esgotat, nano",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "Has completat tots els assoliments. Ara ets cap de colla de rutes, nano.",
    ok: "D'acord"
  },
  barceloni: {
    start: "Inici, tio",
    target: "Destí, tronco",
    rule: "Norma",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps que queda, bro",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanal",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanal",
    completed: "Fet, bro",
    mode: "Mode",
    normal: "Normalillo",
    timed: "Contrarellotge a saco",
    explore: "Explora-ho, killa",
    buy: "Compra-ho",
    locked: "Bloquejat, nano",
    unlock: "Desbloqueja-ho",
    powerups: "Comodins, bro",
    stats: "Stats, tio",
    attempts: "Intents",
    bestTime: "Millor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfecte, crack",
    ranking: "Rànquing",
    global: "Global",
    province: "Província",
    group: "Grupet",
    groupName: "Nom del grup",
    groupCode: "Codi (5 xifres)",
    createGroup: "Crea codi",
    joinGroup: "M'hi apunto",
    achievements: "Assoliments",
    collect: "Pilla",
    config: "Config",
    theme: "Tema",
    music: "Música",
    sounds: "Sons",
    language: "Idioma",
    volume: "Volum",
    newGame: "Nova partida",
    guessLabel: "Escriu una comarca, crack",
    submit: "Prova",
    noMatch: "No hi ha res, bro",
    levelLocked: "Nivell bloquejat",
    buyFor: "Compra per {value}",
    reward: "Premi",
    dailyDone: "Diari fet",
    weeklyDone: "Setmanal fet",
    noRule: "Sense norma, tio",
    path: "Camí escrit",
    fixedDifficulty: "Dificultat fixa, no maregis",
    yourPath: "El teu recorregut",
    correctPath: "Resultat correcte",
    shortestCount: "Camí més curt: {value} comarques",
    topTime: "Top temps, bro",
    topAttempts: "Top intents, bro",
    topRoute: "Top ruta",
    bestTimes: "Millors temps",
    shortestRoute: "Ruta més curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rànquing, tio...",
    noRewards: "Ara mateix no hi ha premis, bro.",
    copy: "Copia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats, crack!",
    timeOut: "Temps esgotat, tio",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "Has completat tots els assoliments. Ara ets cap de colla de rutes, bro.",
    ok: "Ok"
  },
  tarragoni: {
    start: "Inici, xiquet",
    target: "Destí, xiqueta",
    rule: "Norma",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps que queda, xe",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanal",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanal",
    completed: "Fet i llest",
    mode: "Mode",
    normal: "Normalet",
    timed: "Contrarellotge a tota castanya",
    explore: "Explora-ho, xe",
    buy: "Compra-ho",
    locked: "Tancat",
    unlock: "Desbloqueja-ho",
    powerups: "Comodins",
    stats: "Números",
    attempts: "Intents",
    bestTime: "Millor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfecte, xiquet",
    ranking: "Rànquing",
    global: "Global",
    province: "Província",
    group: "Penya",
    groupName: "Nom de la penya",
    groupCode: "Codi (5 xifres)",
    createGroup: "Crea codi",
    joinGroup: "M'hi fiqui",
    achievements: "Assoliments",
    collect: "Recull",
    config: "Configuració",
    theme: "Tema",
    music: "Música",
    sounds: "Sons",
    language: "Idioma",
    volume: "Volum",
    newGame: "Nova partida",
    guessLabel: "Escriu una comarca, xe",
    submit: "Prova",
    noMatch: "No hi ha res, xiquet",
    levelLocked: "Nivell bloquejat",
    buyFor: "Compra per {value}",
    reward: "Premi",
    dailyDone: "Diari fet",
    weeklyDone: "Setmanal fet",
    noRule: "Sense norma, xe",
    path: "Camí escrit",
    fixedDifficulty: "Dificultat fixa, no toquis",
    yourPath: "El teu recorregut",
    correctPath: "Resultat bo",
    shortestCount: "Camí més curt: {value} comarques",
    topTime: "Top temps",
    topAttempts: "Top intents",
    topRoute: "Top ruta",
    bestTimes: "Millors temps",
    shortestRoute: "Ruta més curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rànquing, xe...",
    noRewards: "Ara no hi ha premis, xiquet.",
    copy: "Copia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats, xiquet!",
    timeOut: "Temps esgotat, xe",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "Has completat tots els assoliments. Ara ets cap de colla de rutes, xe.",
    ok: "D'acord"
  },
  lleidata: {
    start: "Inici, lo",
    target: "Destí, lo",
    rule: "Norma",
    difficulty: "Dificultat",
    time: "Temps",
    timeLeft: "Temps que queda, va",
    coins: "Rovellons",
    daily: "Diari",
    weekly: "Setmanal",
    dailyLevel: "Nivell diari",
    weeklyLevel: "Nivell setmanal",
    completed: "Fet i dat",
    mode: "Mode",
    normal: "Normalet",
    timed: "Contrarellotge a saco",
    explore: "Explora-ho, nano",
    buy: "Compra-ho",
    locked: "Tancat",
    unlock: "Desbloqueja-ho",
    powerups: "Comodins",
    stats: "Números",
    attempts: "Intents",
    bestTime: "Millor temps",
    bestAttempts: "Record d'intents",
    perfect: "Perfecte, lo",
    ranking: "Rànquing",
    global: "Global",
    province: "Província",
    group: "Colla",
    groupName: "Nom de la colla",
    groupCode: "Codi (5 xifres)",
    createGroup: "Crea codi",
    joinGroup: "M'hi poso",
    achievements: "Assoliments",
    collect: "Recull",
    config: "Configuració",
    theme: "Tema",
    music: "Música",
    sounds: "Sons",
    language: "Idioma",
    volume: "Volum",
    newGame: "Nova partida",
    guessLabel: "Escriu una comarca, lo",
    submit: "Prova",
    noMatch: "No n'hi ha cap, lo",
    levelLocked: "Nivell bloquejat",
    buyFor: "Compra per {value}",
    reward: "Premi",
    dailyDone: "Diari fet",
    weeklyDone: "Setmanal fet",
    noRule: "Sense norma, lo",
    path: "Camí escrit",
    fixedDifficulty: "Dificultat fixa, no maregis",
    yourPath: "El teu recorregut",
    correctPath: "Resultat bo",
    shortestCount: "Camí més curt: {value} comarques",
    topTime: "Top temps",
    topAttempts: "Top intents",
    topRoute: "Top ruta",
    bestTimes: "Millors temps",
    shortestRoute: "Ruta més curta",
    fewestAttempts: "Menys intents",
    loadingRanking: "Carregant rànquing, lo...",
    noRewards: "Ara no hi ha premis, lo.",
    copy: "Copia",
    copied: "Copiat",
    on: "On",
    off: "Off",
    congrats: "Felicitats, lo!",
    timeOut: "Temps esgotat, lo",
    achievementsAllTitle: "Felicitats!",
    achievementsAllBody:
      "Has completat tots els assoliments. Ara ets cap de colla de rutes, lo.",
    ok: "D'acord"
  }
};

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

const RULE_TAGS = {
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

const ACHIEVEMENTS = [
  { id: "ruta-perfecta", label: "Ruta perfecta (camí més curt)", rewardCoins: 18 },
  { id: "sense-pistes", label: "Sense comodins", rewardCoins: 12 },
  { id: "rapid", label: "Menys d'1 minut", rewardCoins: 16 },
  { id: "ruta-neta", label: "Ruta neta (sense extra)", rewardCoins: 10 },
  { id: "marato", label: "Marató (8+ comarques)", rewardCoins: 20 },
  { id: "sense-repeticions", label: "Sense repeticions", rewardCoins: 10 },
  { id: "setmana-complerta", label: "Setmanal completat", rewardCoins: 22 },
  { id: "streak-7", label: "7 dies seguits", rewardCoins: 16 },
  { id: "streak-30", label: "30 dies seguits", rewardCoins: 26 },
  { id: "speedrun-rapid", label: "Contrarellotge sota 1:30", rewardCoins: 18 },
  { id: "secret-perfecta", label: "Ruta impecable", rewardCoins: 24, secret: true },
  { id: "secret-explorador", label: "Explorador de segells", rewardCoins: 20, secret: true }
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
  if (def.difficulty) return def.difficulty;
  if (EXPERT_RULES.has(def.id)) return "expert";
  if (HARD_RULES.has(def.id)) return "hard";
  if (EASY_RULES.has(def.id)) return "easy";
  return "medium";
}

function getRuleTags(def) {
  if (def.tags && def.tags.length) return def.tags;
  return RULE_TAGS[def.id] || ["geo"];
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

function formatDayLabel(dayKey) {
  if (!dayKey) return "";
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString("ca-ES", { day: "2-digit", month: "short" });
}

function formatWeekLabel(weekKey) {
  if (!weekKey) return "";
  const [year, week] = weekKey.split("-W");
  if (!year || !week) return weekKey;
  return `Setm. ${week} - ${year}`;
}

function getStreakTitle(streak) {
  if (streak >= 30) return "Mestre dels Camins";
  if (streak >= 14) return "Cartògraf del Dia";
  if (streak >= 7) return "Ruter Constant";
  if (streak >= 3) return "Caminant";
  return "Explorador";
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
  const tags = resolved.tags || getRuleTags(def);
  const names = resolved.comarques || [];
  const comarcaIds = names
    .map((name) => ctx.normalizedToId.get(normalizeName(name)))
    .filter(Boolean);
  return { ...resolved, comarcaIds, difficulty, tags };
}

function buildRuleFromLevel(level, comarcaById, normalizedToId) {
  if (!level?.rule_id) return null;
  const base = RULE_DEFS.find((def) => def.id === level.rule_id) || null;
  const avoidIds = Array.isArray(level.avoid_ids) ? level.avoid_ids : [];
  const mustPassIds = Array.isArray(level.must_pass_ids) ? level.must_pass_ids : [];
  const kind = base?.kind || (avoidIds.length ? "avoid" : "mustIncludeAny");
  let comarcaIds = kind === "avoid" ? avoidIds : mustPassIds;
  if (!comarcaIds.length && base?.comarques?.length && normalizedToId) {
    comarcaIds = base.comarques
      .map((name) => normalizedToId.get(normalizeName(name)))
      .filter(Boolean);
  }
  const comarques = comarcaIds
    .map((id) => comarcaById.get(id)?.properties.name)
    .filter(Boolean);
  let label = base?.label;
  if (!label) {
    if (kind === "avoid") {
      const name = comarques[0] || "aquesta comarca";
      label = `No pots passar per ${name}.`;
    } else {
      label = "Has de passar per algun lloc clau.";
    }
  }
  const difficulty = base ? getRuleDifficulty(base) : "medium";
  const tags = base ? getRuleTags(base) : ["geo"];
  return {
    id: level.rule_id,
    kind,
    label,
    comarques,
    comarcaIds,
    difficulty,
    tags
  };
}

function isRuleFeasible(rule, ctx) {
  if (!rule) return false;
  if (rule.kind === "avoid") {
    const blocked = rule.comarcaIds || [];
    if (!blocked.length) return false;
    const blockedSet = new Set(blocked);
    const allowed = new Set(ctx.allIds.filter((id) => !blockedSet.has(id)));
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
    const forbidden = rule.comarcaIds || [];
    if (!forbidden.length) return { satisfied: true, failed: false };
    const isForbidden = forbidden.some((id) => ctx.guessedSet.has(id));
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
    if (typeof window === "undefined") return "pixapi";
    const stored = localStorage.getItem("rumb-difficulty") || "";
    if (DIFFICULTIES.some((entry) => entry.id === stored)) return stored;
    return "pixapi";
  });
  const [coins, setCoins] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(ROVELLONS_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [unlockedDifficulties, setUnlockedDifficulties] = useState(() => {
    if (typeof window === "undefined") return new Set(["pixapi"]);
    const raw = localStorage.getItem(DIFFICULTY_UNLOCKS_KEY);
    if (!raw) return new Set(["pixapi"]);
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : ["pixapi"];
      return new Set(list.length ? list : ["pixapi"]);
    } catch {
      return new Set(["pixapi"]);
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(SFX_SETTINGS_KEY);
    if (!raw) return true;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.enabled ?? true;
    } catch {
      return true;
    }
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    if (typeof window === "undefined") return 0.5;
    const raw = localStorage.getItem(SFX_SETTINGS_KEY);
    if (!raw) return 0.5;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.volume === "number" ? parsed.volume : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(MUSIC_SETTINGS_KEY);
    if (!raw) return true;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.enabled ?? true;
    } catch {
      return true;
    }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    if (typeof window === "undefined") return 0.3;
    const raw = localStorage.getItem(MUSIC_SETTINGS_KEY);
    if (!raw) return 0.3;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.volume === "number" ? parsed.volume : 0.3;
    } catch {
      return 0.3;
    }
  });
  const [musicTrack, setMusicTrack] = useState(() => {
    if (typeof window === "undefined") return "segadors";
    const raw = localStorage.getItem(MUSIC_SETTINGS_KEY);
    if (!raw) return "segadors";
    try {
      const parsed = JSON.parse(raw);
      return parsed?.track || "segadors";
    } catch {
      return "segadors";
    }
  });
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "ca";
    return localStorage.getItem(LANGUAGE_KEY) || "ca";
  });
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem(ACTIVE_THEME_KEY) || "default";
  });
  const [themesOwned, setThemesOwned] = useState(() => {
    if (typeof window === "undefined") return new Set(["default"]);
    const raw = localStorage.getItem(THEMES_KEY);
    if (!raw) return new Set(["default"]);
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : ["default"];
      return new Set(list.length ? list : ["default"]);
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
  const [dailyResults, setDailyResults] = useState(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(DAILY_RESULTS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [weeklyResults, setWeeklyResults] = useState(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(WEEKLY_RESULTS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [calendarMode, setCalendarMode] = useState("daily");
  const [calendarDaily, setCalendarDaily] = useState([]);
  const [calendarWeekly, setCalendarWeekly] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState("idle");
  const [calendarSelection, setCalendarSelection] = useState(null);
  const [levelStats, setLevelStats] = useState(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(LEVEL_STATS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [groupCode, setGroupCode] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem(GROUP_META_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed?.code || params.get("group") || "";
      } catch {
        return params.get("group") || "";
      }
    }
    return params.get("group") || localStorage.getItem(GROUP_KEY) || "";
  });
  const [groupName, setGroupName] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem(GROUP_META_KEY);
    if (!stored) return "";
    try {
      const parsed = JSON.parse(stored);
      return parsed?.name || "";
    } catch {
      return "";
    }
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
  const [claimedAchievements, setClaimedAchievements] = useState(() => {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(ACHIEVEMENTS_CLAIMED_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [supabaseUserId, setSupabaseUserId] = useState(null);
  const [timeLimitMs, setTimeLimitMs] = useState(DEFAULT_TIME_LIMIT_MS);
  const [timePenaltyMs, setTimePenaltyMs] = useState(0);
  const [showAllAchievementsModal, setShowAllAchievementsModal] = useState(false);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const copyTimerRef = useRef(null);
  const groupCopyTimerRef = useRef(null);
  const hintTimersRef = useRef({});
  const replayTimerRef = useRef(null);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const musicTimerRef = useRef(null);
  const playerIdRef = useRef(getPlayerId());
  const calendarApplyRef = useRef(null);

  const leaderboardEndpoint = import.meta.env.VITE_LEADERBOARD_URL || "";
  const isExploreMode = gameMode === "explore";
  const isTimedMode = gameMode === "timed";
  const isWeeklyMode = gameMode === "weekly";
  const isDailyMode = gameMode === "daily";
  const isFixedMode = isDailyMode || isWeeklyMode;
  const activeDifficulty = isFixedMode ? "cap-colla-rutes" : difficulty;
  const difficultyConfig = useMemo(() => {
    return DIFFICULTIES.find((entry) => entry.id === activeDifficulty) || DIFFICULTIES[0];
  }, [activeDifficulty]);
  const timeLeftMs = Math.max(timeLimitMs - elapsedMs - timePenaltyMs, 0);
  const weekKey = useMemo(() => getWeekKey(), []);
  const dayKey = useMemo(() => getDayKey(), []);
  const calendarDailyMap = useMemo(() => {
    return new Map(calendarDaily.map((entry) => [entry.date, entry]));
  }, [calendarDaily]);
  const calendarWeeklyMap = useMemo(() => {
    return new Map(calendarWeekly.map((entry) => [entry.weekKey, entry]));
  }, [calendarWeekly]);
  const activeDayKey =
    gameMode === "daily" && calendarSelection?.mode === "daily"
      ? calendarSelection.key
      : dayKey;
  const activeWeekKey =
    gameMode === "weekly" && calendarSelection?.mode === "weekly"
      ? calendarSelection.key
      : weekKey;
  const activeCalendarEntry = useMemo(() => {
    if (!calendarSelection) return null;
    if (calendarSelection.mode === "daily") {
      return calendarDailyMap.get(calendarSelection.key) || null;
    }
    if (calendarSelection.mode === "weekly") {
      return calendarWeeklyMap.get(calendarSelection.key) || null;
    }
    return null;
  }, [calendarSelection, calendarDailyMap, calendarWeeklyMap]);
  const isCalendarModeActive = Boolean(
    calendarSelection &&
      calendarSelection.mode === gameMode &&
      activeCalendarEntry?.level
  );
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
  const t = useMemo(() => {
    const table = STRINGS[language] || STRINGS.ca;
    return (key, vars = {}) => {
      let text = table[key] || STRINGS.ca[key] || key;
      Object.entries(vars).forEach(([token, value]) => {
        text = text.replace(new RegExp(`\\{${token}\\}`, "g"), String(value));
      });
      return text;
    };
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("rumb-mode", gameMode);
    localStorage.setItem("rumb-difficulty", difficulty);
    localStorage.setItem(ACTIVE_THEME_KEY, activeTheme);
    localStorage.setItem(GROUP_KEY, groupCode);
    localStorage.setItem(LANGUAGE_KEY, language);
    localStorage.setItem(ROVELLONS_KEY, `${coins}`);
  }, [gameMode, difficulty, activeTheme, groupCode, language, coins]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEMES_KEY, JSON.stringify([...themesOwned]));
  }, [themesOwned]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      DIFFICULTY_UNLOCKS_KEY,
      JSON.stringify([...unlockedDifficulties])
    );
  }, [unlockedDifficulties]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked]));
  }, [unlocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      ACHIEVEMENTS_CLAIMED_KEY,
      JSON.stringify([...claimedAchievements])
    );
  }, [claimedAchievements]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      MUSIC_SETTINGS_KEY,
      JSON.stringify({ enabled: musicEnabled, volume: musicVolume, track: musicTrack })
    );
  }, [musicEnabled, musicVolume, musicTrack]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      SFX_SETTINGS_KEY,
      JSON.stringify({ enabled: soundEnabled, volume: sfxVolume })
    );
  }, [soundEnabled, sfxVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(COLLECTIBLES_KEY, JSON.stringify([...collectibles]));
  }, [collectibles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(dailyResults));
  }, [dailyResults]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(WEEKLY_RESULTS_KEY, JSON.stringify(weeklyResults));
  }, [weeklyResults]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LEVEL_STATS_KEY, JSON.stringify(levelStats));
  }, [levelStats]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      GROUP_META_KEY,
      JSON.stringify({ code: groupCode, name: groupName })
    );
  }, [groupCode, groupName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  }, [history]);

  useEffect(() => {
    if (!supabaseUserId) return;
    supabase
      .from("players")
      .update({
        coins,
        unlocked_difficulties: [...unlockedDifficulties],
        themes_owned: [...themesOwned],
        achievements_claimed: [...claimedAchievements],
        language,
        music_track: musicTrack,
        music_enabled: musicEnabled,
        music_volume: musicVolume,
        sfx_enabled: soundEnabled,
        sfx_volume: sfxVolume,
        group_code: groupCode || null,
        group_name: groupName || null,
        last_seen: new Date().toISOString()
      })
      .eq("id", supabaseUserId)
      .then(() => {})
      .catch(() => {});
  }, [
    supabaseUserId,
    coins,
    unlockedDifficulties,
    themesOwned,
    claimedAchievements,
    language,
    musicTrack,
    musicEnabled,
    musicVolume,
    soundEnabled,
    sfxVolume,
    groupCode,
    groupName
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const theme = getThemeById(activeTheme);
    Object.entries(theme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [activeTheme]);

  useEffect(() => {
    if (!themesOwned.has(activeTheme)) {
      setActiveTheme("default");
    }
  }, [themesOwned, activeTheme]);

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
          difficulty: activeDifficulty,
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
    activeDifficulty,
    dailyStreak
  ]);

  useEffect(() => {
    if (!comarques.length || !adjacency.size) return;
    if (isCalendarModeActive) return;
    resetGame();
  }, [comarques, adjacency, gameMode, activeDifficulty, isCalendarModeActive]);

  useEffect(() => {
    if (!calendarSelection || !activeCalendarEntry?.level) return;
    if (calendarSelection.mode !== gameMode) return;
    const key = `${calendarSelection.mode}:${calendarSelection.key}`;
    if (calendarApplyRef.current === key) return;
    const result =
      calendarSelection.mode === "daily"
        ? dailyResults[calendarSelection.key]
        : weeklyResults[calendarSelection.key];
    applyCalendarLevel(activeCalendarEntry.level, {
      result,
      showResult: Boolean(result)
    });
    calendarApplyRef.current = key;
  }, [
    calendarSelection,
    activeCalendarEntry,
    gameMode,
    dailyResults,
    weeklyResults
  ]);

  useEffect(() => {
    if (!leaderboardEndpoint && typeof window === "undefined") return;
    loadLeaderboard();
  }, [leaderboardEndpoint]);

  useEffect(() => {
    let isMounted = true;
    async function loadCalendar() {
      setCalendarStatus("loading");
      try {
        const dailyRes = await supabase
          .from("calendar_daily")
          .select("date, level_id")
          .order("date", { ascending: false })
          .limit(30);
        if (dailyRes.error) throw dailyRes.error;
        const weeklyRes = await supabase
          .from("calendar_weekly")
          .select("week_key, level_id")
          .order("week_key", { ascending: false })
          .limit(16);
        if (weeklyRes.error) throw weeklyRes.error;

        const dailyRows = Array.isArray(dailyRes.data) ? dailyRes.data : [];
        const weeklyRows = Array.isArray(weeklyRes.data) ? weeklyRes.data : [];
        const levelIds = [
          ...new Set(
            [...dailyRows, ...weeklyRows]
              .map((row) => row.level_id)
              .filter(Boolean)
          )
        ];

        const levelsById = new Map();
        if (levelIds.length) {
          const levelsRes = await supabase
            .from("levels")
            .select(
              "id, start_id, target_id, shortest_path, rule_id, avoid_ids, must_pass_ids, difficulty_id"
            )
            .in("id", levelIds);
          if (levelsRes.error) throw levelsRes.error;
          (levelsRes.data || []).forEach((level) => {
            levelsById.set(level.id, level);
          });
        }

        const dailyEntries = dailyRows.map((row) => ({
          date: row.date,
          levelId: row.level_id,
          level: levelsById.get(row.level_id) || null
        }));
        const weeklyEntries = weeklyRows.map((row) => ({
          weekKey: row.week_key,
          levelId: row.level_id,
          level: levelsById.get(row.level_id) || null
        }));
        if (isMounted) {
          setCalendarDaily(dailyEntries);
          setCalendarWeekly(weeklyEntries);
          setCalendarStatus("ready");
        }
      } catch {
        if (isMounted) {
          setCalendarStatus("error");
        }
      }
    }

    loadCalendar();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (gameMode === "daily" || gameMode === "weekly") return;
    if (calendarSelection) {
      setCalendarSelection(null);
      calendarApplyRef.current = null;
    }
  }, [gameMode, calendarSelection]);

  useEffect(() => {
    if (unlockedDifficulties.has(difficulty)) return;
    const fallback =
      DIFFICULTIES.find((entry) => unlockedDifficulties.has(entry.id)) ||
      DIFFICULTIES[0];
    if (fallback && fallback.id !== difficulty) {
      setDifficulty(fallback.id);
    }
  }, [unlockedDifficulties, difficulty]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    startMusic();
    return () => {
      stopMusic();
    };
  }, [musicEnabled, musicTrack, musicVolume]);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        await supabase.auth.signInAnonymously();
      }
      const { data: fresh } = await supabase.auth.getUser();
      const user = fresh?.user;
      if (user && isMounted) {
        setSupabaseUserId(user.id);
        await supabase
          .from("players")
          .upsert(
            {
              id: user.id,
              name: user.user_metadata?.name || user.id,
              last_seen: new Date().toISOString()
            },
            { onConflict: "id" }
          );
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (playerData && isMounted) {
          if (typeof playerData.coins === "number") {
            setCoins(playerData.coins);
          }
          if (Array.isArray(playerData.unlocked_difficulties)) {
            setUnlockedDifficulties(new Set(playerData.unlocked_difficulties));
          }
          if (Array.isArray(playerData.themes_owned)) {
            setThemesOwned(new Set(playerData.themes_owned));
          }
          if (Array.isArray(playerData.achievements_claimed)) {
            setClaimedAchievements(new Set(playerData.achievements_claimed));
          }
          if (typeof playerData.language === "string") {
            setLanguage(playerData.language);
          }
          if (typeof playerData.music_enabled === "boolean") {
            setMusicEnabled(playerData.music_enabled);
          }
          if (typeof playerData.music_volume === "number") {
            setMusicVolume(playerData.music_volume);
          }
          if (typeof playerData.music_track === "string") {
            setMusicTrack(playerData.music_track);
          }
          if (typeof playerData.sfx_enabled === "boolean") {
            setSoundEnabled(playerData.sfx_enabled);
          }
          if (typeof playerData.sfx_volume === "number") {
            setSfxVolume(playerData.sfx_volume);
          }
          if (typeof playerData.group_code === "string") {
            setGroupCode(playerData.group_code);
          }
          if (typeof playerData.group_name === "string") {
            setGroupName(playerData.group_name);
          }
        }
      }
    }

    initAuth().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

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

  const showNeighborHintActive = tempNeighborHint;
  const showInitialsActive = tempInitialsHint;

  const replaySet = useMemo(() => {
    if (!replayOrder.length || replayIndex <= 0) return new Set();
    return new Set(replayOrder.slice(0, replayIndex));
  }, [replayOrder, replayIndex]);

  const neighborSet = useMemo(() => {
    if (!showNeighborHintActive || !currentId) return new Set();
    return adjacency.get(currentId) || new Set();
  }, [showNeighborHintActive, currentId, adjacency]);

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
      outlinePath: outline ? generator(outline) : null
    };
  }, [comarques, outline]);

  useEffect(() => {
    if (isComplete || isFailed) return;
    if (!pathInGuesses.length || !ruleStatus.satisfied) return;
    finishGame(pathInGuesses);
  }, [isComplete, isFailed, pathInGuesses, ruleStatus]);

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

  function playSfx(kind) {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    const ctx = audioRef.current;
    const palette = {
      correct: [
        [523, 659],
        [587, 784],
        [440, 660]
      ],
      repeat: [[220], [196], [246]],
      error: [
        [160, 120],
        [180, 140]
      ],
      neutral: [[392], [440]],
      coin: [
        [784, 988],
        [880, 1046]
      ],
      win: [
        [523, 659, 784],
        [587, 740, 880]
      ]
    };
    const picks = palette[kind] || palette.neutral;
    const frequencies = picks[Math.floor(Math.random() * picks.length)];
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0.02, Math.min(sfxVolume, 1)) * 0.12;
    gain.connect(ctx.destination);
    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    });
  }

  async function persistLevel(payload) {
    if (!payload) return;
    try {
      await supabase.from("levels").insert(payload);
    } catch {
      // Silencia errors de connexió o permisos.
    }
  }

  function stopMusic() {
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    if (musicRef.current?.ctx) {
      musicRef.current.ctx.close().catch(() => {});
    }
    musicRef.current = null;
  }

  function startMusic() {
    stopMusic();
    if (!musicEnabled) return;
    const track = MUSIC_TRACKS.find((item) => item.id === musicTrack);
    if (!track) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(musicVolume, 1)) * 0.08;
    gain.connect(ctx.destination);
    musicRef.current = { ctx, gain };
    let index = 0;
    const playNote = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = track.notes[index % track.notes.length];
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
      index += 1;
    };
    playNote();
    musicTimerRef.current = setInterval(playNote, track.tempo);
  }

  function applyCalendarLevel(level, options = {}) {
    if (!level) return;
    const { result, showResult } = options;
    const start = level.start_id;
    const target = level.target_id;
    const nextShortest = Array.isArray(level.shortest_path) ? level.shortest_path : [];
    const rule = buildRuleFromLevel(level, comarcaById, normalizedToId);
    const playerPath = Array.isArray(result?.playerPath) ? result.playerPath : [];
    const basePowerups = getPowerupUses(activeDifficulty);

    setStartId(start);
    setTargetId(target);
    setCurrentId(start);
    setGuessHistory(playerPath);
    setAttempts(result?.attempts || 0);
    setHintsUsed(result?.hintsUsed || 0);
    setTempRevealId(null);
    setTempNeighborHint(false);
    setTempInitialsHint(false);
    setPowerups(basePowerups);
    setReplayMode(null);
    setReplayOrder([]);
    setReplayIndex(0);
    setGuessValue("");
    setIsSuggestionsOpen(false);
    setIsComplete(Boolean(result));
    setIsFailed(Boolean(result?.failed));
    setShowModal(Boolean(result && showResult));
    setResultData(result || null);
    setShortestPath(nextShortest);
    setActiveRule(rule);
    setElapsedMs(result?.timeMs || 0);
    setStartedAt(isTimedMode && !result ? Date.now() : null);
    setTimePenaltyMs(0);
    if (isTimedMode) {
      const internalCount = Math.max(nextShortest.length - 2, 0);
      setTimeLimitMs(Math.max(15000, internalCount * 5000));
    } else {
      setTimeLimitMs(DEFAULT_TIME_LIMIT_MS);
    }
    setLastEntryId(null);
    setCopyStatus("idle");
  }

  function resetGame(forceNew = false) {
    if (!comarques.length) return;
    const ids = comarques.map((featureItem) => featureItem.properties.id);
    const todayKey = getDayKey();
    const baseSeed =
      gameMode === "daily"
        ? `${todayKey}-${activeDifficulty}`
        : gameMode === "weekly"
          ? `${weekKey}-${activeDifficulty}`
          : null;
    const seed = baseSeed && !forceNew ? baseSeed : null;
    const rng = seed ? mulberry32(hashString(seed)) : Math.random;
    const minInternal = isDailyMode
      ? DAILY_MIN_INTERNAL
      : isWeeklyMode
        ? WEEKLY_MIN_INTERNAL
        : isExploreMode
          ? EXPLORE_MIN_INTERNAL
          : difficultyConfig.minInternal || 4;
    const minLength = minInternal + 2;
    const comarcaNames = comarques.map((featureItem) => featureItem.properties.name);
    const allowedLevels = difficultyConfig.ruleLevels || ["medium"];
    const rulePool = RULE_DEFS.filter((def) =>
      allowedLevels.includes(getRuleDifficulty(def))
    );
    const highPool = RULE_DEFS.filter((def) => {
      const difficultyLevel = getRuleDifficulty(def);
      const tags = getRuleTags(def);
      const hasCultural = tags.includes("cultural");
      const hasGeo = tags.includes("geo");
      return difficultyLevel === "expert" && (hasCultural || hasGeo);
    });
    const pool = isDailyMode || isWeeklyMode
      ? highPool.length
        ? highPool
        : rulePool.length
          ? rulePool
          : RULE_DEFS
      : rulePool.length
        ? rulePool
        : RULE_DEFS;
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
      const candidateRule = isExploreMode ? null : pickRule(pool, ctx);
      if (!isExploreMode && !candidateRule) continue;
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
      nextShortest = path;
      selectedRule = candidateRule;
      break;
    }

    if (!start || !target || (!isExploreMode && !selectedRule)) {
      let fallbackAttempts = 500;
      while (fallbackAttempts > 0) {
        fallbackAttempts -= 1;
        const candidateStart = pickRandom(ids, rng);
        const candidateTarget = pickRandom(ids, rng);
        if (candidateTarget === candidateStart) continue;
        const neighbors = adjacency.get(candidateStart);
        if (neighbors && neighbors.has(candidateTarget)) continue;
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
        const candidateRule = isExploreMode ? null : pickRule(pool, ctx);
        if (!isExploreMode && !candidateRule) continue;
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
      selectedRule = isExploreMode
        ? null
        : pickRule(pool, {
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
    setTempRevealId(null);
    setTempNeighborHint(false);
    setTempInitialsHint(false);
    const basePowerups = getPowerupUses(activeDifficulty);
    const explorePowerups = Object.fromEntries(
      POWERUPS.map((powerup) => [powerup.id, 99])
    );
    setPowerups(isExploreMode ? explorePowerups : basePowerups);
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
    setActiveRule(isExploreMode ? null : selectedRule);
    setElapsedMs(0);
    setStartedAt(isTimedMode ? Date.now() : null);
    setTimePenaltyMs(0);
    if (isTimedMode) {
      const internalCount = Math.max(nextShortest.length - 2, 0);
      setTimeLimitMs(Math.max(15000, internalCount * 5000));
    } else {
      setTimeLimitMs(DEFAULT_TIME_LIMIT_MS);
    }
    setLastEntryId(null);
    setCopyStatus("idle");

    const avoidIds =
      selectedRule?.kind === "avoid" ? selectedRule.comarcaIds || [] : [];
    const mustPassIds =
      selectedRule?.kind === "mustIncludeAny" ? selectedRule.comarcaIds || [] : [];
    const shouldPersist = !isFixedMode && (forceNew || !baseSeed);
    if (shouldPersist) {
      const payload = {
        level_type: gameMode,
        date: gameMode === "daily" ? todayKey : null,
        week_key: gameMode === "weekly" ? weekKey : null,
        difficulty_id: activeDifficulty,
        rule_id: selectedRule?.id || null,
        start_id: start,
        target_id: target,
        shortest_path: nextShortest,
        avoid_ids: avoidIds.length ? avoidIds : null,
        must_pass_ids: mustPassIds.length ? mustPassIds : null
      };
      persistLevel(payload);
    }
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
    if (isComplete || isFailed) return;
    const powerup = POWERUPS.find((item) => item.id === powerupId);
    if (!powerup) return;
    const usesLeft = powerups[powerupId] ?? 0;
    if (!isExploreMode && usesLeft <= 0) {
      if (isTimedMode) {
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
            difficulty: activeDifficulty,
            streak: displayStreak
          }
        );
      }
      return;
    }
    if (powerupId === "reveal-next") {
      const revealId =
        shortestPath.find(
          (id) => id !== startId && id !== targetId && !guessedSet.has(id)
        ) || null;
      if (!revealId) return;
      if (!isExploreMode) {
        setPowerups((prev) => ({
          ...prev,
          [powerupId]: Math.max((prev[powerupId] || 0) - 1, 0)
        }));
      }
      setHintsUsed((prev) => prev + 1);
      if (isTimedMode) {
        setTimePenaltyMs((prev) => prev + (powerup.penaltyMs || 0));
      }
      if (hintTimersRef.current.reveal) clearTimeout(hintTimersRef.current.reveal);
      setTempRevealId(revealId);
      hintTimersRef.current.reveal = setTimeout(() => {
        setTempRevealId(null);
      }, powerup.durationMs || 5000);
      return;
    }
    if (!isExploreMode) {
      setPowerups((prev) => ({
        ...prev,
        [powerupId]: Math.max((prev[powerupId] || 0) - 1, 0)
      }));
    }
    setHintsUsed((prev) => prev + 1);
    if (isTimedMode) {
      setTimePenaltyMs((prev) => prev + (powerup.penaltyMs || 0));
    }
    if (powerupId === "temp-neighbors") {
      activateTempHint("neighbors", powerup.durationMs || 5000, setTempNeighborHint);
      return;
    }
    if (powerupId === "temp-initials") {
      activateTempHint("initials", powerup.durationMs || 5000, setTempInitialsHint);
    }
  }

  function handleGuessSubmit(event) {
    event.preventDefault();
    if (!startId || !targetId || isComplete || isFailed) return;

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
      playSfx("neutral");
      return;
    }

    const alreadyGuessed = guessedSet.has(id);
    if (!alreadyGuessed) {
      const name = comarcaById.get(id)?.properties.name || trimmed;
      setGuessHistory((prev) => [...prev, { id, name }]);
      playSfx("correct");
    } else {
      playSfx("repeat");
    }
  }

  function handleGuessChange(event) {
    const value = event.target.value;
    setGuessValue(value);
    setIsSuggestionsOpen(Boolean(value.trim()));
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

  function handleCalendarPick(mode, key) {
    const entry =
      mode === "daily" ? calendarDailyMap.get(key) : calendarWeeklyMap.get(key);
    calendarApplyRef.current = null;
    setCalendarMode(mode);
    if (!entry?.level) {
      setCalendarSelection(null);
      if (gameMode !== mode) {
        setGameMode(mode);
      } else {
        resetGame();
      }
      return;
    }
    setCalendarSelection({ mode, key });
    if (gameMode !== mode) {
      setGameMode(mode);
      return;
    }
    const result = mode === "daily" ? dailyResults[key] : weeklyResults[key];
    applyCalendarLevel(entry.level, { result, showResult: Boolean(result) });
    calendarApplyRef.current = `${mode}:${key}`;
  }

  function handleStartNext() {
    if (isDailyMode && dailyResults[activeDayKey]) {
      setResultData(dailyResults[activeDayKey]);
      setShowModal(true);
      return;
    }
    if (isWeeklyMode && weeklyResults[activeWeekKey]) {
      setResultData(weeklyResults[activeWeekKey]);
      setShowModal(true);
      return;
    }
    if (isDailyMode && calendarSelection?.mode === "daily") {
      const entry = calendarDailyMap.get(activeDayKey);
      if (entry?.level) {
        applyCalendarLevel(entry.level);
        calendarApplyRef.current = `daily:${activeDayKey}`;
        return;
      }
    }
    if (isWeeklyMode && calendarSelection?.mode === "weekly") {
      const entry = calendarWeeklyMap.get(activeWeekKey);
      if (entry?.level) {
        applyCalendarLevel(entry.level);
        calendarApplyRef.current = `weekly:${activeWeekKey}`;
        return;
      }
    }
    resetGame(!isFixedMode);
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
    if (!themesOwned.has(themeId)) return;
    setActiveTheme(themeId);
  }

  function handleThemePurchase(themeId) {
    if (themesOwned.has(themeId)) return;
    const cost = THEME_COSTS[themeId] || 0;
    if (coins < cost) return;
    setCoins((prev) => Math.max(prev - cost, 0));
    setThemesOwned((prev) => new Set([...prev, themeId]));
    setActiveTheme(themeId);
    playSfx("coin");
  }

  function handleDifficultyPick(difficultyId) {
    if (!unlockedDifficulties.has(difficultyId)) return;
    setDifficulty(difficultyId);
  }

  function handleDifficultyPurchase(difficultyId) {
    if (unlockedDifficulties.has(difficultyId)) return;
    const cost = DIFFICULTY_COSTS[difficultyId] || 0;
    if (coins < cost) return;
    setCoins((prev) => Math.max(prev - cost, 0));
    setUnlockedDifficulties((prev) => new Set([...prev, difficultyId]));
    setDifficulty(difficultyId);
    playSfx("coin");
  }

  function sanitizeGroupCode(value) {
    return value.replace(/\D/g, "").slice(0, 5);
  }

  function copyGroupLink(code) {
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

  function handleCreateGroup() {
    const code = `${Math.floor(10000 + Math.random() * 90000)}`;
    setGroupCode(code);
    if (!groupName.trim()) {
      setGroupName(`Colla ${code}`);
    }
    copyGroupLink(code);
  }

  function handleJoinGroup() {
    const normalized = sanitizeGroupCode(groupCode);
    if (normalized.length !== 5) return;
    setGroupCode(normalized);
  }

  function handleGroupCopy() {
    const normalized = sanitizeGroupCode(groupCode);
    if (normalized.length !== 5) return;
    copyGroupLink(normalized);
  }

  function handleDailySelect() {
    handleCalendarPick("daily", dayKey);
  }

  function handleWeeklySelect() {
    handleCalendarPick("weekly", weekKey);
  }

  function handleClaimAchievement(achievementId) {
    if (!unlocked.has(achievementId)) return;
    if (claimedAchievements.has(achievementId)) return;
    const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
    if (!achievement) return;
    setClaimedAchievements((prev) => {
      const next = new Set(prev);
      next.add(achievementId);
      if (next.size >= ACHIEVEMENTS.length) {
        setShowAllAchievementsModal(true);
      }
      return next;
    });
    if (achievement.rewardCoins) {
      setCoins((prev) => prev + achievement.rewardCoins);
    }
    playSfx("coin");
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
    const normalize = (value) =>
      Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    const sorted = [...entries].sort((a, b) => {
      const aValue = normalize(a[key]);
      const bValue = normalize(b[key]);
      if (aValue === bValue) return (a.timeMs || 0) - (b.timeMs || 0);
      return aValue - bValue;
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
    const ruleTags = activeRule ? getRuleTags(activeRule) : [];

    let nextStreak = dailyStreak;
    const isCurrentDaily = gameMode === "daily" && activeDayKey === dayKey;
    if (isCurrentDaily) {
      const today = dayKey;
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

    const levelKey = isDailyMode
      ? `daily:${activeDayKey}`
      : isWeeklyMode
        ? `weekly:${activeWeekKey}`
        : `${gameMode}:${activeDifficulty}:${startId || "?"}:${targetId || "?"}:${ruleId || "none"}`;

    const ruleRewardMap = { easy: 10, medium: 14, hard: 22, expert: 30 };
    const baseRuleReward = ruleRewardMap[ruleDifficulty] || 12;
    let coinsEarned = 0;
    if (isDailyMode) {
      coinsEarned = 40 + baseRuleReward;
    } else if (isWeeklyMode) {
      coinsEarned = 75 + baseRuleReward;
    } else if (isTimedMode) {
      coinsEarned = 12 + baseRuleReward;
    } else if (isExploreMode) {
      coinsEarned = 8;
    } else {
      coinsEarned = 5;
    }
    if (distance === 0) {
      const nextDifficulty = getNextDifficultyId(activeDifficulty);
      const nextCost = nextDifficulty ? DIFFICULTY_COSTS[nextDifficulty] || 0 : 0;
      if (gameMode === "normal" && nextCost) {
        coinsEarned = Math.max(coinsEarned, nextCost);
      } else {
        coinsEarned += 10;
      }
    } else {
      coinsEarned = Math.min(coinsEarned, 6);
    }
    coinsEarned = Math.max(0, coinsEarned - hintsUsed * 2);
    if (coinsEarned > 0) {
      setCoins((prev) => prev + coinsEarned);
    }

    setLevelStats((prev) => {
      const current = prev[levelKey] || {};
      const bestTime = current.bestTime ? Math.min(current.bestTime, totalTime) : totalTime;
      const bestAttempts = current.bestAttempts
        ? Math.min(current.bestAttempts, attempts)
        : attempts;
      const perfect = current.perfect || distance === 0;
      return {
        ...prev,
        [levelKey]: { bestTime, bestAttempts, perfect }
      };
    });

    const normalizedGroup = groupCode.trim() || null;
    const entry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      playerId: playerIdRef.current,
      mode: gameMode,
      mapId: MAP_ID,
      difficulty: activeDifficulty,
      timeMs: totalTime,
      attempts,
      guesses: guessedIds.length,
      distance,
      shortest: shortestCount,
      found: foundCount,
      ruleId,
      ruleDifficulty,
      ruleTags,
      startId,
      targetId,
      region: regionId,
      group: normalizedGroup,
      groupName: groupName || null,
      weekKey: isWeeklyMode ? activeWeekKey : null,
      dayKey: isDailyMode ? activeDayKey : null,
      coinsEarned,
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
    if (isTimedMode && totalTime <= 90000) earned.add("speedrun-rapid");
    if (nextStreak.count >= 7) earned.add("streak-7");
    if (nextStreak.count >= 30) earned.add("streak-30");
    if (distance === 0 && hintsUsed === 0) earned.add("secret-perfecta");
    if (updatedCollectibles.size >= 20) earned.add("secret-explorador");

    setUnlocked(earned);

    setIsComplete(true);
    playSfx("win");
    confetti({ particleCount: 180, spread: 70, origin: { y: 0.7 } });
    setLastEntryId(entry.id);

    setHistory((prev) => {
      const historyEntry = {
        id: entry.id,
        date: entry.createdAt,
        mode: gameMode,
        difficulty: activeDifficulty,
        timeMs: totalTime,
        attempts,
        distance,
        shortest: shortestCount,
        found: foundCount,
        rule: activeRule?.label || "Sense norma"
      };
      return [...prev, historyEntry].slice(-20);
    });

    const resultPayload = {
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
      difficulty: activeDifficulty,
      streak: nextStreak.count || 0,
      coinsEarned
    };

    if (isDailyMode) {
      setDailyResults((prev) => ({ ...prev, [activeDayKey]: resultPayload }));
    }
    if (isWeeklyMode) {
      setWeeklyResults((prev) => ({ ...prev, [activeWeekKey]: resultPayload }));
    }

    submitLeaderboard(entry).then(() => {
      setResultData(resultPayload);
      setShowModal(true);
    });

    if (supabaseUserId) {
      supabase
        .from("attempts")
        .insert({
          id: entry.id,
          player_id: supabaseUserId,
          level_type: entry.mode,
          difficulty_id: entry.difficulty,
          time_ms: entry.timeMs,
          attempts: entry.attempts,
          guesses: entry.guesses,
          distance: entry.distance,
          shortest: entry.shortest,
          found: entry.found,
          rule_id: entry.ruleId,
          rule_difficulty: entry.ruleDifficulty,
          start_id: entry.startId,
          target_id: entry.targetId,
          region: entry.region,
          group_code: entry.group,
          group_name: entry.groupName,
          week_key: entry.weekKey,
          day_key: entry.dayKey,
          coins_earned: entry.coinsEarned,
          created_at: entry.createdAt
        })
        .then(() => {})
        .catch(() => {});
    }
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
  const isDailyCompleted = Boolean(dailyResults[activeDayKey]);
  const isWeeklyCompleted = Boolean(weeklyResults[activeWeekKey]);
  const activeRuleDifficulty = activeRule?.difficulty || (activeRule ? getRuleDifficulty(activeRule) : null);
  const currentLevelKey = useMemo(() => {
    if (isDailyMode) return `daily:${activeDayKey}`;
    if (isWeeklyMode) return `weekly:${activeWeekKey}`;
    return `${gameMode}:${activeDifficulty}:${startId || "?"}:${targetId || "?"}:${activeRule?.id || "none"}`;
  }, [
    isDailyMode,
    isWeeklyMode,
    activeDayKey,
    activeWeekKey,
    gameMode,
    activeDifficulty,
    startId,
    targetId,
    activeRule?.id
  ]);
  const currentStats = currentLevelKey ? levelStats[currentLevelKey] || {} : {};
  const isPerfectRecord = currentStats.perfect;
  const timeLeftUrgent = isTimedMode && timeLeftMs <= 10000;
  const shouldShowSuggestions = isSuggestionsOpen && suggestions.length > 0;
  const activeTrack = MUSIC_TRACKS.find((track) => track.id === musicTrack);
  const groupCodeClean = sanitizeGroupCode(groupCode);
  const claimableAchievements = ACHIEVEMENTS.filter(
    (achievement) =>
      unlocked.has(achievement.id) && !claimedAchievements.has(achievement.id)
  );
  const hasAllAchievements = claimedAchievements.size >= ACHIEVEMENTS.length;
  const calendarEntries = useMemo(() => {
    const list = calendarMode === "daily" ? calendarDaily : calendarWeekly;
    const limit = calendarMode === "daily" ? 14 : 12;
    return list.slice(0, limit);
  }, [calendarMode, calendarDaily, calendarWeekly]);

  const scopedEntries = useMemo(() => {
    let list = leaderboardEntries.filter((entry) => entry.mapId === MAP_ID || !entry.mapId);
    const groupFilter = sanitizeGroupCode(groupCode);
    if (rankingScope === "group") {
      if (groupFilter.length !== 5) return [];
      list = list.filter((entry) => entry.group === groupFilter);
    }
    if (rankingScope === "province" && startRegion?.id) {
      list = list.filter((entry) => entry.region === startRegion.id);
    }
    return list;
  }, [leaderboardEntries, rankingScope, groupCode, startRegion]);

  const modeEntries = useMemo(() => {
    if (gameMode === "daily") {
      return scopedEntries.filter(
        (entry) => entry.mode === "daily" && entry.dayKey === activeDayKey
      );
    }
    if (gameMode === "weekly") {
      return scopedEntries.filter(
        (entry) => entry.mode === "weekly" && entry.weekKey === activeWeekKey
      );
    }
    return scopedEntries.filter(
      (entry) => entry.mode === gameMode && entry.difficulty === activeDifficulty
    );
  }, [scopedEntries, gameMode, activeDayKey, activeWeekKey, activeDifficulty]);

  const rankings = useMemo(() => {
    if (!lastEntryId) return null;
    const scopedEntry = modeEntries.find((item) => item.id === lastEntryId);
    if (scopedEntry) {
      return {
        time: computeRank(modeEntries, scopedEntry, "timeMs"),
        distance: computeRank(modeEntries, scopedEntry, "distance"),
        attempts: computeRank(modeEntries, scopedEntry, "attempts")
      };
    }
    if (rankingScope !== "global") return null;
    const fallback = leaderboardEntries.find((item) => item.id === lastEntryId);
    if (!fallback) return null;
    return {
      time: computeRank(leaderboardEntries, fallback, "timeMs"),
      distance: computeRank(leaderboardEntries, fallback, "distance"),
      attempts: computeRank(leaderboardEntries, fallback, "attempts")
    };
  }, [lastEntryId, modeEntries, leaderboardEntries, rankingScope]);

  const leaderboardByTime = useMemo(() => {
    return [...modeEntries].sort((a, b) => a.timeMs - b.timeMs).slice(0, 5);
  }, [modeEntries]);

  const leaderboardByDistance = useMemo(() => {
    const normalize = (value) =>
      Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    return [...modeEntries]
      .sort((a, b) => {
        const aValue = normalize(a.distance);
        const bValue = normalize(b.distance);
        if (aValue === bValue) return a.timeMs - b.timeMs;
        return aValue - bValue;
      })
      .slice(0, 5);
  }, [modeEntries]);

  const leaderboardByAttempts = useMemo(() => {
    const normalize = (value) =>
      Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    return [...modeEntries]
      .sort((a, b) => {
        const aValue = normalize(a.attempts);
        const bValue = normalize(b.attempts);
        if (aValue === bValue) return a.timeMs - b.timeMs;
        return aValue - bValue;
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
        <div className="topbar-right">
          <div className="calendar-card">
            <span className="label">{t("calendar")}</span>
            <div className="calendar-tabs">
              <button
                type="button"
                className={`calendar-tab ${calendarMode === "daily" ? "active" : ""}`}
                onClick={() => setCalendarMode("daily")}
              >
                {t("daily")}
              </button>
              <button
                type="button"
                className={`calendar-tab ${calendarMode === "weekly" ? "active" : ""}`}
                onClick={() => setCalendarMode("weekly")}
              >
                {t("weekly")}
              </button>
            </div>
            <div className="calendar-list">
              {calendarStatus === "loading" ? (
                <span className="muted">{t("calendarLoading")}</span>
              ) : calendarEntries.length ? (
                calendarEntries.map((entry) => {
                  const key = calendarMode === "daily" ? entry.date : entry.weekKey;
                  const isDone =
                    calendarMode === "daily"
                      ? Boolean(dailyResults[entry.date])
                      : Boolean(weeklyResults[entry.weekKey]);
                  const isActive =
                    calendarSelection?.mode === calendarMode &&
                    calendarSelection.key === key;
                  const isCurrent =
                    calendarMode === "daily"
                      ? entry.date === dayKey
                      : entry.weekKey === weekKey;
                  const label =
                    calendarMode === "daily"
                      ? formatDayLabel(entry.date)
                      : formatWeekLabel(entry.weekKey);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`calendar-entry ${isActive ? "active" : ""} ${
                        isDone ? "done" : ""
                      } ${isCurrent ? "current" : ""}`}
                      onClick={() => handleCalendarPick(calendarMode, key)}
                      disabled={!entry.level}
                    >
                      <span>{label}</span>
                      {isDone ? <span className="calendar-status">OK</span> : null}
                    </button>
                  );
                })
              ) : (
                <span className="muted">{t("calendarEmpty")}</span>
              )}
            </div>
          </div>
          <div className="streak-card">
            <span className="label">Ratxa diària</span>
            <span className="value">{displayStreak} dies</span>
            <span className="muted">{streakTitle}</span>
          </div>
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
                  isStart || isTarget || isGuessed || isReplay || isPowerReveal;
                const isNeighbor =
                  showNeighborHintActive &&
                  !isRevealed &&
                  neighborSet.has(featureItem.id) &&
                  !isStart &&
                  !isTarget;
                const isHidden = !isRevealed && !isNeighbor;
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
          <div className="panel-card panel-primary">
            <div className="stat-row">
              <span className="label">{t("start")}</span>
              <span className="value start">{startName || "—"}</span>
            </div>
            <div className="stat-row">
              <span className="label">{t("target")}</span>
              <span className="value target">{targetName || "—"}</span>
            </div>
            <span className="label">{t("rule")}</span>
            <div
              className={`rule-chip ${
                ruleStatus.failed ? "bad" : ruleStatus.satisfied ? "good" : ""
              }`}
            >
              {activeRule?.label || t("noRule")}
            </div>
            {activeRuleDifficulty ? (
              <span className="muted">{formatRuleDifficulty(activeRuleDifficulty)}</span>
            ) : null}
            <div className="stat-row">
              <span className="label">{t("difficulty")}</span>
              <span className="value">{difficultyConfig.label}</span>
            </div>
            {isTimedMode ? (
              <div className="stat-row">
                <span className="label">{t("timeLeft")}</span>
                <span className={`value ${timeLeftUrgent ? "urgent" : "dim"}`}>
                  {timeLeftUrgent ? formatTime(timeLeftMs) : ""}
                </span>
              </div>
            ) : null}
            <div className="stat-row">
              <span className="label">{t("coins")}</span>
              <span className="value">{coins}</span>
            </div>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((entry) => {
                const isUnlocked = unlockedDifficulties.has(entry.id);
                const isActive = entry.id === activeDifficulty;
                const cost = DIFFICULTY_COSTS[entry.id] || 0;
                const isLocked = !isUnlocked && entry.id !== "pixapi";
                const canAfford = coins >= cost;
                const disabled = (isFixedMode && !isActive) || (!isUnlocked && !canAfford);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`difficulty-button ${isActive ? "active" : ""} ${
                      isLocked ? "locked" : ""
                    }`}
                    onClick={() => {
                      if (isFixedMode) return;
                      if (isUnlocked) {
                        handleDifficultyPick(entry.id);
                      } else {
                        handleDifficultyPurchase(entry.id);
                      }
                    }}
                    disabled={disabled}
                    aria-pressed={isActive}
                  >
                    <span>{entry.label}</span>
                    {!isUnlocked && cost ? (
                      <span className="price">{t("buyFor", { value: cost })}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {isFixedMode ? (
              <span className="muted">{t("fixedDifficulty")}</span>
            ) : null}
            <form className="guess-form" onSubmit={handleGuessSubmit}>
              <label className="label" htmlFor="guess-input">
                {t("guessLabel")}
              </label>
              <input
                id="guess-input"
                type="text"
                value={guessValue}
                onChange={handleGuessChange}
                onFocus={handleGuessFocus}
                onBlur={handleGuessBlur}
                disabled={isComplete || isFailed}
              />
              {shouldShowSuggestions ? (
                <div className="suggestions is-open">
                  {suggestions.map((name) => (
                    <button
                      className="suggestion"
                      type="button"
                      key={name}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionPick(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="submit" className="submit" disabled={isComplete || isFailed}>
                {t("submit")}
              </button>
            </form>
            <button className="reset" onClick={handleStartNext} type="button">
              {t("newGame")}
            </button>
          </div>

          <div className="panel-card">
            <span className="label">{t("dailyLevel")}</span>
            <div className="mode-buttons two">
              <button
                type="button"
                className={`mode-button ${gameMode === "daily" ? "active" : ""} ${
                  isDailyCompleted ? "done" : ""
                }`}
                onClick={handleDailySelect}
                aria-disabled={isDailyCompleted}
              >
                {isDailyCompleted ? t("dailyDone") : t("daily")}
              </button>
              <button
                type="button"
                className={`mode-button ${gameMode === "weekly" ? "active" : ""} ${
                  isWeeklyCompleted ? "done" : ""
                }`}
                onClick={handleWeeklySelect}
                aria-disabled={isWeeklyCompleted}
              >
                {isWeeklyCompleted ? t("weeklyDone") : t("weekly")}
              </button>
            </div>
          </div>

          <div className="panel-card">
            <span className="label">{t("mode")}</span>
            <div className="mode-buttons">
              {PRIMARY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-button ${gameMode === mode.id ? "active" : ""}`}
                  onClick={() => setGameMode(mode.id)}
                >
                  {t(mode.id)}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <span className="label">{t("powerups")}</span>
            <div className="powerups">
              {POWERUPS.map((powerup) => {
                const usesLeft = powerups[powerup.id] ?? 0;
                const disabled =
                  isComplete ||
                  isFailed ||
                  (!isExploreMode && !isTimedMode && usesLeft <= 0);
                return (
                  <button
                    key={powerup.id}
                    type="button"
                    className="powerup-button"
                    onClick={() => handlePowerupUse(powerup.id)}
                    disabled={disabled}
                  >
                    <span>{powerup.label}</span>
                    <span className="badge">{isExploreMode ? "∞" : usesLeft}</span>
                  </button>
                );
              })}
            </div>
            <span className="muted">5s</span>
          </div>

          <div className="panel-card">
            <span className="label">{t("stats")}</span>
            <div className="stats-grid">
              <div className="stat-row">
                <span className="label">{t("attempts")}</span>
                <span className="value">{attempts}</span>
              </div>
              <div className="stat-row">
                <span className="label">{t("bestTime")}</span>
                <span className="value">
                  {currentStats.bestTime ? formatTime(currentStats.bestTime) : "—"}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">{t("bestAttempts")}</span>
                <span className={`value ${isPerfectRecord ? "is-perfect" : ""}`}>
                  {currentStats.bestAttempts ?? "—"}
                </span>
              </div>
            </div>
            {isPerfectRecord ? (
              <span className="badge success">{t("perfect")}</span>
            ) : null}
            <span className="label">{t("path")}</span>
            <ul className="path-list">
              {guessHistory.map((entry, index) => (
                <li key={`${entry.id}-${index}`} className="guess-item">
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card">
            <span className="label">{t("ranking")}</span>
            <div className="scope-buttons">
              <button
                type="button"
                className={`scope-button ${rankingScope === "global" ? "active" : ""}`}
                onClick={() => setRankingScope("global")}
              >
                {t("global")}
              </button>
              <button
                type="button"
                className={`scope-button ${rankingScope === "province" ? "active" : ""}`}
                onClick={() => setRankingScope("province")}
                disabled={!startRegion}
              >
                {t("province")}
              </button>
              <button
                type="button"
                className={`scope-button ${rankingScope === "group" ? "active" : ""}`}
                onClick={() => setRankingScope("group")}
              >
                {t("group")}
              </button>
            </div>
            {rankingScope === "province" ? (
              <span className="muted">
                {t("province")}: {startRegion?.label || "—"}
              </span>
            ) : null}
            {rankingScope === "group" ? (
              <div className="group-controls">
                <input
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder={t("groupName")}
                />
                <div className="group-row">
                  <input
                    type="text"
                    value={groupCode}
                    onChange={(event) =>
                      setGroupCode(sanitizeGroupCode(event.target.value))
                    }
                    placeholder={t("groupCode")}
                  />
                  <button type="button" className="submit" onClick={handleCreateGroup}>
                    {t("createGroup")}
                  </button>
                  <button type="button" className="submit" onClick={handleJoinGroup}>
                    {t("joinGroup")}
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleGroupCopy}
                  disabled={groupCodeClean.length !== 5}
                >
                  {groupCopyStatus === "copied" ? t("copied") : t("copy")}
                </button>
              </div>
            ) : null}
            {rankingScope === "group" && groupCodeClean.length !== 5 ? (
              <span className="muted">{t("groupCode")}</span>
            ) : null}
            <div className="stats-grid">
              <div className="stat-row">
                <span className="label">{t("topTime")}</span>
                <span className="value">
                  {rankings?.time ? `Top ${rankings.time.topPercent}%` : "—"}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">{t("topAttempts")}</span>
                <span className="value">
                  {rankings?.attempts ? `Top ${rankings.attempts.topPercent}%` : "—"}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">{t("topRoute")}</span>
                <span className="value">
                  {rankings?.distance ? `Top ${rankings.distance.topPercent}%` : "—"}
                </span>
              </div>
            </div>
            <div className="ranking-lists">
              <div>
                <span className="label">{t("bestTimes")}</span>
                <ol className="ranking-list">
                  {leaderboardByTime.map((entry) => (
                    <li key={entry.id}>{formatTime(entry.timeMs)}</li>
                  ))}
                </ol>
              </div>
              <div>
                <span className="label">{t("shortestRoute")}</span>
                <ol className="ranking-list">
                  {leaderboardByDistance.map((entry) => (
                    <li key={entry.id}>+{entry.distance}</li>
                  ))}
                </ol>
              </div>
              <div>
                <span className="label">{t("fewestAttempts")}</span>
                <ol className="ranking-list">
                  {leaderboardByAttempts.map((entry) => (
                    <li key={entry.id}>{entry.attempts}</li>
                  ))}
                </ol>
              </div>
            </div>
            {leaderboardStatus === "loading" ? (
              <span className="muted">{t("loadingRanking")}</span>
            ) : null}
          </div>

          {!hasAllAchievements ? (
            <div className="panel-card">
              <span className="label">{t("achievements")}</span>
              {claimableAchievements.length ? (
                <div className="achievements">
                  {claimableAchievements.map((achievement) => (
                    <div key={achievement.id} className="achievement-row">
                      <span>{achievement.label}</span>
                      <button
                        type="button"
                        className="submit"
                        onClick={() => handleClaimAchievement(achievement.id)}
                      >
                        {t("collect")} +{achievement.rewardCoins || 0}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="muted">{t("noRewards")}</span>
              )}
            </div>
          ) : null}

          <div className="panel-card">
            <span className="label">{t("config")}</span>
            <span className="label">{t("theme")}</span>
            <div className="theme-grid">
              {THEMES.map((theme) => {
                const isOwned = themesOwned.has(theme.id);
                const cost = THEME_COSTS[theme.id] || 0;
                const disabled = !isOwned && coins < cost;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-button ${activeTheme === theme.id ? "active" : ""} ${
                      !isOwned ? "locked" : ""
                    }`}
                    onClick={() => {
                      if (isOwned) {
                        handleThemeSelect(theme.id);
                      } else {
                        handleThemePurchase(theme.id);
                      }
                    }}
                    disabled={disabled}
                  >
                    <span>{theme.label}</span>
                    {!isOwned && cost ? (
                      <span className="lock">{t("buyFor", { value: cost })}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <span className="label">{t("music")}</span>
            <div className="toggle-row">
              <input
                id="music-toggle"
                type="checkbox"
                checked={musicEnabled}
                onChange={(event) => setMusicEnabled(event.target.checked)}
              />
              <label htmlFor="music-toggle">{musicEnabled ? t("on") : t("off")}</label>
            </div>
            <select
              className="level-select"
              value={musicTrack}
              onChange={(event) => setMusicTrack(event.target.value)}
            >
              {MUSIC_TRACKS.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
            {activeTrack?.lyrics ? <p className="muted">{activeTrack.lyrics}</p> : null}
            <div className="range-row">
              <span className="label">{t("volume")}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVolume}
                onChange={(event) => setMusicVolume(Number(event.target.value))}
              />
            </div>

            <span className="label">{t("sounds")}</span>
            <div className="toggle-row">
              <input
                id="sfx-toggle"
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
              <label htmlFor="sfx-toggle">{soundEnabled ? t("on") : t("off")}</label>
            </div>
            <div className="range-row">
              <span className="label">{t("volume")}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={sfxVolume}
                onChange={(event) => setSfxVolume(Number(event.target.value))}
              />
            </div>

            <span className="label">{t("language")}</span>
            <select
              className="level-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </aside>
      </section>

      {showModal && resultData ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{isFailed ? t("timeOut") : t("congrats")}</h2>
            <p className="modal-subtitle">
              {t("attempts")}: {resultData.attempts}
            </p>
            <p className="modal-subtitle">
              {t("time")}: {formatTime(resultData.timeMs)}
            </p>
            <p className="modal-subtitle">
              {t("coins")}: +{resultData.coinsEarned || 0}
            </p>
            <div className="modal-section">
              <span className="label">{t("yourPath")}</span>
              <ul className="path-list">
                {resultData.playerPath.map((entry, index) => (
                  <li key={`player-${entry.id}-${index}`} className="guess-item">
                    {entry.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-section">
              <span className="label">{t("correctPath")}</span>
              <p className="modal-subtitle">
                {t("shortestCount", { value: resultData.shortestCount })}
              </p>
              <ol className="shortest-list">
                {resultData.shortestPath.map((name, index) => (
                  <li key={`short-${name}-${index}`}>{name}</li>
                ))}
              </ol>
            </div>
            <div className="modal-actions">
              <button className="reset" type="button" onClick={handleStartNext}>
                {t("newGame")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showAllAchievementsModal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{t("achievementsAllTitle")}</h2>
            <p className="modal-subtitle">{t("achievementsAllBody")}</p>
            <div className="modal-actions">
              <button
                className="submit"
                type="button"
                onClick={() => setShowAllAchievementsModal(false)}
              >
                {t("ok")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
