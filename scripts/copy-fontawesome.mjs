import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "node_modules/@fortawesome/fontawesome-free");
const MASTER_TARGET = path.join(
  ROOT,
  "src/master/assets/icons/fontawesome",
);
const PUBLIC_TARGET = path.join(
  ROOT,
  "src/master/public/assets/icons/fontawesome",
);

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    const hasVendor = fs.existsSync(path.join(MASTER_TARGET, "css/all.min.css"));
    if (hasVendor) {
      console.log("Font Awesome already in master/assets, syncing to public...");
      fs.rmSync(PUBLIC_TARGET, { recursive: true, force: true });
      copyDir(MASTER_TARGET, PUBLIC_TARGET);
      return;
    }
    console.error(
      "Missing @fortawesome/fontawesome-free. Run npm install first.",
    );
    process.exit(1);
  }

  fs.rmSync(MASTER_TARGET, { recursive: true, force: true });
  fs.mkdirSync(MASTER_TARGET, { recursive: true });
  copyDir(path.join(SOURCE, "css"), path.join(MASTER_TARGET, "css"));
  copyDir(path.join(SOURCE, "webfonts"), path.join(MASTER_TARGET, "webfonts"));

  fs.rmSync(PUBLIC_TARGET, { recursive: true, force: true });
  copyDir(MASTER_TARGET, PUBLIC_TARGET);

  console.log(
    `copied Font Awesome to ${path.relative(ROOT, MASTER_TARGET)} and master/public/assets`,
  );
}

main();
