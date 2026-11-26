import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
const files = (dir) => readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : [join(dir,e.name)]);
let imports = 0;
for (const file of files('src').filter(f => /\.tsx?$/.test(f))) {
  const source = readFileSync(file,'utf8');
  for (const [, spec] of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']((?:@\/|\.{1,2}\/)[^"']+)["']/g)) {
    const path = spec.startsWith('@/') ? resolve('src',spec.slice(2)) : resolve(dirname(file),spec);
    const base = path.split('?')[0];
    assert.ok(['','.ts','.tsx','.js','.json','/index.ts','/index.tsx'].some(ext => existsSync(base+ext)), `${file}: unresolved ${spec}`);
    imports++;
  }
}
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
for (const icon of manifest.icons) assert.ok(existsSync('public'+icon.src), icon.src);
const migrations = files('supabase/migrations');
assert.equal(new Set(migrations.map(f => f.split('/').pop().split('_')[0])).size,migrations.length);
assert.ok(!existsSync('env'));
console.log(`PASS: ${imports} local import references, ${manifest.icons.length} PWA icons, ${migrations.length} unique migration versions; no bundled environment file.`);
