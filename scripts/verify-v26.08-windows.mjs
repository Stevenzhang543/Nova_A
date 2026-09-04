import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_WINDOWS_VERSION = '26.8.0'
process.env.NOVA_WINDOWS_REFERENCE = 'platform-v2608-touch-pen-accessibility'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 26.08 Touch, Pen, and Accessibility Playground'
await import('./verify-v6.2.0-windows.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.8.0-windows-smoke.json'), join(root, 'release-audits/v26.08-windows-smoke.json'))
