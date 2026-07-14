import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER_ASSETS = path.join(ROOT, "src/master/assets");
const PUBLIC_ASSETS = path.join(ROOT, "src/master/public/assets");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

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
  fs.mkdirSync(PUBLIC_ASSETS, { recursive: true });

  const favicon = path.join(MASTER_ASSETS, "favicon.ico");
  if (fs.existsSync(favicon)) {
    copyFile(favicon, path.join(PUBLIC_ASSETS, "favicon.ico"));
  }

  copyDir(path.join(MASTER_ASSETS, "img"), path.join(PUBLIC_ASSETS, "img"));
  copyDir(
    path.join(MASTER_ASSETS, "icons"),
    path.join(PUBLIC_ASSETS, "icons"),
  );

  console.log("synced master/assets → master/public/assets");
}

main();
