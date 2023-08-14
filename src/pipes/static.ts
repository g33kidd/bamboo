import Endpoint from "../endpoint";
import Pipe from "../pipe";
import path from "path";

export type FileTypes = { [ext: string]: string };

// List from here: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
export const SUPPORTED_FILE_TYPES: FileTypes = {
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

const CACHE_DURATION = 3600; // Cache duration in seconds (1 hour)

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

  if (!ext) return endpoint;

  if (url.includes("../") || url.includes("..")) {
    return endpoint.status(403);
  }

  const validFolder = staticPaths.some((path) => url.includes(path));
  if (!validFolder) {
    return endpoint.status(404);
  }

  const fileUrl = path.join(process.cwd(), url.join("/"));
  const file = Bun.file(fileUrl);
  const exists = await file.exists();

  if (exists) {
    // const contents = await file.arrayBuffer();

    const response = new Response(file.stream());
    response.headers.set("Content-Type", file.type);
    response.headers.set("Content-Length", file.size.toString());

    // Cache Control Headers
    response.headers.set("Cache-Control", `public, max-age=${CACHE_DURATION}`);

    // ETag (Entity Tag)
    const etag = `"${new Date().getTime().toString(16)}"`;
    response.headers.set("ETag", etag);

    // Conditional Requests
    const ifNoneMatch = endpoint.header("if-none-match");
    if (ifNoneMatch === etag) {
      return endpoint.status(304); // Not Modified
    }

    endpoint.response = response;
    endpoint.locked = true;
  } else {
    return endpoint.status(404);
  }

  return endpoint;
}

export default new Pipe("static", parseStatic, []);
