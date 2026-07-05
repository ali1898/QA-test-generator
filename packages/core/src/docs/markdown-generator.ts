/**
 * Generates documentation (Markdown) from a Cypress project on disk.
 *
 * Walks the project tree, counts specs/features/pages, and emits a single
 * Markdown document suitable for Confluence (wiki format) or file export.
 *
 * Phase 1 produces a structural overview. Phase 2 will enrich it with an
 * LLM-generated narrative and per-test descriptions.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

export interface ProjectAnalysis {
  projectRoot: string;
  projectName: string;
  language: "typescript" | "javascript" | "mixed";
  bdd: boolean;
  allure: boolean;
  baseUrl?: string;
  specCount: number;
  featureCount: number;
  pageObjectCount: number;
  locatorCount: number;
  helperCount: number;
  /** Relative paths of discovered test files. */
  specs: string[];
  features: string[];
  pages: string[];
  /** Outline of each feature: title + scenario count. */
  featureOutlines: FeatureOutline[];
}

export interface FeatureOutline {
  path: string;
  name: string;
  scenarioCount: number;
  scenarios: string[];
}

export interface DocsOptions {
  /** Project root to document. Defaults to cwd. */
  projectRoot?: string;
  /** Override detected project name. */
  projectName?: string;
}

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "cypress",
  "videos",
  "screenshots",
  "reports",
  "allure-report",
  "allure-results",
]);

/** Recursively list files under `dir`, skipping ignored directories. */
function listFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) {
        listFiles(full, acc);
      }
    } else if (stats.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/** Extract scenario names from a Gherkin feature file. */
function parseFeature(filePath: string, content: string): FeatureOutline {
  const scenarios: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*(?:Scenario|Scenario Outline):\s*(.+)$/);
    if (m) scenarios.push(m[1].trim());
  }
  // Feature name = first "Feature:" line, fallback to filename.
  const featureLine = content.match(/^\s*Feature:\s*(.+)$/m);
  const name = featureLine ? featureLine[1].trim() : basename(filePath, ".feature");
  return { path: filePath, name, scenarioCount: scenarios.length, scenarios };
}

/** Detect whether the project uses TypeScript or JavaScript. */
function detectLanguage(files: string[]): "typescript" | "javascript" | "mixed" {
  const hasTs = files.some((f) => extname(f) === ".ts");
  const hasJs = files.some((f) => extname(f) === ".js");
  if (hasTs && hasJs) return "mixed";
  if (hasTs) return "typescript";
  return "javascript";
}

/** Analyze a Cypress project on disk. */
export function analyzeProject(options: DocsOptions = {}): ProjectAnalysis {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const projectName =
    options.projectName ?? readPackageName(projectRoot) ?? basename(projectRoot);

  const allFiles = listFiles(projectRoot);
  const rel = (f: string) => relative(projectRoot, f).replace(/\\/g, "/");

  const specs = allFiles.filter((f) => /\.spec\.(ts|js)$/.test(f)).map(rel);
  const features = allFiles.filter((f) => f.endsWith(".feature")).map(rel);
  const pages = allFiles
    .filter((f) => /support[\\/](?:pages|page-objects)[\\/].*\.(ts|js)$/.test(f))
    .map(rel);
  const locators = allFiles
    .filter((f) => /support[\\/]locators[\\/].*\.(ts|js)$/.test(f))
    .map(rel);
  const helpers = allFiles
    .filter((f) => /support[\\/]helpers[\\/].*\.(ts|js)$/.test(f))
    .map(rel);

  const featureOutlines = features.map((relPath) => {
    const abs = join(projectRoot, relPath);
    const content = existsSync(abs) ? readFileSync(abs, "utf-8") : "";
    const outline = parseFeature(abs, content);
    return { ...outline, path: relPath };
  });

  return {
    projectRoot,
    projectName,
    language: detectLanguage(allFiles),
    bdd: features.length > 0,
    allure: fileMentions(projectRoot, "cypress.config", "allure"),
    baseUrl: readBaseUrl(projectRoot),
    specCount: specs.length,
    featureCount: features.length,
    pageObjectCount: pages.length,
    locatorCount: locators.length,
    helperCount: helpers.length,
    specs,
    features,
    pages,
    featureOutlines,
  };
}

function readPackageName(projectRoot: string): string | undefined {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return undefined;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8")).name;
  } catch {
    return undefined;
  }
}

function readBaseUrl(projectRoot: string): string | undefined {
  const candidates = ["cypress.config.ts", "cypress.config.js"];
  for (const c of candidates) {
    const path = join(projectRoot, c);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf-8");
    const m = content.match(/baseUrl:\s*["']([^"']+)["']/);
    if (m) return m[1];
  }
  return undefined;
}

function fileMentions(projectRoot: string, fileNamePrefix: string, needle: string): boolean {
  for (const c of [`${fileNamePrefix}.ts`, `${fileNamePrefix}.js`]) {
    const path = join(projectRoot, c);
    if (existsSync(path) && readFileSync(path, "utf-8").includes(needle)) {
      return true;
    }
  }
  return false;
}

/** Render a ProjectAnalysis into a Markdown document. */
export function renderMarkdown(a: ProjectAnalysis): string {
  const lines: string[] = [];
  lines.push(`# ${a.projectName}`, "");
  lines.push("> Auto-generated by QA Test Generator", "");
  lines.push("## Overview", "");
  lines.push("| Property | Value |", "|---|---|");
  lines.push(`| Language | ${a.language} |`);
  lines.push(`| BDD (Cucumber) | ${a.bdd ? "Yes" : "No"} |`);
  lines.push(`| Allure reporter | ${a.allure ? "Yes" : "No"} |`);
  if (a.baseUrl) lines.push(`| Base URL | ${a.baseUrl} |`);
  lines.push(`| Specs | ${a.specCount} |`);
  lines.push(`| Features | ${a.featureCount} |`);
  lines.push(`| Page Objects | ${a.pageObjectCount} |`);
  lines.push(`| Locator files | ${a.locatorCount} |`);
  lines.push(`| Helper files | ${a.helperCount} |`, "");

  if (a.featureOutlines.length > 0) {
    lines.push("## Test Scenarios", "");
    for (const fo of a.featureOutlines) {
      lines.push(`### ${fo.name}`, "");
      lines.push(`_\`${fo.path}\` — ${fo.scenarioCount} scenario(s)_`, "");
      if (fo.scenarios.length > 0) {
        for (const s of fo.scenarios) lines.push(`- ${s}`);
        lines.push("");
      }
    }
  }

  if (a.specs.length > 0) {
    lines.push("## Spec Files", "");
    for (const s of a.specs) lines.push(`- \`${s}\``);
    lines.push("");
  }

  if (a.pages.length > 0) {
    lines.push("## Page Objects", "");
    for (const p of a.pages) lines.push(`- \`${p}\``);
    lines.push("");
  }

  lines.push("## How to Run", "");
  lines.push("```bash");
  lines.push("npm install");
  lines.push("npm test            # run all tests (headless)");
  lines.push("npm run open        # open Cypress UI");
  if (a.allure) {
    lines.push("npm run test:allure # run tests + generate Allure report");
    lines.push("npm run allure:serve");
  }
  lines.push("```", "");

  return lines.join("\n");
}

/** Very small Markdown → HTML conversion for file export. */
export function renderHtml(a: ProjectAnalysis): string {
  const md = renderMarkdown(a);
  const body = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // code fences
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // tables (simple)
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) return ""; // separator row
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    });

  // Wrap consecutive <tr> in <table>.
  const tabled = body.replace(/(?:<tr>.*<\/tr>\s*)+/g, (m) => `<table>${m}</table>`);

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${a.projectName} — QA Docs</title>
<style>body{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 12px}
pre{background:#f4f4f4;padding:1rem;overflow:auto}code{background:#f4f4f4;padding:2px 4px}
</style></head><body>${tabled}</body></html>`;
}
