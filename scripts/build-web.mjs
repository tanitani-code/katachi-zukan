import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(projectRoot, "www");
const webExtensions = new Set([".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp3", ".wav", ".ogg"]);
const excludedDirectories = new Set([".git", ".android-tools", "android", "android-cap7-backup", "node_modules", "scripts", "www"]);
const excludedFiles = [/^preview\.html$/i, / - コピー/i, /^images\/fruits\/l_cwojdzinski-orange-2533197\.jpg$/i, /^images\/fruits\/mikan_sdxl_test\.png$/i, /^images\/vehicles\/.+_[1-4]\.png$/i];

function collectFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (excludedDirectories.has(entry)) continue;
    const absolutePath = join(directory, entry);
    const relativePath = relative(projectRoot, absolutePath).replaceAll("\\", "/");
    if (statSync(absolutePath).isDirectory()) files.push(...collectFiles(absolutePath));
    else if (webExtensions.has(extname(entry).toLowerCase()) && !excludedFiles.some((pattern) => pattern.test(relativePath))) files.push(relativePath);
  }
  return files;
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
const webFiles = collectFiles(projectRoot);
for (const relativePath of webFiles) {
  const destination = join(outputRoot, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(projectRoot, relativePath), destination);
}
console.log(`Android用Web資産: ${webFiles.length}ファイルを www/ に出力しました。`);
