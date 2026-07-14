import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");

function collectModulePublicDirs() {
  const dirs = [];
  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const publicDir = path.join(SRC_DIR, entry.name, "public");
    if (fs.existsSync(publicDir)) {
      dirs.push(publicDir);
    }
  }
  return dirs;
}

function collectJsFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function transpileFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const result = await esbuild.transform(source, {
    loader: "js",
    target: "es2018",
  });

  fs.writeFileSync(filePath, result.code);
}

async function main() {
  const publicDirs = collectModulePublicDirs();
  const files = publicDirs.flatMap((dir) => collectJsFiles(dir));

  for (const filePath of files) {
    await transpileFile(filePath);
    console.log(`transpiled ${path.relative(ROOT, filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
