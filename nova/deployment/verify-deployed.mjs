// Compare the public deployment with your local package using Node's built-in fetch.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const arguments_ = process.argv.slice(2);
assert.ok(arguments_[0], 'Usage: node verify-deployed.mjs https://nova.whitelists.top/ [--engine=online-v26.36] [--engine-only]');
const base = new URL(arguments_[0]);
assert.ok(!base.username && !base.password && !base.search && !base.hash, 'Use a plain public URL without credentials, query or fragment');
assert.ok(base.pathname.endsWith('/'), 'The Nova page URL must end with /');
assert.ok(base.protocol === 'https:' || (base.protocol === 'http:' && base.hostname === '127.0.0.1'), 'Use HTTPS, or loopback HTTP for preview');
for (const arg of arguments_.slice(1)) assert.ok(arg === '--engine-only' || arg.startsWith('--engine='), `Unknown option ${arg}`);
const engineOnly = arguments_.includes('--engine-only');
const localPage = await readFile(resolve(siteRoot, 'index.html'), 'utf8');
const button = /href="\.\/([A-Za-z0-9_-][A-Za-z0-9._-]*)\/">Try online mode<\/a>/.exec(localPage);
assert.ok(button, 'Local page has its relative online-mode button');
const engine = arguments_.find(arg => arg.startsWith('--engine='))?.slice('--engine='.length) ?? button[1];
assert.match(engine, /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/);
assert.ok(!engine.includes('..'), 'Engine folder must be a single safe path segment');
const engineRoot = resolve(siteRoot, engine);
const engineBase = new URL(engine + '/', base);
const localMetadata = JSON.parse(await readFile(resolve(engineRoot, 'release-metadata.json'), 'utf8'));
const localSums = await readFile(resolve(engineRoot, 'SHA256SUMS.txt'), 'utf8');
const expectedHashes = new Map(localSums.trim().split(/\r?\n/).map(line => {
  const match = /^([a-f\d]{64})  (.+)$/.exec(line);
  assert.ok(match, 'Valid local checksum manifest');
  const name = match[2];
  assert.ok(!name.includes('\\') && name.split('/').every(part => part && part !== '.' && part !== '..'), 'Safe checksum path');
  return [name, match[1]];
}));
const mime = {
  '.html': ['text/html'], '.js': ['text/javascript', 'application/javascript'],
  '.css': ['text/css'], '.json': ['application/json'], '.wasm': ['application/wasm'],
  '.webmanifest': ['application/manifest+json', 'application/json'],
  '.svg': ['image/svg+xml'], '.png': ['image/png'], '.woff2': ['font/woff2'],
};
const checks = [], failures = [], warnings = [];
const checkTag = Date.now().toString();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function urlFor(name, root) {
  return new URL(name.split('/').map(encodeURIComponent).join('/'), root);
}
async function request(url, { bustCache = true } = {}) {
  const target = new URL(url);
  if (bustCache) target.searchParams.set('nova-verification', checkTag);
  const response = await fetch(target, { signal: AbortSignal.timeout(30000),
    headers: { 'Cache-Control': 'no-cache' } });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}
async function compare(name, root, localRoot) {
  const { response, bytes } = await request(urlFor(name, root));
  assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
  const expectedBytes = await readFile(resolve(localRoot, name));
  if (localRoot === engineRoot && expectedHashes.has(name)) {
    assert.equal(hash(expectedBytes), expectedHashes.get(name), `${name}: local release checksum mismatch`);
  }
  assert.equal(hash(bytes), hash(expectedBytes), `${name}: response differs from the local package (stale cache, incomplete upload or HTML fallback)`);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (mime[extname(name)]) assert.ok(mime[extname(name)].includes(contentType), `${name}: unexpected MIME ${contentType}`);
  checks.push({ file: name, status: response.status, bytes: bytes.length, contentType,
    cacheControl: response.headers.get('cache-control'), hashMatched: true });
  return { response, bytes };
}
async function run(label, action) {
  try { await action(); console.log('PASS ' + label); }
  catch (error) { failures.push({ check: label, error: error.message }); console.error('FAIL ' + label + ': ' + error.message); }
}
if (!engineOnly) {
  await run('Landing page, relative button, stylesheet and script', async () => {
    const { bytes } = await compare('index.html', base, siteRoot);
    assert.match(bytes.toString('utf8'), new RegExp('href="\\./' + engine.replaceAll('.', '\\.') + '/">Try online mode</a>'));
    await compare('style.css', base, siteRoot);
    await compare('app.js', base, siteRoot);
    const { response, bytes: directoryBody } = await request(base);
    assert.equal(response.status, 200, 'Landing directory index');
    assert.equal(hash(directoryBody), hash(await readFile(resolve(siteRoot, 'index.html'))), 'Landing directory index body');
  });
}
await run('Editor directory index and trailing-slash redirect', async () => {
  const { response, bytes } = await request(engineBase);
  assert.equal(response.status, 200);
  assert.equal(hash(bytes), hash(await readFile(resolve(engineRoot, 'index.html'))));
  const slashless = new URL(engineBase);
  slashless.pathname = slashless.pathname.slice(0, -1);
  const result = await request(slashless);
  assert.equal(result.response.status, 200);
  assert.equal(new URL(result.response.url).pathname, engineBase.pathname, 'Directory URL must redirect to its trailing slash');
});
await run('Every public engine file matches the local release', async () => {
  const names = [...expectedHashes.keys()].filter(name => !name.split('/').some(part => part.startsWith('.')));
  names.push('SHA256SUMS.txt');
  let cursor = 0;
  const errors = [];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < names.length) {
      const name = names[cursor++];
      try { await compare(name, engineBase, engineRoot); }
      catch (error) { errors.push({ file: name, error: error.message }); }
    }
  }));
  for (const error of errors) console.error(`${error.file}: ${error.error}`);
  assert.equal(errors.length, 0, `${errors.length} engine files failed verification`);
});
await run('Manifest start URL, scope, icons and installed release metadata', async () => {
  const { bytes } = await request(new URL('manifest.webmanifest', engineBase));
  const manifest = JSON.parse(bytes.toString());
  assert.equal(new URL(manifest.start_url, engineBase).pathname, engineBase.pathname + 'index.html');
  assert.equal(new URL(manifest.scope, engineBase).pathname, engineBase.pathname);
  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, engineBase);
    assert.equal(iconUrl.origin, engineBase.origin);
    assert.ok(iconUrl.pathname.startsWith(engineBase.pathname));
    assert.equal((await request(iconUrl)).response.status, 200);
  }
  const remote = JSON.parse((await request(new URL('release-metadata.json', engineBase))).bytes.toString());
  assert.equal(remote.machineVersion, localMetadata.machineVersion);
});
await run('Missing engine assets return real 404 responses', async () => {
  for (const name of ['assets/nova-file-that-does-not-exist.js', 'assets/nova-file-that-does-not-exist.wasm', 'nova-file-that-does-not-exist.json']) {
    assert.equal((await request(new URL(name, engineBase))).response.status, 404, name);
  }
});
for (const name of ['index.html', 'browser-capabilities.js', 'manifest.webmanifest', 'player-manifest.json', 'release-metadata.json']) {
  const check = checks.findLast(item => item.file === name);
  if (check?.cacheControl?.includes('immutable')) warnings.push(`${name} has immutable caching; configure revalidation for bootstrap files.`);
}
const report = {
  generatedAtUTC: new Date().toISOString(), publicUrl: base.href, editorUrl: engineBase.href,
  engineVersion: localMetadata.machineVersion, engineOnly, passed: failures.length === 0,
  publicFilesCompared: checks.length, checks, failures, warnings,
  scope: 'Read-only HTTP integrity, MIME, directory, manifest and real-404 checks against the current local package. Hidden build metadata is checked locally/on the server, not required publicly. Extra older release directories are allowed. Does not execute browser scripts or certify every engine feature/device.',
};
const reportName = engineOnly ? 'ENGINE_DEPLOYED_VALIDATION.json' : 'DEPLOYED_VALIDATION.json';
await writeFile(fileURLToPath(new URL('./' + reportName, import.meta.url)), JSON.stringify(report, null, 2) + '\n');
for (const warning of warnings) console.warn('NOTE ' + warning);
console.log(`${report.passed ? 'PASS' : 'FAIL'} ${checks.length} public files compared; report: deployment/${reportName}`);
if (!report.passed) process.exitCode = 1;
