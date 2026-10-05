// Verify the unchanged published engine without any extra dependencies.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const page = await readFile(resolve(siteRoot, 'index.html'), 'utf8');
const link = /href="\.\/([A-Za-z0-9_-][A-Za-z0-9._-]*)\/">Try online mode<\/a>/.exec(page);
assert.ok(link, 'Relative Try online mode link');
const root = process.argv[2] ? resolve(process.argv[2]) : resolve(siteRoot, link[1]);
const manifest = await readFile(resolve(root, 'SHA256SUMS.txt'), 'utf8');
const expected = new Set(['SHA256SUMS.txt']);
for (const line of manifest.trim().split(/\r?\n/)) {
  const match = /^([a-f\d]{64})  (.+)$/.exec(line);
  assert.ok(match, `Invalid checksum line: ${line}`);
  const [, hash, name] = match;
  const path = resolve(root, name);
  assert.ok(path.startsWith(resolve(root) + sep), `Unsafe path: ${name}`);
  assert.ok(!expected.has(name), `Duplicate file: ${name}`);
  const bytes = await readFile(path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `Changed file: ${name}`);
  expected.add(name);
}
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `Unexpected symbolic link: ${name}`);
    if (entry.isDirectory()) result.push(...await files(resolve(directory, entry.name), name + '/'));
    else result.push(name);
  }
  return result;
}
assert.deepEqual((await files(root)).sort(), [...expected].sort(), 'Complete release file inventory');
assert.match(page, /href="\.\/style\.css/);
assert.match(page, /src="\.\/app\.js/);
console.log(`PASS: ${expected.size - 1} engine checksums; complete ${expected.size}-file release; relative webpage links.`);
