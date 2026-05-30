const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 8787;
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}).listen(port, "0.0.0.0");
