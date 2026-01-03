import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const inputPath = path.join(rootDir, "data", "comarques_icgc.geojson");
const fallbackDir = path.join(rootDir, "comarques_repo_git");
const tmpPath = path.join(rootDir, "data", ".tmp-comarques.geojson");
const outputPath = path.join(rootDir, "public", "catalunya-comarques.topojson");

const nameFieldEnv = process.env.NAME_FIELD;
const candidateFields = [
  nameFieldEnv,
  "nom_comar",
  "nom_comarca",
  "NOM_COMAR",
  "NOM_COM",
  "name",
  "NAME",
  "comarca",
  "COMARCA"
].filter(Boolean);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findNameField(properties) {
  for (const key of candidateFields) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) {
      return key;
    }
  }
  return null;
}

function loadGeoJSON(pathToFile) {
  const raw = JSON.parse(fs.readFileSync(pathToFile, "utf8"));
  if (!raw.features || !raw.features.length) {
    throw new Error(`El GeoJSON no te cap feature: ${pathToFile}`);
  }
  return raw;
}

let raw;

if (fs.existsSync(inputPath)) {
  raw = loadGeoJSON(inputPath);
} else if (fs.existsSync(fallbackDir)) {
  const entries = fs
    .readdirSync(fallbackDir)
    .filter((file) => file.endsWith(".geojson"))
    .filter((file) => file.startsWith("comarques-"))
    .filter((file) => !file.includes("compressed"));

  if (!entries.length) {
    console.error(
      `No hi ha fitxers GeoJSON a ${fallbackDir}. Afegeix comarques_icgc.geojson o els fitxers comarques-*.geojson.`
    );
    process.exit(1);
  }

  const features = entries.flatMap((file) => {
    const data = loadGeoJSON(path.join(fallbackDir, file));
    return data.features || [];
  });

  raw = { type: "FeatureCollection", features };
  console.warn(
    "No s'ha trobat data/comarques_icgc.geojson. Es combinen els fitxers de comarques_repo_git."
  );
} else {
  console.error(
    `No s'ha trobat el fitxer: ${inputPath} ni la carpeta ${fallbackDir}.`
  );
  process.exit(1);
}

const firstProps = raw.features[0].properties || {};
const nameField = findNameField(firstProps);
if (!nameField) {
  console.error(
    "No s'ha detectat el camp de nom. Defineix NAME_FIELD o revisa les propietats."
  );
  process.exit(1);
}

function collectParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return [geometry.coordinates];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }
  return [];
}

const groupedByName = new Map();
raw.features.forEach((feature) => {
  const name = feature.properties?.[nameField];
  if (!name || !feature.geometry) return;
  const normalized = normalizeName(String(name));
  if (!groupedByName.has(normalized)) {
    groupedByName.set(normalized, {
      name: String(name),
      parts: [],
      hadMulti: false
    });
  }
  const group = groupedByName.get(normalized);
  const parts = collectParts(feature.geometry);
  group.parts.push(...parts);
  if (feature.geometry.type === "MultiPolygon") {
    group.hadMulti = true;
  }
});

const normalized = {
  type: "FeatureCollection",
  features: [...groupedByName.values()].map((group) => {
    const displayName = group.name;
    const geometry =
      group.parts.length === 1 && !group.hadMulti
        ? { type: "Polygon", coordinates: group.parts[0] }
        : { type: "MultiPolygon", coordinates: group.parts };
    return {
      type: "Feature",
      properties: {
        id: slugify(displayName),
        name: displayName
      },
      geometry
    };
  })
};

fs.writeFileSync(tmpPath, JSON.stringify(normalized));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const mapshaperBin = path.join(rootDir, "node_modules", ".bin", "mapshaper");
const args = [
  tmpPath,
  "-simplify",
  "10%",
  "keep-shapes",
  "-clean",
  "-o",
  `format=topojson`,
  outputPath
];

const child = spawn(mapshaperBin, args, { stdio: "inherit" });
child.on("close", (code) => {
  fs.unlinkSync(tmpPath);
  if (code !== 0) {
    process.exit(code);
  }
  console.log(`TopoJSON generat a ${outputPath}`);
});
