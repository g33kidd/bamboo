import Endpoint from "../../endpoint";
import Pipe from "../../pipe";
import path from "path";

type FileTypes = { [ext: string]: string };

// List from here: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const SUPPORTED_FILE_TYPES: FileTypes = {
  txt: "text/plain",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  json: "application/json",
  xml: "application/xml",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  "7z": "application/x-7z-compressed",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  bin: "application/octet-stream",
  csv: "text/csv",
  md: "text/markdown",
  form: "application/x-www-form-urlencoded",
  mjs: "application/javascript",
  wasm: "application/wasm",
  ts: "application/javascript",
  // Add more file types here if needed
};

// TODO: Add more.
const SUPPORTED_EXTENSIONS = Object.keys(SUPPORTED_FILE_TYPES);
const isSupported = (ext: string) => SUPPORTED_EXTENSIONS.includes(ext);

// Get the content type from SUPPORTED_FILE_TYPES.
const contentType = (ext: string) => SUPPORTED_FILE_TYPES[ext];

/**
 * Handles static assets.
 */
export async function parseStatic(endpoint: Endpoint, staticPaths?: string[]) {
  if (!staticPaths) {
    staticPaths = ["static", "assets"];
  }

  const url = endpoint.parseURL();
  const expectedExt = url[url.length - 1].split(".")[1];
  const ext = isSupported(expectedExt) ? expectedExt : null;

  // There is no valid file extension to handle.
  if (!ext) return endpoint;

  // If somehow this gets through, directory traversal prevention is here...
  if (url.includes("../") || url.includes("..")) {
    endpoint.status(403);
  }

  const validFolder = staticPaths.some((path) => url.includes(path));
  if (!validFolder) {
    endpoint.status(404);
  }

  const fileUrl = path.join(process.cwd(), url.join("/"));
  const file = Bun.file(fileUrl);
  const exists = await file.exists();

  if (exists) {
    const contents = await file.arrayBuffer();

    endpoint.response = new Response(contents);
    endpoint.header("Content-Type", contentType(ext));
    endpoint.header("Content-Length", contents.byteLength);
    endpoint.locked = true;
  } else {
    endpoint.status(404, "Not Found");
  }

  return endpoint;
}

export default new Pipe("static", parseStatic, []);
