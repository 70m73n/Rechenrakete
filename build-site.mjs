import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.cwd();
const output = join(root, "dist", "server");
const files = [
  "index.html",
  "styles.css",
  "script.js",
  "pwa.js",
  "service-worker.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png"
};

const assets = {};
for (const file of files) {
  const buffer = await readFile(join(root, file));
  const binary = extname(file) === ".png";
  assets[`/${file.replaceAll("\\", "/")}`] = {
    type: mimeTypes[extname(file)],
    encoding: binary ? "base64" : "utf8",
    body: binary ? buffer.toString("base64") : buffer.toString("utf8")
  };
}

const worker = `const ASSETS = ${JSON.stringify(assets)};

function decode(asset) {
  if (asset.encoding === "utf8") return asset.body;
  return Uint8Array.from(atob(asset.body), character => character.charCodeAt(0));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/" || path.endsWith("/")) path = "/index.html";
    let asset = ASSETS[path];
    if (!asset && request.headers.get("accept")?.includes("text/html")) asset = ASSETS["/index.html"];
    if (!asset) return new Response("Not Found", { status: 404 });

    const headers = new Headers({
      "Content-Type": asset.type,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": path === "/index.html" || path === "/service-worker.js"
        ? "no-cache"
        : "public, max-age=3600"
    });
    if (path === "/service-worker.js") headers.set("Service-Worker-Allowed", "/");
    return new Response(decode(asset), { status: 200, headers });
  }
};
`;

await rm(join(root, "dist"), { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(join(output, "index.js"), worker, "utf8");
console.log(`Built ${files.length} PWA assets for deployment.`);
