const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '../src/pages/triager'),
  path.join(__dirname, '../src/pages/admin'),
  path.join(__dirname, '../src/pages/researcher'),
  path.join(__dirname, '../src/pages/company'),
  path.join(__dirname, '../src/pages/support-tickets'),
  path.join(__dirname, '../src/components/support'),
];

function migrateFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  if (!s.includes('fetch(`${API_URL}') && !s.includes("fetch(`${API_URL}/")) return false;

  if (!s.includes("@/lib/api")) {
    if (s.includes("import { API_URL } from '@/config';")) {
      s = s.replace(
        "import { API_URL } from '@/config';",
        "import { API_URL } from '@/config';\nimport { apiFetch } from '@/lib/api';",
      );
    } else if (s.includes('from "@/config"')) {
      s = s.replace(/import \{ API_URL \} from "@\/config";/, (m) => `${m}\nimport { apiFetch } from '@/lib/api';`);
    }
  }

  s = s.replace(/const token = localStorage\.getItem\(['"]token['"]\);\s*\n\s*/g, '');

  s = s.replace(/fetch\(`\$\{API_URL\}([^`]+)`/g, "apiFetch('$1'");

  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*\}\s*\}/g,
    "apiFetch('$1'",
  );
  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*headers:\s*\{\s*Authorization:\s*`Bearer \$\{token\}`\s*\}\s*\}/g,
    "apiFetch('$1'",
  );
  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*method:\s*'([^']+)',\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*\}\s*\}/g,
    "apiFetch('$1', { method: '$2' }",
  );
  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*method:\s*'([^']+)',\s*headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"],\s*Authorization:\s*`Bearer \$\{token\}`\s*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}/g,
    "apiFetch('$1', { method: '$2', body: JSON.stringify($3) }",
  );
  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*method:\s*'([^']+)',\s*headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"],\s*Authorization:\s*`Bearer \$\{token\}`\s*\}\s*\}/g,
    "apiFetch('$1', { method: '$2' }",
  );
  s = s.replace(
    /apiFetch\('([^']+)',\s*\{\s*method:\s*'PATCH',\s*headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"],\s*Authorization:\s*`Bearer \$\{token\}`\s*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}/g,
    "apiFetch('$1', { method: 'PATCH', body: JSON.stringify($2) }",
  );

  fs.writeFileSync(filePath, s);
  return true;
}

let count = 0;
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.tsx')) continue;
    const fp = path.join(root, name);
    if (migrateFile(fp)) {
      count++;
      console.log('migrated', fp);
    }
  }
}
console.log('done', count, 'files');
