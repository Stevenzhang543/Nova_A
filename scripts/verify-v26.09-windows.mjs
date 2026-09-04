import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_WINDOWS_VERSION = '26.9.0'
process.env.NOVA_WINDOWS_REFERENCE = 'performance-v2609-large-world'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 26.09 100k Large-world Playground'
await import('./verify-v6.2.0-windows.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.9.0-windows-smoke.json'), join(root, 'release-audits/v26.09-windows-smoke.json'))
