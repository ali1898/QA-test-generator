const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const REPORT_PATH = path.resolve(process.argv[2] || ".");

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(REPORT_PATH, safePath);

  if (!filePath.startsWith(REPORT_PATH)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!fs.existsSync(filePath)) {
    const fallback = path.join(REPORT_PATH, "index.html");
    if (fs.existsSync(fallback)) return serveFile(fallback, res);
    res.writeHead(404);
    return res.end("Report not found. Run 'npm run cy:smoke:report' first.");
  }

  serveFile(filePath, res);
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

server.listen(PORT, () => {
  console.log("Serving Allure report at http://localhost:" + PORT + "/");
  console.log("Report path: " + REPORT_PATH);
});
