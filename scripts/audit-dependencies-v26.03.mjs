/* 依赖审计版本入口 v26.03：设置目标版本并复用本地锁文件检查，必要时复制到对应公开版本报告名称。 */
import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_DEPENDENCY_AUDIT_VERSION = '26.3.0'
await import('./audit-dependencies-v6.9.0.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.3.0-dependency-audit.json'), join(root, 'release-audits/v26.03-dependency-audit.json'))
