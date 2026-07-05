#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const reportDir = process.argv[2];
if (!reportDir) {
  console.error("Usage: node scripts/serve/copy.js <report-dir>");
  process.exit(1);
}

const dst = path.resolve(reportDir);
if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
