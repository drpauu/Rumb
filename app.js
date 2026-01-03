const state = {
  comarques: [],
  neighbors: [],
  adjacency: new Map(),
  nameMap: new Map(),
  normalizedMap: new Map(),
  comarcaNames: [],
  nameIndex: [],
  current: null,
  target: null,
  path: [],
  attempts: []
};

const ui = {
  start: document.getElementById("start-name"),
  target: document.getElementById("target-name"),
  steps: document.getElementById("step-count"),
  feedback: document.getElementById("feedback"),
  form: document.getElementById("guess-form"),
  input: document.getElementById("guess-input"),
  suggestions: document.getElementById("suggestions"),
  reset: document.getElementById("reset"),
  list: document.getElementById("path-list"),
  datalist: document.getElementById("comarques-list")
};

const svg = d3.select("#map");
const defs = svg.append("defs");
const seaGradient = defs.append("linearGradient").attr("id", "seaGradient");
seaGradient.attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
seaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#2b2b2b");
seaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#1f1f1f");

const gSea = svg.append("g").attr("class", "layer sea-layer");
const gNeighbors = svg.append("g").attr("class", "layer neighbors-layer");
const gComarques = svg.append("g").attr("class", "layer comarques-layer");
const gLabels = svg.append("g").attr("class", "layer labels-layer");

const projection = d3.geoMercator();
const pathGenerator = d3.geoPath(projection);

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function buildAdjacency(features) {
  const adjacency = new Map();
  for (const feature of features) {
    adjacency.set(feature.properties.nom_comar, new Set());
  }

  for (let i = 0; i < features.length; i += 1) {
    for (let j = i + 1; j < features.length; j += 1) {
      const a = features[i];
      const b = features[j];
      const touching =
        turf.booleanTouches(a, b) || turf.booleanOverlap(a, b) || turf.booleanIntersects(a, b);
      if (touching) {
        adjacency.get(a.properties.nom_comar).add(b.properties.nom_comar);
        adjacency.get(b.properties.nom_comar).add(a.properties.nom_comar);
      }
    }
  }
  return adjacency;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findMatches(normalizedQuery) {
  if (!normalizedQuery) return [];
  return state.nameIndex
    .filter((entry) => entry.normalized.includes(normalizedQuery))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const diff =
        normalizeName(a).indexOf(normalizedQuery) - normalizeName(b).indexOf(normalizedQuery);
      return diff !== 0 ? diff : a.localeCompare(b, "ca");
    });
}

function updateSuggestions(value) {
  const query = normalizeName(value);
  const matches = findMatches(query).slice(0, 8);
  if (!query) {
    ui.suggestions.classList.remove("is-open");
    ui.suggestions.innerHTML = "";
    return;
  }

  if (!matches.length) {
    ui.suggestions.innerHTML = "<div class=\"suggestion empty\">Cap coincidència</div>";
    ui.suggestions.classList.add("is-open");
    return;
  }

  ui.suggestions.innerHTML = matches
    .map((name) => `<button type=\"button\" class=\"suggestion\" data-name=\"${name}\">${name}</button>`)
    .join("");
  ui.suggestions.classList.add("is-open");
}

function setFeedback(message, tone = "neutral") {
  ui.feedback.textContent = message;
  ui.feedback.style.color =
    tone === "good" ? "#2f8f4d" : tone === "bad" ? "#c8523e" : "inherit";
}

function updateStats() {
  ui.start.textContent = state.current || "—";
  ui.target.textContent = state.target || "—";
  ui.steps.textContent = Math.max(state.path.length - 1, 0).toString();
}

function updatePathList() {
  ui.list.innerHTML = "";
  state.path.forEach((name, index) => {
    const item = document.createElement("li");
    item.textContent = index === 0 ? `${name} (inici)` : name;
    ui.list.appendChild(item);
  });
}

function resetClasses() {
  gComarques
    .selectAll("path")
    .classed("is-start", false)
    .classed("is-target", false)
    .classed("is-correct", false)
    .classed("is-wrong", false);
}

function markComarca(name, className) {
  const id = `comarca-${slugify(name)}`;
  const node = document.getElementById(id);
  if (node) {
    node.classList.add(className);
  }
}

function startGame() {
  const names = state.comarques.map((c) => c.properties.nom_comar);
  let start = pickRandom(names);
  let target = pickRandom(names);
  while (target === start) {
    target = pickRandom(names);
  }

  state.current = start;
  state.target = target;
  state.path = [start];
  state.attempts = [];

  resetClasses();
  markComarca(start, "is-start");
  markComarca(target, "is-target");

  setFeedback("Partida nova. Escriu una comarca veïna.");
  updateStats();
  updatePathList();
  ui.input.value = "";
}

function handleGuess(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    setFeedback("Escriu una comarca.", "bad");
    return;
  }

  let actualName = state.normalizedMap.get(normalized);
  if (!actualName) {
    const matches = findMatches(normalized);
    if (matches.length === 1) {
      actualName = matches[0];
    } else {
      setFeedback("Tria una comarca de la llista.", "bad");
      return;
    }
  }

  if (state.path.includes(actualName)) {
    setFeedback("Ja has usat aquesta comarca.", "bad");
    return;
  }

  const neighbors = state.adjacency.get(state.current) || new Set();
  if (!neighbors.has(actualName)) {
    setFeedback(`${actualName} no toca frontera amb ${state.current}.`, "bad");
    markComarca(actualName, "is-wrong");
    return;
  }

  state.current = actualName;
  state.path.push(actualName);
  markComarca(actualName, "is-correct");

  if (actualName === state.target) {
    setFeedback("Fantàstic! Has arribat al destí.", "good");
  } else {
    setFeedback("Correcte! Continua el camí.", "good");
  }

  updateStats();
  updatePathList();
}

function renderMap() {
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const fitCollection = {
    type: "FeatureCollection",
    features: [...state.neighbors, ...state.comarques]
  };

  projection.fitSize([width, height], fitCollection);
  pathGenerator.projection(projection);

  const seaFeatures = state.neighbors.filter((f) => f.properties.kind === "sea");
  const neighborFeatures = state.neighbors.filter((f) => f.properties.kind === "neighbor");

  gSea
    .selectAll("path")
    .data(seaFeatures)
    .join("path")
    .attr("class", "sea")
    .attr("d", pathGenerator);

  gNeighbors
    .selectAll("path")
    .data(neighborFeatures)
    .join("path")
    .attr("class", "neighbor")
    .attr("d", pathGenerator);

  gComarques
    .selectAll("path")
    .data(state.comarques)
    .join("path")
    .attr("class", "comarca")
    .attr("id", (d) => `comarca-${slugify(d.properties.nom_comar)}`)
    .attr("d", pathGenerator);

  gLabels
    .selectAll("text")
    .data(neighborFeatures)
    .join("text")
    .attr("class", "label")
    .attr("x", (d) => pathGenerator.centroid(d)[0])
    .attr("y", (d) => pathGenerator.centroid(d)[1])
    .text((d) => d.properties.name);

  resetClasses();
  if (state.current) {
    markComarca(state.path[0], "is-start");
    markComarca(state.target, "is-target");
    state.path.slice(1).forEach((name) => markComarca(name, "is-correct"));
  }
}

async function loadData() {
  const [comarques, neighbors] = await Promise.all([
    fetch("data/comarques.geojson").then((res) => res.json()),
    fetch("data/neighbors.geojson").then((res) => res.json())
  ]);

  state.comarques = comarques.features;
  state.neighbors = neighbors.features;
  state.adjacency = buildAdjacency(state.comarques);
  state.comarcaNames = state.comarques.map((feature) => feature.properties.nom_comar);

  state.comarques.forEach((feature) => {
    const name = feature.properties.nom_comar;
    state.nameMap.set(name, feature);
    state.normalizedMap.set(normalizeName(name), name);
  });
  state.nameIndex = state.comarcaNames.map((name) => ({
    name,
    normalized: normalizeName(name)
  }));

  ui.datalist.innerHTML = state.comarques
    .map((feature) => `<option value="${feature.properties.nom_comar}"></option>`)
    .join("");

  renderMap();
  startGame();
  updateSuggestions(ui.input.value);
}

ui.form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleGuess(ui.input.value);
  ui.input.value = "";
  ui.suggestions.classList.remove("is-open");
  ui.input.focus();
});

ui.input.addEventListener("input", (event) => {
  updateSuggestions(event.target.value);
});

ui.input.addEventListener("focus", (event) => {
  updateSuggestions(event.target.value);
});

ui.input.addEventListener("blur", () => {
  setTimeout(() => ui.suggestions.classList.remove("is-open"), 150);
});

ui.suggestions.addEventListener("click", (event) => {
  const button = event.target.closest(".suggestion");
  if (!button || button.classList.contains("empty")) return;
  const name = button.dataset.name;
  ui.input.value = name;
  ui.suggestions.classList.remove("is-open");
  handleGuess(name);
  ui.input.value = "";
  ui.input.focus();
});

ui.reset.addEventListener("click", () => {
  startGame();
});

window.addEventListener("resize", () => {
  renderMap();
});

loadData().catch((error) => {
  setFeedback("No s'han pogut carregar les dades.", "bad");
  console.error(error);
});
