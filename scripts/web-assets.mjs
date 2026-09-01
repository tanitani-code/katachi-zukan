import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Only runtime documents and their referenced media belong in the Android bundle.
// Originals, alternative images, package metadata and preview pages remain in the source tree.
export function collectWebAssets(root) {
  const documents = readdirSync(root).filter(name => /\.(html|css|js)$/.test(name) && name !== 'preview.html');
  const files = new Set(documents);
  for (const name of documents) {
    const source = readFileSync(join(root, name), 'utf8');
    for (const match of source.matchAll(/(?:images|sounds)\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|wav|ogg)/g)) {
      if (match[0].includes('..')) throw Error(`Unsafe asset path: ${match[0]}`);
      files.add(match[0]);
    }
    // app-shell creates this one path dynamically from the current page name.
    if (name.endsWith('.html') && /<script[^>]+src=["']app-shell\.js/.test(source)) {
      files.add(`images/headers/${name === 'index.html' ? 'top' : name.slice(0, -5)}.png`);
    }
  }
  const result = [...files].sort();
  for (const file of result) {
    if (!statSync(join(root, file)).isFile()) throw Error(`Missing runtime file: ${file}`);
  }
  return result;
}
