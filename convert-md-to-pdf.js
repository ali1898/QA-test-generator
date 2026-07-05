#!/usr/bin/env node
// convert-md-to-pdf.js — Converts a Markdown file to PDF using Chrome headless

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const inputFile = args[0] || path.join(__dirname, "USAGE.md");
const outputFile = args[1] || inputFile.replace(/\.md$/i, ".pdf");
const title = args[2] || path.basename(inputFile, ".md");

const tempHtml = path.join(__dirname, `temp-${path.basename(inputFile, ".md")}.html`);
const lang = args[3] || "fa";

console.log(`Converting ${inputFile} to ${outputFile}...`);

const markdown = fs.readFileSync(inputFile, "utf-8");

// Simple custom markdown parsing for tables since `marked` might not handle RTL well
function renderMarkdown(md) {
  let html = "";
  const lines = md.split("\n");
  let inTable = false;
  let inCodeBlock = false;
  let codeContent = "";
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html += `<pre><code class="lang-${codeLang}">${escapeHtml(codeContent.replace(/\n$/, ""))}</code></pre>\n`;
        codeContent = "";
        inCodeBlock = false;
        codeLang = "";
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Tables
    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true;
        html += "<table>\n";
      }
      if (line.includes("---")) continue; // separator row
      const cells = line.split("|").filter(c => c !== "").map(c => c.trim());
      // Check if header (next line is separator)
      const isHeader = i + 1 < lines.length && lines[i + 1].startsWith("|") && lines[i + 1].includes("---");
      const tag = isHeader ? "th" : "td";
      html += `  <tr>${cells.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join("")}</tr>\n`;
      continue;
    } else if (inTable) {
      html += "</table>\n";
      inTable = false;
    }

    // Headings
    if (line.startsWith("### ")) {
      html += `<h3>${escapeHtml(line.slice(4))}</h3>\n`;
    } else if (line.startsWith("## ")) {
      html += `<h2>${escapeHtml(line.slice(3))}</h2>\n`;
    } else if (line.startsWith("# ")) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith("---")) {
      html += "<hr />\n";
    } else if (line.trim() === "") {
      html += "<p>&nbsp;</p>\n";
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      html += `<li>${escapeHtml(line.slice(2))}</li>\n`;
    } else if (line.match(/^\d+\.\s/)) {
      html += `<li>${escapeHtml(line.replace(/^\d+\.\s/, ""))}</li>\n`;
    } else {
      // Regular paragraph with inline formatting
      let p = escapeHtml(line);
      p = p.replace(/`([^`]+)`/g, "<code>$1</code>");
      p = p.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      p = p.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      html += `<p>${p}</p>\n`;
    }
  }
  if (inCodeBlock) {
    html += `<pre><code>${escapeHtml(codeContent.replace(/\n$/, ""))}</code></pre>\n`;
  }
  if (inTable) html += "</table>\n";
  return html;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const bodyHtml = renderMarkdown(markdown);

const isRtl = lang === "fa" || lang === "ar";

const fullHtml = `<!DOCTYPE html>
<html lang="${lang}"${isRtl ? ' dir="rtl"' : ""}>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 2cm 2.5cm 2.5cm 2.5cm; }
    body {
      font-family: "DejaVu Sans", "Noto Sans Arabic", "Tahoma", Arial, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      ${isRtl ? "direction: rtl;" : ""}
      font-size: 11pt;
    }
    h1 { color: #0d47a1; border-bottom: 3px double #0d47a1; padding-bottom: 8px; font-size: 22pt; page-break-after: avoid; }
    h2 { color: #1565c0; border-bottom: 1px solid #90caf9; padding-bottom: 4px; font-size: 16pt; margin-top: 28pt; page-break-after: avoid; }
    h3 { color: #1976d2; font-size: 13pt; margin-top: 16pt; page-break-after: avoid; }
    p { margin: 8px 0; ${isRtl ? "text-align: justify;" : ""} }
    code { background: #e3f2fd; padding: 1px 5px; border-radius: 3px; font-family: "DejaVu Sans Mono", "Consolas", monospace; font-size: 9.5pt; color: #0d47a1; }
    pre { background: #263238; color: #eeffff; padding: 14px 18px; border-radius: 6px; overflow-x: auto; page-break-inside: avoid; font-size: 9pt; line-height: 1.4; direction: ltr; text-align: left; }
    pre code { background: none; color: inherit; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; page-break-inside: avoid; font-size: 9.5pt; }
    th, td { border: 1px solid #bbdefb; padding: 7px 10px; ${isRtl ? "text-align: right;" : "text-align: left;"} }
    th { background: #1565c0; color: white; font-weight: bold; }
    tr:nth-child(even) { background: #e3f2fd; }
    ul, ol { margin: 6px 0; ${isRtl ? "padding-right: 24px;" : "padding-left: 24px;"} }
    li { margin: 3px 0; }
    a { color: #0d47a1; text-decoration: none; }
    hr { border: none; border-top: 2px solid #90caf9; margin: 24px 0; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #bbdefb; text-align: center; color: #607d8b; font-size: 9pt; }
    @media print { body { font-size: 10pt; } h1, h2, h3, h4, pre, table { page-break-inside: avoid; } }
  </style>
</head>
<body>
${bodyHtml}
<footer>${title} — MIT License</footer>
</body>
</html>`;

fs.writeFileSync(tempHtml, fullHtml, "utf-8");
console.log("HTML file created. Converting to PDF with Chrome...");

let success = false;
for (const browser of ["google-chrome", "chromium-browser", "chromium"]) {
  try {
    execSync(
      `${browser} --headless=new --disable-gpu --no-sandbox --print-to-pdf="${outputFile}" "${tempHtml}" 2>&1`,
      { stdio: "inherit", timeout: 30000 }
    );
    console.log(`PDF generated successfully: ${outputFile}`);
    success = true;
    break;
  } catch (e) {
    console.log(`${browser} failed, trying next...`);
  }
}

if (!success) {
  console.error("All browsers failed!");
  console.log(`HTML saved at: ${tempHtml}`);
  console.log("Open it in a browser and print to PDF manually.");
  process.exit(1);
}

try { fs.unlinkSync(tempHtml); } catch (e) {}
console.log("Done!");
