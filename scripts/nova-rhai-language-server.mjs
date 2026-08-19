#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const language = await vite.ssrLoadModule('/src/editor/scriptLanguage.ts')
const index = new language.ScriptWorkspaceIndex()
const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false })

process.stdout.write(`${JSON.stringify({ event: 'ready', protocol: 'nova-rhai-language/1', apiVersion: 1 })}\n`)
for await (const line of input) {
  if (!line.trim()) continue
  try {
    const request = JSON.parse(line)
    if (request?.method === 'shutdown') { process.stdout.write(`${JSON.stringify({ id: request.id, result: null })}\n`); break }
    process.stdout.write(`${JSON.stringify(language.handleScriptProtocol(index, request))}\n`)
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ id: null, error: { code: 'NOVA-PROTOCOL-002', message: error instanceof Error ? error.message : String(error) } })}\n`)
  }
}
index.clear()
await vite.close()
