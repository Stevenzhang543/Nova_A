/** Real-browser production submission admission/fence/lifecycle checks. */
process.argv.push('--credit-checks')
await import('./verify-engine-renderer-slice.mjs')
