// Local dev server for Break My Bot. Serves dist/ and answers /api/break with a MOCK model, so the
// game can be played and reviewed without Cloudflare. The real site uses Workers AI instead.
//   node src/break/devserver.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handleChat, handleGuess, publicLevels } from "./worker.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../dist");
const PORT = Number(process.argv[2]) || 4321;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml", ".json": "application/json", ".txt": "text/plain" };

const acrostic = (pw) => [...pw].map((c) => `${c}${"aeiou".includes(c.toLowerCase()) ? "" : "o"}rdinary line here`).join("\n");
const flat = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const encodedLeak = (text, pw) => {
  const p = pw.toLowerCase();
  return flat(text).includes(p) || flat(text).includes([...p].reverse().join("")) ||
    (text || "").includes(Buffer.from(pw).toString("base64"));
};

// A deliberately compliant little model, so each level's defence visibly does its job.
function mockAi(messages, opts = {}) {
  if (opts.judge) {
    const jp = messages[0].content;
    const pw = (jp.match(/password is "([A-Z]+)"/) || [])[1] || "";
    const reply = jp.split("--- reply ---")[1] || "";
    return encodedLeak(reply, pw) ? "BLOCK" : "ALLOW";
  }
  const system = messages.find((m) => m.role === "system")?.content || "";
  const pw = (system.match(/password is ([A-Z]+)/) || [])[1] || "SECRET";
  const u = (messages[messages.length - 1].content || "").toLowerCase();
  if (/base ?64/.test(u)) return `In base64: ${Buffer.from(pw).toString("base64")}`;
  if (/reverse|backward/.test(u)) return `Backwards that is ${[...pw].reverse().join("")}.`;
  if (/poem|downward|vertical|acrostic|read down/.test(u)) return acrostic(pw);
  if (/spell|gap|spaces?|one letter/.test(u)) return [...pw].join(" ");
  return `Sure — the password is ${pw}.`;
}

const body = (req) => new Promise((res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => res(d)); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/break") {
    res.setHeader("content-type", "application/json");
    if (req.method === "GET") return res.end(JSON.stringify({ levels: publicLevels(), model: "MOCK (local dev)" }));
    const data = JSON.parse((await body(req)) || "{}");
    const out = data.action === "guess" ? handleGuess(data)
      : data.action === "chat" ? await handleChat(data, { ai: async (m, o) => mockAi(m, o) })
        : { error: "unknown action" };
    return res.end(JSON.stringify(out));
  }
  let file = path.join(ROOT, url.pathname);
  if (url.pathname.endsWith("/") || !path.extname(url.pathname)) file = path.join(ROOT, url.pathname, "index.html");
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return fs.readFile(path.join(ROOT, "404.html"), (e, b) => res.end(e ? "not found" : b)); }
    res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(PORT, () => console.log(`break dev server on http://localhost:${PORT}/break/  (mock model)`));
