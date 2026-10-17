// Optional repository QA: uses Nova_A's existing Edge audit helper, not a site dependency.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { withBrowserAudit, wait } from '../../scripts/lib/browserUserAudit.mjs';

const origin = process.argv[2] ?? 'http://127.0.0.1:4173';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Use the loopback preview origin');
process.env.NOVA_AUDIT_REPORT_DIRECTORY = fileURLToPath(new URL('./qa/', import.meta.url));
const responses = [], failed = [];
await withBrowserAudit({
  release: '26.35', name: 'website-online', expectedRelease: '26.35',
  root: fileURLToPath(new URL('../../', import.meta.url)),
  initialUrl: origin + '/nova/', readyExpression: "!!document.querySelector('#nova-a')",
  qualifyRelease: false,
}, async a => {
  const clickSettled = async selector => {
    await a.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'});true`);
    await wait(150);
    await a.click(selector);
  };
  await a.client.send('Network.enable');
  a.client.on('Network.responseReceived', event => responses.push({
    url: event.response.url, status: event.response.status, mime: event.response.mimeType,
  }));
  a.client.on('Network.loadingFailed', event => {
    if (!event.canceled && event.errorText !== 'net::ERR_ABORTED') failed.push(event.errorText);
  });
  for (const prefix of ['/', '/nova/']) {
    await a.check(`Landing page and button resolve at ${prefix}`, async () => {
      await a.viewport(1440, 900);
      await a.client.send('Page.navigate', { url: origin + prefix });
      await a.until("document.readyState==='complete'&&!!document.querySelector('#nova-a')");
      const info = await a.evaluate(`(() => {
        const link = document.querySelector('#nova-a .actions a[href="./online/"]');
        return {count: document.querySelectorAll('a[href="./online/"]').length,
          label: link?.textContent, href: link?.href,
          previous: link?.previousElementSibling?.href,
          css: document.querySelector('link[rel="stylesheet"]').href,
          js: document.querySelector('script[src]').src,
          styled: getComputedStyle(link).display,
          overflow: document.documentElement.scrollWidth > innerWidth};
      })()`);
      assert.equal(info.count, 1);
      assert.equal(info.label, 'Try online mode');
      assert.equal(info.href, origin + prefix + 'online/');
      assert.equal(info.previous, 'https://github.com/Stevenzhang543/Nova_A/');
      assert.ok(info.css.startsWith(origin + prefix + 'style.css'));
      assert.ok(info.js.startsWith(origin + prefix + 'app.js'));
      assert.match(info.styled, /^(inline-)?flex$/);
      assert.equal(info.overflow, false);
      a.observations.push({ prefix, ...info });
    });
    await a.check(`Theme and narrow button layout work at ${prefix}`, async () => {
      const before = await a.evaluate('document.documentElement.dataset.theme');
      await a.click('[data-theme-toggle]');
      assert.notEqual(await a.evaluate('document.documentElement.dataset.theme'), before);
      await a.click('[data-theme-toggle]');
      for (const width of [390, 320]) {
        await a.viewport(width, 844);
        const info = await a.evaluate(`(() => {
          const links = [...document.querySelectorAll('#nova-a .actions a')];
          return {overflow: document.documentElement.scrollWidth > innerWidth,
            buttons: links.map(e => { const r=e.getBoundingClientRect(); return {
              label:e.textContent, left:r.left, right:r.right, width:r.width, height:r.height}; })};
        })()`);
        assert.equal(info.overflow, false);
        assert.ok(info.buttons.every(b => b.width > 0 && b.height > 0 && b.left >= 0 && b.right <= width));
        a.observations.push({ prefix, width, ...info });
      }
      await clickSettled('#nova-a .actions a[href="./online/"]');
      await a.until("!!document.querySelector('.project-manager')", 30000);
      assert.equal(await a.evaluate('location.pathname'), prefix + 'online/');
      await a.viewport(1440, 900);
      assert.match(await a.evaluate("document.querySelector('.manager-header .version').textContent"), /26\.35/);
      await a.capture(prefix === '/' ? 'root-launcher' : 'nested-launcher');
    });
  }
  await a.check('Nested editor creates a project and initializes WebAssembly', async () => {
    await clickSettled('.quick-actions .new-project');
    await a.until("!!document.querySelector('.creation-dialog')");
    await a.fill('.creation-card header input', 'Online hosting smoke');
    await clickSettled('[data-template-id="empty"]');
    await clickSettled('.creation-card .create-button');
    await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000);
    await wait(1000);
    if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
      await a.clickText('.onboarding-scrim button', 'Skip for now', true);
      await a.until("!document.querySelector('.onboarding-scrim')");
    }
    assert.equal(await a.evaluate("!!document.querySelector('.fault-overlay,.player-error')"), false);
    assert.ok(responses.some(r => r.url.endsWith('.wasm') && r.status === 200 && r.mime === 'application/wasm'));
    await a.capture('nested-editor');
  });
  await a.check('Both themes and mobile landing page render without missing assets', async () => {
    await a.client.send('Page.navigate', { url: origin + '/nova/#nova-a' });
    await a.until("document.readyState==='complete'&&!!document.querySelector('#nova-a')");
    await a.viewport(1440, 900);
    await a.evaluate("document.querySelector('#nova-a').scrollIntoView();true");
    await wait(600);
    await a.capture('landing-desktop');
    await a.click('[data-theme-toggle]');
    await wait(400);
    await a.capture('landing-desktop-alternate-theme');
    await a.viewport(390, 844);
    await a.evaluate("document.querySelector('#nova-a .actions').scrollIntoView({block:'center'});true");
    await wait(500);
    await a.capture('landing-mobile');
    assert.deepEqual(responses.filter(r => r.status >= 400 && !r.url.endsWith('/favicon.ico')), []);
    assert.deepEqual(failed, []);
    a.observations.push({ networkResponses: responses.length, failedRequests: failed,
      missingAssets: [], scope: 'Published ZIP served unchanged; actual click, project creation and WASM load.' });
  });
});
const reportPath = fileURLToPath(new URL('./qa/v26.35-website-online.json', import.meta.url));
const report = JSON.parse(await readFile(reportPath, 'utf8'));
report.scope = 'Copied Nova website and unchanged published v26.35 Web ZIP over loopback HTTP at / and /nova/. Real Edge input, launcher, new project, WASM loading, desktop/mobile composition and two themes. Headless software rendering; not public HTTPS, physical devices, every engine feature or full release qualification.';
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
