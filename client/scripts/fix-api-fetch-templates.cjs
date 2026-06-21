const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory() && name !== 'node_modules') walk(fp, out);
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(fp);
  }
  return out;
}

const root = path.join(__dirname, '../src');
let count = 0;

for (const fp of walk(root)) {
  let s = fs.readFileSync(fp, 'utf8');
  const orig = s;

  // Fix apiFetch('/path/${var}/more' -> apiFetch(`/path/${var}/more`
  s = s.replace(/apiFetch\('([^']*\$\{[^}]+\}[^']*)'/g, 'apiFetch(`$1`');

  // Remove redundant manual auth headers when using apiFetch
  s = s.replace(
    /apiFetch\(([^,]+),\s*\{\s*headers:\s*token\s*\?\s*\{\s*Authorization:\s*`Bearer \$\{token\}`\s*\}\s*:\s*\{\s*\},\s*credentials:\s*'include',\s*/g,
    'apiFetch($1, { ',
  );
  s = s.replace(
    /apiFetch\(([^,]+),\s*\{\s*headers:\s*\{\s*Authorization:\s*`Bearer \$\{token\}`[^}]*\},\s*credentials:\s*'include',\s*/g,
    'apiFetch($1, { ',
  );
  s = s.replace(
    /,\s*headers:\s*\{\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*\}/g,
    '',
  );
  s = s.replace(
    /headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"],\s*['"]Authorization['"]:\s*`Bearer \$\{token\}`\s*\}/g,
    '',
  );
  s = s.replace(
    /headers:\s*\{\s*Authorization:\s*`Bearer \$\{token\}`,\s*['"]Content-Type['"]:\s*['"]application\/json['"]\s*\}/g,
    '',
  );
  s = s.replace(/,\s*credentials:\s*'include'/g, '');
  s = s.replace(/\{\s*,/g, '{');
  s = s.replace(/,\s*\}/g, ' }');

  if (s !== orig) {
    fs.writeFileSync(fp, s);
    count++;
    console.log('fixed', path.relative(root, fp));
  }
}

console.log('done', count);
