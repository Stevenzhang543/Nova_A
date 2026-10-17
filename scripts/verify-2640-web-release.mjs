/** 验证 releases/v26.40 中的 Web 包（解包后）能真实加载，而不是只验证构建目录。 */
import { readFile } from 'node:fs/promises'

process.env.NOVA_AUDIT_DIST_DIRECTORY = '.cache/web-release-check'
const { withBrowserAudit } = await import('./lib/browserUserAudit.mjs')

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const errors = []

await withBrowserAudit({ release, name: 'web-release-2640', width: 1440, height: 900 }, async a => {
  a.client.on('Runtime.exceptionThrown', params => errors.push(params?.exceptionDetails?.text ?? 'exception'))
  a.client.on('Runtime.consoleAPICalled', params => {
    if (params?.type === 'error') errors.push((params.args ?? []).map(/** 取控制台文本。 */ arg => arg.value ?? arg.description ?? '').join(' '))
  })
  await a.client.send('Runtime.enable')
  await a.until("!!document.querySelector('.project-manager')", 30000)
  const version = await a.evaluate("document.body.innerText.match(/26\\.40/)?.[0] ?? null")
  const assets = await a.evaluate("(()=>{const s=[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e=>e.src||e.href);return s.length})()")
  console.log('version text: ' + version + ' | asset links: ' + assets)
  await a.capture('web-release-welcome')
  console.log('console errors: ' + JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
  if (version !== '26.40') { console.log('MISMATCH: the release build must display 26.40'); process.exitCode = 1 }
})
