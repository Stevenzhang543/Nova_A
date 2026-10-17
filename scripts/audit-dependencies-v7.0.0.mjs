/* 依赖审计版本入口 v7.0.0：设置目标版本并复用本地锁文件检查，必要时复制到对应公开版本报告名称。 */
process.env.NOVA_DEPENDENCY_AUDIT_VERSION = '7.0.0'
await import('./audit-dependencies-v6.9.0.mjs')
