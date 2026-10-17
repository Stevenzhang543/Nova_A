/** 功能回归脚本：执行 verify-v26.22-reproducibility.mjs 对应场景，保留断言和证据输出。 */
// Retained audited implementation with separate 26.22 qualification identity.
const target = process.argv.find(/* 调用 value.startsWith('--qualification-release=') 并返回调用结果。 */ value => value.startsWith('--qualification-release='))
if (target && target !== '--qualification-release=26.22') throw Error('This entry point targets 26.22')
if (!target) process.argv.push('--qualification-release=26.22')
await import('./verify-v26.21-reproducibility.mjs')
