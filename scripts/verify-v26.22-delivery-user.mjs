// Retained real merge/save/reopen/export gameplay audit with 26.22 evidence identity.
const target = process.argv.find(value => value.startsWith('--qualification-release='))
if (target && target !== '--qualification-release=26.22') throw Error('This entry point targets 26.22')
if (!target) process.argv.push('--qualification-release=26.22')
await import('./verify-v26.21-delivery-user.mjs')
