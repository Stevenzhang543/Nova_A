import { spawn } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertReleaseSourceVersions, releaseVersion } from './release-source-snapshot.mjs'
import { confinedPath, fileRecord, filesBelow, writeJson } from './release-qualification.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
export const FOCUS_26_12 = [
  ['scripts/verify-v26.12-language.mjs', ['--report=release-audits/v26.12-language.json'], 'release-audits/v26.12-language.json'],
  ['scripts/verify-v26.12-language-editor.mjs', ['--report=release-audits/v26.12-language-editor.json'], 'release-audits/v26.12-language-editor.json'],
  ['scripts/verify-v26.12-api-signatures.mjs', ['--report=release-audits/v26.12-api-signatures.json'], 'release-audits/v26.12-api-signatures.json'],
  ['scripts/verify-v26.12-typed-graphs.mjs', [], 'release-audits/v26.12-typed-graphs.json'],
  ['scripts/verify-v26.12-syntax-slots.mjs', [], 'release-audits/v26.12-syntax-slots.json'],
  ['scripts/verify-v26.12-script-ui.mjs', [], 'release-audits/v26.12-script-ui.json'],
  ['scripts/verify-v26.12-script-modules.mjs', [], 'release-audits/v26.12-script-modules.json'],
  ['scripts/verify-v26.11-visual-roundtrip.mjs', [`--runtime=target/debug/examples/nova_script_test${process.platform === 'win32' ? '.exe' : ''}`], 'release-audits/v26.11-visual-roundtrip.json'],
  ['scripts/verify-v26.12-release-tooling.mjs', [], null]
]
export function summarizeProductEvidence(evidence) {
  if (!evidence.length || evidence.some(item => item.report?.status !== 'passed')) throw new Error('Product evidence includes missing or failed gate results.')
  return {
    evaluatedGateReports: evidence.map(item => ({ path: item.path, status: item.report.status })),
    globalDefectCount: null,
    globalDefectAssessment: 'Unknown: evaluated gate results do not constitute an exhaustive issue inventory or prove that all code and user workflows are free of errors.'
  }
}
export async function executeMilestoneGate(release, gate, settings = {}) {
  const machineVersion = releaseVersion(release)
  if (Number(release.replace('.', '')) < 2612) throw new Error('Use this runner only for release 26.12 or later.')
  await assertReleaseSourceVersions(root, release)
  const audits = join(root, 'release-audits'); await mkdir(audits, { recursive: true })
  const commands = [], childReports = [], startedAt = new Date().toISOString()
  const run = async (file, args, environment = {}) => {
    const command = { file, args, startedAt: new Date().toISOString() }; commands.push(command)
    console.log(`Execute ${file} ${args.join(' ')}`)
    const env = { ...process.env, ...environment }
    if (environment.PATH) for (const key of Object.keys(env)) if (key !== 'PATH' && key.toLowerCase() === 'path') delete env[key]
    const child = spawn(file, args, { cwd: root, shell: false, windowsHide: true, env, stdio: ['ignore', 'inherit', 'inherit'] })
    const status = await new Promise((resolveResult, reject) => { child.once('error', reject); child.once('exit', (exitCode, signal) => resolveResult({ exitCode, signal })) })
    Object.assign(command, status, { generatedAt: new Date().toISOString() })
    if (status.exitCode !== 0) throw new Error(`${file} failed with exit ${status.exitCode}, signal ${status.signal}.`)
  }
  const node = (script, args = [], environment = {}) => run(process.execPath, [confinedPath(root, script), ...args], environment)
  const takeReport = async (path, after) => {
    const full = confinedPath(root, path), info = await stat(full), value = JSON.parse(await readFile(full, 'utf8'))
    if (info.mtimeMs + 1000 < Date.parse(after) || value.status !== 'passed') throw new Error(`Child report did not pass freshly: ${path}`)
    childReports.push({ ...await fileRecord(root, path), capturedAt: new Date().toISOString(), report: value })
    return value
  }
  const runReport = async (script, path, args = [], environment = {}) => { const before = new Date().toISOString(); await node(script, args, environment); return takeReport(path, before) }
  const write = async (suffix, format, details = {}) => {
    const report = { format, version: 1, release, engineVersion: machineVersion, generatedAt: new Date().toISOString(), startedAt, status: 'passed', commands, childReports, ...details }
    await writeJson(join(audits, `v${release}-${suffix}.json`), report)
    return report
  }
  const currentReference = settings.gameReference ?? `creator-v${release.replace('.', '')}-mixed-game`
  switch (gate) {
    case 'native-build': {
      if (!settings.pnpmEntry) throw new Error('Native build requires --pnpm-entry=<pinned pnpm JavaScript entry point>.')
      const nodePin = (await readFile(join(root, '.node-version'), 'utf8')).trim(), pnpmPackage = JSON.parse(await readFile(join(dirname(resolve(settings.pnpmEntry)), '../package.json'), 'utf8'))
      const packageManager = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).packageManager
      if (process.versions.node !== nodePin || packageManager !== `pnpm@${pnpmPackage.version}`) throw new Error(`Use exact pinned tools: Node ${nodePin}, ${packageManager}; current Node ${process.versions.node}, pnpm ${pnpmPackage.version}.`)
      if (!settings.pnpmBin) throw new Error('Provide --pnpm-bin=<directory containing the pinned pnpm.cmd> so Tauri beforeBuildCommand inherits the same package manager.')
      await stat(join(settings.pnpmBin, process.platform === 'win32' ? 'pnpm.CMD' : 'pnpm'))
      const buildEnvironment = { PATH: [dirname(process.execPath), resolve(settings.pnpmBin), process.env.PATH ?? process.env.Path ?? ''].join(delimiter) }
      await run(process.execPath, [resolve(settings.pnpmEntry), 'run', 'tauri', 'build'], buildEnvironment)
      // Tauri invokes the configured pnpm build, including WASM, typechecking and Vite.
      await run(settings.powershell ?? 'pwsh.exe', ['-NoProfile', '-Command', `. '${join(root, 'scripts/release-policy.ps1').replaceAll("'", "''")}'; Assert-WindowsReleaseArtifactVersions -Portable '${join(root, 'src-tauri/target/release/nova_a.exe').replaceAll("'", "''")}' -Setup '${join(root, `src-tauri/target/release/bundle/nsis/Nova_A_${machineVersion}_x64-setup.exe`).replaceAll("'", "''")}' -Msi '${join(root, `src-tauri/target/release/bundle/msi/Nova_A_${machineVersion}_x64_en-US.msi`).replaceAll("'", "''")}' -MachineVersion '${machineVersion}'`])
      return write('native-build', 'nova-release-native-build-verification', { scope: 'Actual Tauri Windows build and exact portable/NSIS/MSI embedded versions. Installation and clean-machine lifecycle are separate external gates.' })
    }
    case 'typescript':
      await node('node_modules/vue-tsc/bin/vue-tsc.js', ['--noEmit']); await node('node_modules/typescript/bin/tsc', ['--project', 'tsconfig.node.json', '--noEmit'])
      return write('verification', 'nova-release-command-verification', { scope: 'Actual Vue/TypeScript and Node config typechecks; behavioral checks have separate gates.' })
    case 'rust': await run('cargo', ['test', '--workspace', '--all-targets']); return write('rust', 'nova-release-command-verification', { scope: 'Actual Rust workspace and all-target test execution.' })
    case 'rust-lint': await run('cargo', ['fmt', '--all', '--', '--check']); await run('cargo', ['clippy', '--workspace', '--all-targets', '--', '-D', 'warnings']); return write('rust-lint', 'nova-release-command-verification')
    case 'native-rust': await run('cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml']); await run('cargo', ['clippy', '--manifest-path', 'src-tauri/Cargo.toml', '--all-targets', '--', '-D', 'warnings']); return write('native-rust', 'nova-release-command-verification')
    case 'wasm': {
      const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')))
      wasm.initSync({ module: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
      if (wasm.engine_version() !== machineVersion) throw new Error(`Built WASM reports ${wasm.engine_version()}, expected ${machineVersion}.`)
      const vm = new wasm.WasmScriptRuntime()
      try {
        const execution = JSON.parse(vm.execute_json('fn start() { set_position(2.0, 3.0); print("release-vm"); }', 'start', JSON.stringify({ entity: 'release-qualification' })))
        if (!execution.commands.some(command => command.type === 'setPosition' && command.x === 2 && command.y === 3) || !execution.logs.some(log => log.message === 'release-vm')) throw new Error('Built WASM did not execute the actual host command/log probe.')
        for (const body of ['sleep(0);', 'sleep(0.0);', 'Fn("sleep").call(0);', 'Fn("sleep").call(0.0);']) {
          let rejected = false; try { vm.execute_json(`fn start(){ ${body} }`, 'start', JSON.stringify({ entity: 'release-qualification' })) } catch (error) { rejected = /sleep/i.test(String(error)) && !/panic|unreachable/i.test(String(error)) }
          if (!rejected) throw new Error('Built WASM blocking-sleep guard is missing or trapped instead of returning an error.')
        }
      } finally { vm.free() }
      return write('wasm', 'nova-release-wasm-verification', { scope: 'Actual compiled WASM engine identity, host commands/logs, direct and indirect nonblocking sleep rejection.', artifact: await fileRecord(root, 'nova_core/pkg/nova_core_bg.wasm') })
    }
    case 'web': {
      const inventory = await Promise.all((await filesBelow(join(root, 'dist'))).map(path => fileRecord(root, `dist/${path}`)))
      if (!inventory.some(file => file.path === 'dist/index.html') || !inventory.some(file => file.path === 'dist/player.html') || !inventory.some(file => file.path.endsWith('.wasm'))) throw new Error('Production web editor/player/WASM output is incomplete.')
      return write('web', 'nova-release-web-build-verification', { scope: 'Exact production web asset inventory from the preceding Tauri build; browser execution is separately qualified.', inventory })
    }
    case 'focus': {
      const focus = settings.focus?.length ? settings.focus.map(path => [path, [], null]) : release === '26.12' ? FOCUS_26_12 : []
      if (!focus.length) throw new Error(`No implemented focused behavior suite selected for ${release}; supply --focus=<comma-separated authored scripts>.`)
      if (focus.some(([script]) => script === 'scripts/verify-v26.11-visual-roundtrip.mjs')) {
        // Build the exact current source instead of accidentally exercising an old native test executable.
        await run('cargo', ['build', '-p', 'nova_script', '--example', 'nova_script_test', '--target-dir', join(root, 'target')])
      }
      for (const [script, args, report] of focus) { const environment = settings.pnpmEntry ? { NOVA_PNPM_ENTRY: settings.pnpmEntry } : {}; if (report) await runReport(script, report, args, environment); else await node(script, args, environment) }
      return write('focused-verification', 'nova-release-focused-verification', { scope: 'Fresh execution of the explicitly selected milestone behavior suites; retained raw child report versions identify their own scopes.' })
    }
    case 'history': return runReport('scripts/verify-calendar-history.mjs', `release-audits/v${release}-history-verification.json`, [`--release=${release}`, `--engine=${machineVersion}`])
    case 'templates': return runReport('scripts/verify-template-catalog.mjs', 'release-audits/template-catalog-verification.json')
    case 'layout-contract': return runReport('scripts/verify-calendar-layout-contract.mjs', `release-audits/v${release}-layout-contract.json`, [`--release=${release}`, `--engine=${machineVersion}`])
    case 'browser-layout': return runReport(['26.20','26.21','26.22','26.23'].includes(release) ? `scripts/qualify-layout-v${release}.mjs` : 'scripts/qualify-layout-v3.3.mjs', `release-audits/v${release}-layout-browser.json`, [], { NOVA_LAYOUT_VERSION: release, NOVA_LAYOUT_ENGINE_VERSION: machineVersion, NOVA_LAYOUT_REQUIRED_VIEWPORTS: '1024x640,1366x768,1920x1080', NOVA_LAYOUT_REQUIRED_SCALES: '1,1.5,2' })
    case 'user-interactions': {
      const report = await runReport('scripts/verify-v6.0.2-interactions.mjs', `release-audits/v${release}-user-interactions.json`, [], { NOVA_INTERACTION_VERSION: release, NOVA_INTERACTION_ENGINE_VERSION: machineVersion, NOVA_INTERACTION_OUTPUT: `v${release}-user-interactions.json` })
      const authoring = settings.authoring ?? (release === '26.12' ? 'scripts/verify-v26.12-authoring.mjs' : '')
      if (!authoring) throw new Error(`No implemented ${release} milestone user-authoring suite selected. Supply --authoring=<script>.`)
      // The common harness remains raw evidence; the current authoring script must itself exercise browser controls.
      await node(authoring)
      const authoringPath = settings.authoringReport ?? `release-audits/v${release}-authoring.json`
      await takeReport(authoringPath, commands.at(-1).startedAt)
      const authoringReports = [authoringPath]
      if (release === '26.12') {
        for (const mode of ['code', 'visual']) {
          const path = `release-audits/v26.12-${mode}-game.json`
          await runReport(`scripts/verify-v26.12-${mode}-game.mjs`, path)
          authoringReports.push(path)
        }
      }
      const combined = { ...report, generatedAt: new Date().toISOString(), additionalBehaviorReports: childReports.filter(item => authoringReports.includes(item.path)), qualificationCommands: commands }
      await writeJson(join(audits, `v${release}-user-interactions.json`), combined)
      return combined
    }
    case 'windows': {
      const report = await runReport('scripts/verify-v6.2.0-windows.mjs', `release-audits/v${machineVersion}-windows-smoke.json`, [], { NOVA_WINDOWS_VERSION: machineVersion, NOVA_WINDOWS_REFERENCE: currentReference })
      await writeJson(join(audits, `v${release}-windows-smoke.json`), report); return report
    }
    case 'headless': return runReport('scripts/verify-v26.07-headless.mjs', `release-audits/v${release}-headless-smoke.json`, [], { NOVA_HEADLESS_RELEASE: release, NOVA_HEADLESS_ENGINE_VERSION: machineVersion, NOVA_HEADLESS_REFERENCE: settings.headlessReference ?? `server-v${release.replace('.', '')}-headless-authority`, NOVA_HEADLESS_GAME_NAME: settings.headlessName ?? `Nova ${release} Headless Authority` })
    case 'performance': return runReport('scripts/benchmark-v3.mjs', `release-audits/v${release}-benchmarks.json`, [`--engine-version=${machineVersion}`, `--output=release-audits/v${release}-benchmarks.json`])
    case 'stability': return runReport('scripts/stability-v3.mjs', `release-audits/v${release}-stability-smoke.json`, [`--engine-version=${machineVersion}`, '--duration-hours=0', '--cycles=1000', `--output=release-audits/v${release}-stability-smoke.json`])
    case 'security': {
      const report = await runReport('scripts/audit-dependencies-v6.9.0.mjs', `release-audits/v${machineVersion}-dependency-audit.json`, [], { NOVA_DEPENDENCY_AUDIT_VERSION: machineVersion })
      await writeJson(join(audits, `v${release}-dependency-audit.json`), report); return report
    }
    case 'hygiene': return runReport('scripts/audit-repository-hygiene.mjs', 'release-audits/repository-hygiene.json')
    case 'manual': await node('scripts/audit-manual.mjs'); return write('manual-audit', 'nova-release-manual-verification', { scope: 'Existing complete English/German/Chinese manual, anchors, component/task coverage and current public/machine authority checks.' })
    case 'product': {
      const required = ['verification', 'focused-verification', 'history-verification', 'layout-contract', 'layout-browser', 'user-interactions', 'windows-smoke', 'headless-smoke', 'dependency-audit', 'benchmarks', 'stability-smoke', 'manual-audit']
      for (const suffix of required) {
        const path = `release-audits/v${release}-${suffix}.json`, report = JSON.parse(await readFile(join(root, path), 'utf8'))
        if (report.status !== 'passed' || report.engineVersion !== machineVersion || report.release !== undefined && report.release !== release) throw new Error(`Product prerequisite failed or stale: ${path}`)
        childReports.push({ ...await fileRecord(root, path), report })
      }
      for (const path of ['release-audits/template-catalog-verification.json', 'release-audits/repository-hygiene.json']) {
        const report = JSON.parse(await readFile(join(root, path), 'utf8')); if (report.status !== 'passed' || report.engineVersion !== undefined && report.engineVersion !== machineVersion) throw new Error(`Product prerequisite failed: ${path}`); childReports.push({ ...await fileRecord(root, path), report })
      }
      const vueFiles = (await filesBelow(join(root, 'src'))).filter(path => path.endsWith('.vue'))
      if (vueFiles.length < 65) throw new Error('Active Vue panel inventory is unexpectedly incomplete.')
      for (const reference of [currentReference, settings.headlessReference ?? `server-v${release.replace('.', '')}-headless-authority`]) for (const file of ['project.nova', 'README.md', 'expected-output.json', 'test-controls.json']) { const record = await fileRecord(root, `reference-projects/projects/${reference}/${file}`); if (!record.bytes) throw new Error(`Empty current reference file: ${record.path}`) }
      const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')), roadmap = await readFile(join(root, Number(release.split('.')[1]) >= 21 ? 'docs/ROADMAP_26_21_TO_26_30.md' : 'docs/ROADMAP_26_11_TO_26_20.md'), 'utf8')
      if (!roadmap.includes(`## ${release}`) || !pkg.scripts['verify:templates']) throw new Error('Current milestone roadmap or template gate is missing.')
      return write('product-audit', 'nova-release-product-audit', { scope: 'Current authority, retained authored panels/references and actual prerequisite reports. Source inventory and command success do not replace independent user observation.', vuePanels: vueFiles, ...summarizeProductEvidence(childReports), externalCertificationComplete: false })
    }
    default: throw new Error(`Unknown milestone gate: ${gate}`)
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await executeMilestoneGate(option('release'), option('gate'), { pnpmEntry: option('pnpm-entry'), pnpmBin: option('pnpm-bin'), powershell: option('powershell'), gameReference: option('game-reference'), headlessReference: option('headless-reference'), headlessName: option('headless-name'), focus: option('focus')?.split(','), authoring: option('authoring'), authoringReport: option('authoring-report') })
  console.log(JSON.stringify({ release: option('release'), gate: option('gate'), status: result.status }))
}
