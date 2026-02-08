#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const galleryDir = path.join(rootDir, "assets", "gallery");
const manifestPath = path.join(galleryDir, "manifest.json");
const allowedExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const getImages = () => {
  if (!fs.existsSync(galleryDir)) {
    return [];
  }
  return fs
    .readdirSync(galleryDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedExts.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
};

const writeManifest = () => {
  const images = getImages();
  const payload = { images };
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[gallery] ${images.length} images -> assets/gallery/manifest.json`);
};

const watch = () => {
  if (!fs.existsSync(galleryDir)) {
    console.log("[gallery] No existe assets/gallery, esperando...");
  }
  let isWriting = false;
  let debounceId;

  fs.watch(galleryDir, { persistent: true }, (eventType, filename) => {
    if (isWriting) return;
    if (filename && filename.toLowerCase() === "manifest.json") return;
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      isWriting = true;
      writeManifest();
      setTimeout(() => {
        isWriting = false;
      }, 100);
    }, 150);
  });

  console.log("[gallery] Watch activo en assets/gallery");
};

const shouldWatch = process.argv.includes("--watch");
writeManifest();

if (shouldWatch) {
  watch();
}
