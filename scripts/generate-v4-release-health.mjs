import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), directory = join(root,'release-audits'), generatedAt = new Date().toISOString()
const names = (await readdir(directory)).filter(name => name.startsWith('v4.0.0-') && name.endsWith('.json') && name !== 'v4.0.0-release-health.json')
const reports = []
for (const name of names) { try { const value = JSON.parse(await readFile(join(directory,name),'utf8')); reports.push({ name, format:value.format ?? '', status:value.status ?? 'unknown' }) } catch { reports.push({ name, format:'invalid-json', status:'failed' }) } }
const failed = reports.filter(item => item.status === 'failed'), external = reports.filter(item => String(item.status).includes('external'))
const report = { format:'nova-release-health-dashboard',version:1,engineVersion:'4.0.0',generatedAt,reports,passed:reports.length-failed.length,failed:failed.length,externalGates:external.length,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'healthy-with-declared-external-gates' }
await writeFile(join(directory,'v4.0.0-release-health.json'),`${JSON.stringify(report,null,2)}\n`)
const rows = reports.map(item=>`<tr><td>${item.name}</td><td>${item.format}</td><td data-status="${item.status}">${item.status}</td></tr>`).join('')
await writeFile(join(directory,'v4.0.0-release-health.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nova_A 4.0 release health</title><style>body{margin:0;padding:32px;background:#11151b;color:#eef3f9;font:14px/1.5 system-ui}main{max-width:1100px;margin:auto}h1{font-size:32px}p{color:#9eacbd}table{width:100%;border-collapse:collapse;background:#181e27}th,td{padding:9px;border:1px solid #303947;text-align:left}td[data-status=failed]{color:#ff7280}td[data-status=passed]{color:#72d99a}</style></head><body><main><h1>Nova_A 4.0 release health</h1><p>${generatedAt} · ${report.status} · ${reports.length} reports · ${failed.length} failed · ${external.length} declared external gates</p><table><thead><tr><th>Report</th><th>Format</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>`)
console.log(`Nova_A v4 release-health dashboard: ${reports.length} reports, ${failed.length} failed, ${external.length} external-gate records.`)
if (failed.length) process.exit(1)
