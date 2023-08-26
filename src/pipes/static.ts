import Endpoint from "../endpoint";
import Pipe from "../pipe";
import path, { join } from "path";

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
  ico: "image/vnd.microsoft.icon",
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
  // Path mapping needs to be a thing
  // Will be used to search directories or rewrite them.
  // This is needed while running a vite development server, because some assets come from node_modules.
  const pathMap: Map<string, string> =
    endpoint.engine.config.pathMap ?? new Map();

  // TODO: Support multiple static paths. This needs to be combined with the pathMap above.
  if (!staticPaths) {
    staticPaths = ["static", "assets", "frontend/public"];
  }

  const url = endpoint.parseURL();
  const expectedExt = url[url.length - 1].split(".")[1];
  const ext = isSupported(expectedExt) ? expectedExt : null;

  // This is likely empty or a folder.
  const folder = url[0];

  if (!ext) return endpoint;

  if (url.includes("../") || url.includes("..")) {
    return endpoint.status(403);
  }

  // Actually the folder doesn't matter, but the path we search in does.
  // const validFolder = staticPaths.some((path) => url.includes(path));
  // if (!validFolder) {
  //   // return endpoint.status(404);
  // }

  // let fileURL;
  // let file;
  // let exists;

  // In-case this directory has been mapped as a different path in the filesystem, we'll figure that out here.
  let directory = join(process.cwd(), "static");
  let modifiedDirectory = false;

  if (folder !== "" || folder !== null) {
    // Get the mapped path and assign it.
    const mappedPath = pathMap.get(folder);
    if (mappedPath) {
      directory = mappedPath;
      modifiedDirectory = true;
    }
  }

  let fileURL = path.join(directory, url.join("/"));
  let file = Bun.file(fileURL);
  let exists = await file.exists();

  // Loops through the static paths and tries to find the file.
  for (let i = 0; i < staticPaths.length; i++) {
    const path = staticPaths[i];
    const possibleFile = Bun.file(join(path, url.join("/")));
    const possibleFileExists = await possibleFile.exists();

    if (possibleFileExists) {
      file = possibleFile;
      exists = possibleFileExists;
    }
  }

  const fileUrl = path.join(directory, url.join("/"));
  // console.log(fileUrl);
  // const file = Bun.file(fileUrl);
  // const exists = await file.exists();

  if (exists) {
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

// TODO: Make it possible to specify options within a pipe like this. If it's called from elsewhere,
// the ability to set some options should be present.
export default new Pipe("static", parseStatic, []);
