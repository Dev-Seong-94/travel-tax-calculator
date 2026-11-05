// Serves the static export for end-to-end tests.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.argv[2]);
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

async function resolveFile(pathname) {
  const path = join(ROOT, normalize(decodeURIComponent(pathname)));
  if (path !== ROOT && !path.startsWith(ROOT + sep)) return null;
  try {
    const info = await stat(path);
    if (info.isFile()) return path;
    const index = join(path, "index.html");
    return (await stat(index)).isFile() ? index : null;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  const file = await resolveFile(pathname);
  const target = file ?? join(ROOT, "404.html");
  response.writeHead(file ? 200 : 404, {
    "Content-Type": TYPES[extname(target)] ?? "application/octet-stream",
  });
  createReadStream(target).pipe(response);
}).listen(PORT, "127.0.0.1");
