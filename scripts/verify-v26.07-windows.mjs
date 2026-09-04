import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_WINDOWS_VERSION = '26.7.0'
process.env.NOVA_WINDOWS_REFERENCE = 'multiplayer-v2607-coop-rollback'
process.env.NOVA_WINDOWS_GAME_NAME = 'Nova 26.07 Co-op Rollback'
await import('./verify-v6.2.0-windows.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.7.0-windows-smoke.json'), join(root, 'release-audits/v26.07-windows-smoke.json'))
