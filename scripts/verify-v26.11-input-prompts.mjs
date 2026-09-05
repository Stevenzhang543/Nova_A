import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = await mkdtemp(join(tmpdir(), 'nova-2611-input-prompts-'))
try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: {
    ssr: true, outDir: output, emptyOutDir: false,
    rollupOptions: { input: join(root, 'src/runtime/inputModality.ts'), output: { entryFileNames: 'prompts.mjs' } }
  } })
  const { inputPromptForAction, setInputModality, formatInputPrompt } = await import(pathToFileURL(join(output, 'prompts.mjs')).href)
  const action = (device, code) => [{ name: 'Jump', bindings: [{ device, code }] }]
  const fallback = inputPromptForAction('Jump', action('physical-key', 'Space'), 'mouse')
  assert.equal(fallback.modality, 'keyboard')
  assert.equal(fallback.symbol, 'Space')
  assert.equal(fallback.accessibleLabel, 'Jump: Space on keyboard')
  assert.equal(formatInputPrompt(fallback), '[Space] Jump')
  assert.equal(inputPromptForAction('Jump', action('mouse-button', '0'), 'keyboard').symbol, 'LMB')
  assert.equal(inputPromptForAction('Jump', action('gamepad-axis', '0'), 'gamepad').symbol, 'Axis 0')
  const missing = inputPromptForAction('Jump', [], 'mouse')
  assert.equal(missing.symbol, '—')
  assert.equal(missing.accessibleLabel, 'Jump: unbound')
  assert.equal(inputPromptForAction('Jump', action('pen-button', 'eraser'), 'touch').modality, 'pen')
  setInputModality('gamepad', 'Sony DualSense')
  const mixed = [{ name: 'Jump', bindings: [{ device: 'physical-key', code: 'Space' }, { device: 'gamepad-button', code: '0' }] }]
  assert.equal(inputPromptForAction('Jump', mixed).symbol, '✕')
  assert.equal(inputPromptForAction('Jump', mixed, 'keyboard').symbol, 'Space')
  console.log('26.11 input prompts passed: fallback device, missing bindings, axes, pen, and selected-controller glyphs.')
} finally {
  await rm(output, { recursive: true, force: true })
}
