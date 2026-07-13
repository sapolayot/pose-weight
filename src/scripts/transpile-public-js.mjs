import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC_DIR = path.join(ROOT, "src/public");

function collectJsFiles(dir) {
  const files = [];

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
  const files = collectJsFiles(PUBLIC_DIR);

  for (const filePath of files) {
    await transpileFile(filePath);
    console.log(`transpiled ${path.relative(ROOT, filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
