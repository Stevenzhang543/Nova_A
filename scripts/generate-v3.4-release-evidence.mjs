/** 版本3.4：汇集发布报告与产物文件，生成带来源记录的发布证据。 */
process.env.NOVA_EVIDENCE_VERSION = '3.4.0'
await import('./generate-v3.3-release-evidence.mjs')
