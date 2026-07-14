import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function main() {
  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const moduleName = entry.name;
    const srcPublic = path.join(SRC_DIR, moduleName, "public");
    const distPublic = path.join(DIST_DIR, moduleName, "public");
    if (fs.existsSync(srcPublic)) {
      copyDir(srcPublic, distPublic);
      console.log(`copied ${moduleName}/public → dist/${moduleName}/public`);
    }

    const srcAssets = path.join(SRC_DIR, moduleName, "assets");
    const distAssets = path.join(DIST_DIR, moduleName, "assets");
    if (fs.existsSync(srcAssets)) {
      copyDir(srcAssets, distAssets);
      console.log(`copied ${moduleName}/assets → dist/${moduleName}/assets`);
    }
  }
}

main();
