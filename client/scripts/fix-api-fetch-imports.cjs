const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const ROOT = path.join(__dirname, '..', 'src');
const files = walk(ROOT).filter((f) => !f.endsWith(`${path.sep}api.ts`) && !f.endsWith(`${path.sep}adminApi.ts`));

let fixed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  if (!/\bapiFetch(?:Json)?\b/.test(src)) continue;
  if (/from ['"]@\/lib\/api['"]/.test(src)) continue;

  const usesJson = src.includes('apiFetchJson');
  const importLine = usesJson
    ? "import { apiFetch, apiFetchJson } from '@/lib/api';\n"
    : "import { apiFetch } from '@/lib/api';\n";

  const importMatch = src.match(/^import .+ from .+;\r?\n/m);
  if (!importMatch) continue;

  const insertAt = src.indexOf(importMatch[0]) + importMatch[0].length;
  src = src.slice(0, insertAt) + importLine + src.slice(insertAt);

  // Drop unused API_URL import when only apiFetch remains
  if (!src.includes('API_URL') && src.includes("from '@/config'")) {
    src = src.replace(/import \{ API_URL \} from '@\/config';\n?/, '');
    src = src.replace(/import \{([^}]*), API_URL([^}]*)\} from '@\/config';/, "import {$1$2} from '@/config';");
    src = src.replace(/import \{ API_URL, ([^}]+) \} from '@\/config';/, "import { $1 } from '@/config';");
  }

  fs.writeFileSync(file, src);
  fixed++;
  console.log('fixed:', path.relative(ROOT, file));
}

console.log(`Done. ${fixed} files fixed.`);
