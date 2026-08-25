#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const language = await vite.ssrLoadModule('/src/editor/scriptLanguage.ts')
const index = new language.ScriptWorkspaceIndex()
const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false })
const indexArgument = process.argv.indexOf('--index')
const indexPath = indexArgument >= 0 && process.argv[indexArgument + 1] ? resolve(process.argv[indexArgument + 1]) : null
if (indexPath) try { index.restore(await readFile(indexPath, 'utf8')) } catch { /* A missing/corrupt cache is rebuilt from client documents. */ }

process.stdout.write(`${JSON.stringify({ event: 'ready', protocol: 'nova-rhai-language/2', apiVersion: 2, indexDocuments: index.size, capabilities: ['semanticCompletion','signatureHelp','hover','diagnostics','symbols','definition','references','rename','codeActions','formatting','moduleAssistance','workspaceIndex','cancellation'] })}\n`)
for await (const line of input) {
  if (!line.trim()) continue
  try {
    const request = JSON.parse(line)
    if (request?.method === '$/cancelRequest') { process.stdout.write(`${JSON.stringify({ id: request.id ?? null, result: { cancelled: request?.params?.id ?? null } })}\n`); continue }
    if (request?.method === 'workspace/saveIndex') { if (indexPath) await writeFile(indexPath, `${index.snapshot()}\n`, 'utf8'); process.stdout.write(`${JSON.stringify({ id: request.id, result: { documents: index.size, saved: Boolean(indexPath) } })}\n`); continue }
    if (request?.method === 'shutdown') { if (indexPath) await writeFile(indexPath, `${index.snapshot()}\n`, 'utf8'); process.stdout.write(`${JSON.stringify({ id: request.id, result: null })}\n`); break }
    process.stdout.write(`${JSON.stringify(language.handleScriptProtocol(index, request))}\n`)
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ id: null, error: { code: 'NOVA-PROTOCOL-002', message: error instanceof Error ? error.message : String(error) } })}\n`)
  }
}
index.clear()
await vite.close()
