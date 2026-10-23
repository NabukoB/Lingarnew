// First-load JavaScript per route, gzipped, from the production build (.next).
// Fails when a route goes over its budget. Run after `next build`:
//
//   node scripts/bundle-budget.mjs            # table + exit 1 on a breach
//   PERF_REPORT=dir node scripts/bundle-budget.mjs   # also writes bundles.json / bundles.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// KB gzipped. The captive portal loads on customers' phones over mobile data, so it gets the tightest budget.
const budgets = [
  { match: /^\/portal/, kb: 190 },
  { match: /^\/\(auth\)/, kb: 190 },
  { match: /^\/admin/, kb: 260 },
  { match: /./, kb: 280 },
];

const next = join(process.cwd(), ".next");
if (!existsSync(join(next, "app-build-manifest.json"))) {
  console.error("No production build found. Run `npx next build` first.");
  process.exit(2);
}
const app = JSON.parse(readFileSync(join(next, "app-build-manifest.json"), "utf8")).pages;
const build = JSON.parse(readFileSync(join(next, "build-manifest.json"), "utf8"));
const shared = [...(build.rootMainFiles ?? []), ...(build.polyfillFiles ?? [])].filter((f) => !/polyfill/.test(f));

const sizes = new Map();
const gz = (file) => {
  if (!sizes.has(file)) sizes.set(file, gzipSync(readFileSync(join(next, file)), { level: 9 }).length);
  return sizes.get(file);
};

const rows = [];
for (const key of Object.keys(app).filter((k) => k.endsWith("/page"))) {
  // A route loads its page plus every layout and template above it.
  const parts = key.split("/").slice(1, -1);
  const segments = ["/layout", "/template"];
  for (let i = 1; i <= parts.length; i++) {
    const base = "/" + parts.slice(0, i).join("/");
    segments.push(base + "/layout", base + "/template");
  }
  const files = new Set(shared);
  for (const s of [...segments, key]) for (const f of app[s] ?? []) if (f.endsWith(".js")) files.add(f);
  const kb = [...files].reduce((n, f) => n + gz(f), 0) / 1024;
  const route = key.replace(/\/page$/, "") || "/";
  const budget = budgets.find((b) => b.match.test(route)).kb;
  rows.push({ route, kb: Math.round(kb * 10) / 10, budget, files: files.size, pass: kb <= budget });
}
rows.sort((a, b) => b.kb - a.kb);

const md = [
  "| Route | First-load JS (KB gz) | Files | Budget | Result |",
  "|---|--:|--:|--:|---|",
  ...rows.map((r) => `| ${r.route} | ${r.kb} | ${r.files} | ${r.budget} | ${r.pass ? "pass" : "**FAIL**"} |`),
].join("\n");
console.log(md);
if (process.env.PERF_REPORT) {
  mkdirSync(process.env.PERF_REPORT, { recursive: true });
  writeFileSync(join(process.env.PERF_REPORT, "bundles.json"), JSON.stringify(rows, null, 2));
  writeFileSync(join(process.env.PERF_REPORT, "bundles.md"), "## JavaScript bundles\n\n" + md + "\n");
}
const over = rows.filter((r) => !r.pass);
if (over.length) {
  console.error(`\n${over.length} route(s) over budget: ${over.map((r) => r.route).join(", ")}`);
  process.exit(1);
}
