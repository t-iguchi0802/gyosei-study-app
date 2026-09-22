"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const ROOT = __dirname;
const STORAGE_DIR = path.join(ROOT, "storage");
const STORAGE_FILE = path.join(STORAGE_DIR, "profiles.json");
const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY = 2 * 1024 * 1024;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

fs.mkdirSync(STORAGE_DIR, { recursive: true });

function readProfiles() {
  try {
    return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  } catch (_) {
    return {};
  }
}

function writeProfiles(profiles) {
  const temporary = `${STORAGE_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(profiles, null, 2), "utf8");
  fs.renameSync(temporary, STORAGE_FILE);
}

function normalizeCode(value) {
  const raw = String(value || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 12);
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}

function validCode(value) {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(value);
}

function createCode(profiles) {
  for (let attempt = 0; attempt < 100; attempt++) {
    let raw = "";
    while (raw.length < 12) raw += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
    const code = normalizeCode(raw);
    if (!profiles[code]) return code;
  }
  throw new Error("Could not allocate sync code");
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || filePath.startsWith(`${STORAGE_DIR}${path.sep}`)) {
    json(res, 403, { error: "Forbidden" });
    return;
  }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      json(res, 404, { error: "Not found" });
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": path.basename(filePath) === "data.js" ? "public, max-age=3600" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/api/health" && req.method === "GET") {
      json(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/sync/create" && req.method === "POST") {
      const profiles = readProfiles();
      const code = createCode(profiles);
      profiles[code] = { revision: 0, updatedAt: Date.now(), data: null };
      writeProfiles(profiles);
      json(res, 201, { code, revision: 0 });
      return;
    }

    const syncMatch = pathname.match(/^\/api\/sync\/([^/]+)$/);
    if (syncMatch) {
      const code = normalizeCode(decodeURIComponent(syncMatch[1]));
      if (!validCode(code)) {
        json(res, 400, { error: "Invalid sync code" });
        return;
      }
      const profiles = readProfiles();
      const profile = profiles[code];
      if (!profile) {
        json(res, 404, { error: "Sync code not found" });
        return;
      }

      if (req.method === "GET") {
        json(res, 200, profile);
        return;
      }

      if (req.method === "PUT") {
        const payload = await readJson(req);
        if (!payload.data || payload.data.version !== 1 || !payload.data.rounds) {
          json(res, 400, { error: "Invalid learning data" });
          return;
        }
        if (Number(payload.baseRevision) !== Number(profile.revision)) {
          json(res, 409, profile);
          return;
        }
        profile.data = payload.data;
        profile.revision += 1;
        profile.updatedAt = Date.now();
        writeProfiles(profiles);
        json(res, 200, { revision: profile.revision, updatedAt: profile.updatedAt });
        return;
      }
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    json(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`PC:     http://127.0.0.1:${PORT}/`);
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(`http://${entry.address}:${PORT}/`);
    }
  }
  for (const address of addresses) console.log(`スマホ: ${address}`);
  console.log("PCとスマホを同じWi-Fiへ接続し、スマホ用URLを開いてください。");
});
