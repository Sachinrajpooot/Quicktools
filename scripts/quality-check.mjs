import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(root);
const htmlFiles = files.filter(file => file.endsWith(".html"));
const rel = file => path.relative(root, file).split(path.sep).join("/");

function checkJs(source, label) {
  const tmp = path.join(os.tmpdir(), "q24-check-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".js");
  try {
    fs.writeFileSync(tmp, source);
    const result = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
    if (result.status !== 0) errors.push("JavaScript syntax error in " + label + ":\n" + (result.stderr || result.stdout));
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

checkJs(fs.readFileSync(path.join(root, "worker/index.js"), "utf8"), "worker/index.js");

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push("Duplicate id #" + id + " in " + rel(file));
    seen.add(id);
  }

  const scripts = html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi);
  let scriptIndex = 0;
  for (const match of scripts) {
    const attrs = match[1];
    if (/\\bsrc\\s*=/.test(attrs)) continue;
    const type = (attrs.match(/\\btype=["']([^"']+)["']/i) || [])[1] || "text/javascript";
    if (!/(javascript|module|ecmascript)/i.test(type)) continue;
    checkJs(match[2], rel(file) + " inline script " + (++scriptIndex));
  }
}

const byRel = new Map(files.map(file => [rel(file), file]));
function resolveLocalPath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (!decoded || decoded === "/") decoded = "/index.html";
  if (decoded.endsWith("/")) decoded += "index.html";
  const normalized = path.posix.normalize(decoded.replace(/^\\/+/, ""));
  if (normalized.startsWith("../")) return null;
  return byRel.get(normalized) || null;
}
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const attrs = html.matchAll(/\\b(?:href|src)=["']([^"'<>]+)["']/gi);
  for (const match of attrs) {
    const value = match[1].replace(/&amp;/g, "&").trim();
    if (!value || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(value)) {
      if (value.startsWith("#")) {
        const id = value.slice(1);
        if (id && !new RegExp('\\\\bid=["\\\\']' + id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + '["\\\\']').test(fs.readFileSync(file, "utf8"))) {
          errors.push("Missing in-page anchor " + value + " in " + rel(file));
        }
      }
      continue;
    }
    let parsed;
    try { parsed = new URL(value, "https://quicktools24.local"); } catch { continue; }
    if (parsed.origin !== "https://quicktools24.local") continue;
    const target = resolveLocalPath(parsed.pathname);
    if (!target) {
      errors.push("Broken local link or asset " + value + " in " + rel(file));
      continue;
    }
    if (parsed.hash) {
      let id;
      try { id = decodeURIComponent(parsed.hash.slice(1)); } catch { id = parsed.hash.slice(1); }
      const targetHtml = target.endsWith(".html") ? fs.readFileSync(target, "utf8") : "";
      if (id && targetHtml && !new RegExp('\\\\bid=["\\\\']' + id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + '["\\\\']').test(targetHtml)) {
        errors.push("Missing anchor " + parsed.hash + " at " + value + " in " + rel(file));
      }
    }
  }
}

try { JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8")); }
catch { errors.push("manifest.webmanifest is not valid JSON"); }

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
if (!sitemap.includes("<urlset") || !sitemap.includes("</urlset>")) errors.push("sitemap.xml is missing its urlset root");
for (const match of sitemap.matchAll(/<loc>(https:\/\/quicktools24\\.in[^<]*)<\\/loc>/g)) {
  const url = new URL(match[1]);
  if (!resolveLocalPath(url.pathname)) errors.push("Sitemap URL has no matching file: " + match[1]);
}

if (errors.length) {
  console.error("QuickTools24 quality checks failed (" + errors.length + "):");
  for (const error of errors) console.error("\\n- " + error);
  process.exit(1);
}
console.log("QuickTools24 quality checks passed: Worker and inline JavaScript syntax, duplicate HTML IDs, local links/assets, sitemap paths, and web manifest JSON.");
