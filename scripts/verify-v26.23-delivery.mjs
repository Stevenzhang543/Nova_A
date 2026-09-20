// Retained delivery regression with separate 26.23 source/report identity.
const target = process.argv.find(value => value.startsWith('--qualification-release='))
if (target && target !== '--qualification-release=26.23') throw Error('This entry point targets 26.23')
if (!target) process.argv.push('--qualification-release=26.23')
await import('./verify-v26.21-delivery.mjs')
