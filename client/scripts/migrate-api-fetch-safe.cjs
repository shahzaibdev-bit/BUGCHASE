/**
 * Migrate fetch(`${API_URL}/path`) → apiFetch(`/path`) with credentials via api.ts
 * Only touches page/component files that use API_URL fetch patterns.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const DIRS = [
  'pages',
  'components/admin',
  'components/support',
  'components/company',
  'components/researcher',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('fetch(`${API_URL}')) continue;

  const next = src
    .replace(/fetch\(`\$\{API_URL\}/g, 'apiFetch(`')
    .replace(/fetch\(\`\$\{API_URL\}/g, 'apiFetch(`');

  if (next === src) continue;

  let out = next;
  if (!out.includes("from '@/lib/api'") && !out.includes('from "@/lib/api"')) {
    const importMatch = out.match(/^import .+ from .+;\r?\n/m);
    if (importMatch) {
      const insertAt = out.indexOf(importMatch[0]) + importMatch[0].length;
      out = out.slice(0, insertAt) + "import { apiFetch } from '@/lib/api';\n" + out.slice(insertAt);
    }
  }

  if (!out.includes('API_URL') && out.includes("from '@/config'")) {
    out = out.replace(/import \{ API_URL \} from '@\/config';\n?/, '');
    out = out.replace(/import \{([^}]*), API_URL([^}]*)\} from '@\/config';/, "import {$1$2} from '@/config';");
    out = out.replace(/import \{ API_URL, ([^}]+) \} from '@\/config';/, "import { $1 } from '@/config';");
  }

  fs.writeFileSync(file, out);
  changed++;
  console.log('updated:', path.relative(ROOT, file));
}

console.log(`Done. ${changed} files updated.`);
