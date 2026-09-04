import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) {
  if (!(name in globalThis)) Object.defineProperty(globalThis, name, { configurable: true, value: class {} })
}

const release = '26.08'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2608-platform-input-'))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

let gamepads = [], gamepadReads = 0
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { getGamepads: () => { gamepadReads += 1; return gamepads }, maxTouchPoints: 0 }
})

try {
  await build({
    configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
    build: {
      ssr: true, outDir: compiled, emptyOutDir: false,
      rollupOptions: {
        input: { input: join(root, 'src/runtime/input.ts'), device: join(root, 'src/runtime/deviceInput.ts') },
        output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' }
      }
    }
  })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [input, device] = await Promise.all(['input', 'device'].map(load))

  const penMap = input.normalizeInputMap([{ name: 'Pen', kind: 'axis', bindings: [
    { ...input.createInputBinding('pen-pressure', 'bad'), deadzone: 0 },
    { ...input.createInputBinding('pen-tilt', 'tilt-y'), deadzone: 0 },
    input.createInputBinding('pen-twist', 'anything'),
    input.createInputBinding('pen-button', 'eraser'),
    input.createInputBinding('pen-button', 'button-99')
  ] }])
  check('V2608-PEN-NORMALIZATION', penMap[0].bindings.map(item => `${item.device}:${item.code}`).join('|') === 'pen-pressure:pressure|pen-tilt:y|pen-twist:twist|pen-button:eraser|pen-button:tip', 'Pen bindings normalize pressure, tilt, twist and bounded button codes without changing the action schema.')

  const penManager = new input.InputManager()
  const penActions = [
    input.createInputAction('Pressure', 'axis', [{ ...input.createInputBinding('pen-pressure', 'pressure'), deadzone: 0 }]),
    input.createInputAction('Tilt', 'vector2', [{ ...input.createInputBinding('pen-tilt', 'x'), deadzone: 0, x: 1, y: 0 }, { ...input.createInputBinding('pen-tilt', 'y'), deadzone: 0, x: 0, y: 1 }]),
    input.createInputAction('Twist', 'axis', [{ ...input.createInputBinding('pen-twist', 'twist'), deadzone: 0 }]),
    input.createInputAction('Erase', 'button', [input.createInputBinding('pen-button', 'eraser')])
  ]
  penManager.onPointerDown({ pointerType: 'pen', pointerId: 17, clientX: 120, clientY: 80, pressure: .6, tiltX: 45, tiltY: -45, twist: 180, buttons: 32, button: 5 })
  const penDown = penManager.sample(penActions)
  const penIdentity = penDown.devices.find(item => item.kind === 'pen')
  check('V2608-PEN-BEHAVIOR', Math.abs(penDown.axes.Pressure - .6) < 1e-9 && Math.abs(penDown.vectors.Tilt[0] - .5) < 1e-9 && Math.abs(penDown.vectors.Tilt[1] + .5) < 1e-9 && Math.abs(penDown.axes.Twist - 180 / 359) < 1e-9 && penDown.down.Erase && penIdentity?.id === 'pen:0' && penIdentity.mapping === 'pointer' && input.inputPromptState.modality === 'pen', 'A real pen event drives pressure, normalized 2D tilt, twist, eraser, identity and prompt modality.', { pressure: penDown.axes.Pressure, tilt: penDown.vectors.Tilt, twist: penDown.axes.Twist })
  penManager.onPointerCancel({ pointerType: 'pen', pointerId: 17, clientX: 120, clientY: 80 })
  const penReleased = penManager.sample(penActions)
  check('V2608-PEN-CANCEL', !penReleased.down.Erase && penReleased.released.Erase, 'Pointer cancellation releases the pen action on the next deterministic sample instead of leaving a held eraser/button.')

  const keyboardManager = new input.InputManager()
  keyboardManager.onKeyDown({ target: null, code: 'KeyQ', key: 'a', repeat: false, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })
  const keyboardSnapshot = keyboardManager.sample([
    input.createInputAction('Logical', 'button', [input.createInputBinding('keyboard', 'a')]),
    input.createInputAction('Physical', 'button', [input.createInputBinding('physical-key', 'KeyQ')]),
    input.createInputAction('Legacy', 'button', [input.createInputBinding('keyboard', 'KeyQ')])
  ])
  check('V2608-KEY-LAYOUTS', keyboardSnapshot.down.Logical && keyboardSnapshot.down.Physical && keyboardSnapshot.down.Legacy, 'Logical event.key and physical event.code bindings are distinct while legacy keyboard code bindings remain compatible.')
  keyboardManager.onPageHide()
  const lifecycleSnapshot = keyboardManager.sample([input.createInputAction('Logical', 'button', [input.createInputBinding('keyboard', 'a')])])
  keyboardManager.onKeyDown({ target: null, code: 'KeyQ', key: 'a', repeat: false, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })
  keyboardManager.sample([input.createInputAction('Logical', 'button', [input.createInputBinding('keyboard', 'a')])])
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden: true } })
  keyboardManager.onVisibilityChange()
  const hiddenSnapshot = keyboardManager.sample([input.createInputAction('Logical', 'button', [input.createInputBinding('keyboard', 'a')])])
  check('V2608-LIFECYCLE-RELEASE', !lifecycleSnapshot.down.Logical && lifecycleSnapshot.released.Logical && !hiddenSnapshot.down.Logical && hiddenSnapshot.released.Logical, 'Page-hide and hidden-document lifecycles release transient keys while retaining prior action state long enough to report a release.')

  const gamepadManager = new input.InputManager()
  const gamepadAction = input.createInputAction('Aim', 'axis', [
    { ...input.createInputBinding('gamepad-axis', '0'), deadzone: 0 },
    { ...input.createInputBinding('gamepad-axis', '1'), deadzone: 0 },
    input.createInputBinding('gamepad-button', '0')
  ])
  const pad = (axis) => ({ id: 'Xbox Test Pad', index: 0, connected: true, mapping: 'standard', axes: [axis, 0], buttons: [{ pressed: false, touched: false, value: 0 }], timestamp: 1, vibrationActuator: null })
  input.setInputModality('mouse')
  gamepads = [null, pad(.08)]; gamepadReads = 0
  gamepadManager.sample([gamepadAction])
  const driftStayedMouse = input.inputPromptState.modality === 'mouse', readsForThreeBindings = gamepadReads
  gamepads = [null, pad(.8)]
  gamepadManager.sample([gamepadAction])
  check('V2608-GAMEPAD-ACTIVITY', driftStayedMouse && input.inputPromptState.modality === 'gamepad' && readsForThreeBindings === 1, 'Stick drift does not steal prompt modality, meaningful movement does, and a sample reads the Gamepad API once regardless of binding count.', { apiReads: readsForThreeBindings, driftStayedMouse, finalModality: input.inputPromptState.modality })

  const normalizedDevices = input.normalizeInputDeviceIdentities([
    { id: '  Stylus  ', kind: 'pen', index: 999, connected: true, mapping: '' },
    { id: '', kind: 'invalid', index: -3, connected: false, mapping: '' }
  ])
  const recording = input.normalizeInputRecording({ version: 1, frames: [{ time: 0, snapshot: { devices: [{ id: 'mouse:0', kind: 'mouse', index: 0, connected: true, mapping: 'pointer' }] } }] })
  check('V2608-DEVICE-IDENTITY', normalizedDevices[0].id === 'Stylus' && normalizedDevices[0].kind === 'pen' && normalizedDevices[0].index === 63 && normalizedDevices[0].mapping === 'pointer' && normalizedDevices[1].kind === 'keyboard' && normalizedDevices[1].index === 0 && recording.version === 1 && recording.frames[0].snapshot.devices[0].kind === 'mouse', 'Device identities are finite, bounded and canonical, while version-1 recordings and existing identities retain their format.')

  const settings = device.normalizeDeviceInputSettings({ sensorFrequency: 999, virtualControls: [{ id: 'jump', action: 'Jump', label: 'Jump', accessibleLabel: '  Jump without sight  ', kind: 'button', anchor: 'bottom-right' }] })
  check('V2608-SENSOR-FREQUENCY', settings.sensorFrequency === 120 && Math.abs(device.sensorSampleIntervalMs(120) - 1000 / 120) < 1e-9 && device.sensorSampleDue(-Infinity, 0, 120) && !device.sensorSampleDue(0, 8, 120) && device.sensorSampleDue(0, 8.34, 120), 'Sensor frequency is bounded to 1–120 Hz and drives a monotonic sampling gate rather than an inert setting.')
  check('V2608-ACCESSIBLE-LABEL', settings.virtualControls[0].accessibleLabel === 'Jump without sight', 'A separately persisted accessible control name survives normalization and remains independent from its visual label.')

  const deduplicator = new device.TouchPointerDeduplicator()
  deduplicator.recordPointer(1_000, 10, 10)
  check('V2608-POINTER-COMPATIBILITY', !deduplicator.acceptMouse(1_020, 12, 12) && deduplicator.acceptMouse(2_000, 12, 12), 'Pen/touch compatibility mouse events are rejected briefly without suppressing later real mouse input.')

  const prompt = input.inputPromptForAction('Pressure', penActions, 'pen')
  check('V2608-PEN-PROMPT', prompt.modality === 'pen' && prompt.bindingCode === 'pressure' && prompt.symbol === 'Pressure' && prompt.accessibleLabel.includes('pen'), 'Pen bindings produce a readable visual and accessible prompt descriptor.')

  const panel = await readFile(join(root, 'src/components/DeviceInputPanel.vue'), 'utf8')
  check('V2608-AUTHORING-WIRING', panel.includes('v-model.trim="control.accessibleLabel"') && panel.includes('logical-keyboard') && panel.includes('physical-keyboard') && panel.includes("bindPen('pen-pressure','pressure')") && panel.includes('deviceInputSettings.sensorFrequency'), 'The authoring panel exposes accessible names, explicit logical/physical key capture, pen channels and sensor sampling frequency.')
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const failed = checks.filter(item => item.status === 'failed')
const machineVersion = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version
check('V2608-MACHINE-AUTHORITY', machineVersion === '26.8.0', 'The focused input evidence belongs to the 26.08 machine authority rather than a stale build.')
const finalFailed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.08-platform-input-verification', version: 1, release, engineVersion: machineVersion, generatedAt: new Date().toISOString(), checks, severity0Open: finalFailed.length, severity1Open: 0, status: finalFailed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.08-platform-input.json'), `${JSON.stringify(report, null, 2)}\n`)
if (finalFailed.length) { console.error(finalFailed); process.exit(1) }
console.log(`Nova_A ${release} platform input verification passed: ${checks.length} behavioral checks.`)
