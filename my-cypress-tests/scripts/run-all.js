#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const SUITES = {
  smoke: {
    clean: "npm run cy:smoke:clean",
    run: "npm run cy:smoke",
    report: "npm run cy:smoke:report",
    copyServe: "npm run cy:smoke:copy-serve",
  },
  regression: {
    clean: "npm run cy:regression:clean",
    run: "npm run cy:regression",
    report: "npm run cy:regression:report",
    copyServe: "npm run cy:regression:copy-serve",
  },
  bdd: {
    clean: "npm run cy:bdd:clean",
    run: "npm run cy:bdd",
    report: "npm run cy:bdd:report",
    copyServe: "npm run cy:bdd:copy-serve",
  },
};

function run(cmd) {
  console.log("  > " + cmd);
  try {
    execSync(cmd, { stdio: "inherit", shell: true, cwd: path.resolve(__dirname, "..") });
    return { ok: true, code: 0 };
  } catch (e) {
    return { ok: false, code: e.status ?? 1 };
  }
}

const suite = process.argv[2];
if (!suite) {
  console.log("Usage: node scripts/run-all.js <smoke | regression | bdd | all>");
  process.exit(1);
}

if (suite === "all") {
  for (const s of ["smoke", "regression", "bdd"]) {
    const c = SUITES[s];
    run(c.clean);
    run(c.run);
    run(c.report);
    if (c.copyServe) run(c.copyServe);
  }
  process.exit(0);
}

const config = SUITES[suite];
if (!config) {
  console.log("Unknown suite: " + suite);
  process.exit(1);
}

run(config.clean);
const result = run(config.run);
run(config.report);
if (config.copyServe) run(config.copyServe);
process.exit(result.code);
