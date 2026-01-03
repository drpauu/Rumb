import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "leaderboard.json");

function readEntries() {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  fs.writeFileSync(dataPath, JSON.stringify(entries, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== "/leaderboard") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, readEntries());
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const entry = JSON.parse(body);
        if (!entry || typeof entry !== "object") {
          sendJson(res, 400, { error: "Invalid payload" });
          return;
        }
        const entries = readEntries();
        entries.push({
          ...entry,
          createdAt: entry.createdAt || new Date().toISOString()
        });
        writeEntries(entries.slice(-500));
        sendJson(res, 201, { ok: true });
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(5174, () => {
  console.log("Leaderboard server: http://localhost:5174/leaderboard");
});
