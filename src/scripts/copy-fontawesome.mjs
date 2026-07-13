import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "node_modules/@fortawesome/fontawesome-free");
const TARGET = path.join(ROOT, "src/public/vendor/fontawesome");

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
    console.error(
      "Missing @fortawesome/fontawesome-free. Run npm install first.",
    );
    process.exit(1);
  }

  fs.rmSync(TARGET, { recursive: true, force: true });
  fs.mkdirSync(TARGET, { recursive: true });

  copyDir(path.join(SOURCE, "css"), path.join(TARGET, "css"));
  copyDir(path.join(SOURCE, "webfonts"), path.join(TARGET, "webfonts"));

  console.log(`copied Font Awesome to ${path.relative(ROOT, TARGET)}`);
}

main();
