/** 仓库工具模块 generate-rhai-api-signatures.mjs：供构建、资料生成或验证流程调用。 */
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createApiInventory } from './lib/rhaiApiInventory.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-rhai-metadata-'))
const source = await readFile(join(root, 'crates/nova_script/src/lib.rs'), 'utf8')
const lock = await readFile(join(root, 'Cargo.lock'), 'utf8')
const version = /name = "rhai"\r?\nversion = "([^"]+)"/.exec(lock)?.[1]
const bindingVersion = /name = "wasm-bindgen"\r?\nversion = "([^"]+)"/.exec(lock)?.[1]
if (!version) throw new Error('Cargo.lock does not identify the actual Rhai version.')
const packages = { LanguageCorePackage: 'lang_core', ArithmeticPackage: 'arithmetic', BasicFnPackage: 'fn_basic', BasicStringPackage: 'string_basic', BasicIteratorPackage: 'iter_basic', BitFieldPackage: 'bit_field', LogicPackage: 'logic', BasicMathPackage: 'math_basic', BasicArrayPackage: 'array_basic', BasicBlobPackage: 'blob_basic', BasicMapPackage: 'map_basic', BasicTimePackage: 'time_basic', MoreStringPackage: 'string_more' }
const run = /** 结构说明（自动提取）：run；输入 command、args；直接调用 Promise；返回表达式求值结果。 */ (command, args) => new Promise(/** 结构说明（自动提取）：匿名回调；输入 resolve、reject；直接调用 spawn、join、child.stdout.on、child.stderr.on、child.on。 */ (resolve, reject) => {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, CARGO_TARGET_DIR: join(root, 'target/rhai-api-metadata'), CARGO_NET_OFFLINE: 'true' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = ''; child.stdout.on('data', /** 结构说明（自动提取）：child.stdout.on 回调；输入 value；写入 stdout。 */ value => { stdout += value }); child.stderr.on('data', /** 结构说明（自动提取）：child.stderr.on 回调；输入 value；直接调用 process.stderr.write；写入 stderr。 */ value => { stderr += value; process.stderr.write(value) }); child.on('error', reject)
  child.on('close', /* 根据 code === 0 的真假，分别返回 resolve(stdout) 或 reject(new Error(`${command} exited ${code}: ${stderr}`))。 */ code => code === 0 ? resolve(stdout) : reject(new Error(`${command} exited ${code}: ${stderr}`)))
})
try {
  await mkdir(join(temporary, 'src'))
  await writeFile(join(temporary, 'Cargo.toml'), `[package]\nname="nova_rhai_metadata_audit"\nversion="0.0.0"\nedition="2021"\n[lib]\ncrate-type=["cdylib","rlib"]\n[dependencies]\nrhai={version="=${version}",default-features=false,features=["std","metadata"]}\nserde={version="1",features=["derive"]}\nserde_json="1"\nwasm-bindgen="=${bindingVersion}"\n`)
  await writeFile(join(temporary, 'Cargo.lock'), lock)
  await writeFile(join(temporary, 'src/lib.rs'), source + `\n#[wasm_bindgen::prelude::wasm_bindgen]\npub fn metadata_json() -> String {\n use rhai::packages::Package;\n let engine = engine_with_host(&ScriptContext::default(), Rc::new(RefCell::new(HostOutput::default())));\n let host: Value = serde_json::from_str(&engine.gen_fn_metadata_to_json(false).unwrap()).unwrap();\n let all: Value = serde_json::from_str(&engine.gen_fn_metadata_to_json(true).unwrap()).unwrap();\n let mut packages=serde_json::Map::new();\n${Object.keys(packages).map(/** 结构说明（自动提取）：map 回调；输入 name；返回表达式求值结果。 */ name => `{let mut engine=Engine::new_raw(); engine.register_global_module(rhai::packages::${name}::new().as_shared_module()); packages.insert("${name}".into(),serde_json::from_str::<Value>(&engine.gen_fn_metadata_to_json(true).unwrap()).unwrap());}`).join('\n')}\n serde_json::json!({"host":host,"all":all,"packages":packages}).to_string()\n}\n`)
  await writeFile(join(temporary, 'src/main.rs'), 'fn main(){println!("{}",nova_rhai_metadata_audit::metadata_json());}\n')
  const result = await run('cargo', ['run', '--offline', '--quiet', '--manifest-path', join(temporary, 'Cargo.toml'), '--target-dir', join(root, 'target/rhai-api-metadata')])
  const metadata = JSON.parse(result)
  const output = join(root, 'target/rhai-api-metadata/wasm')
  const bindingTool = process.argv.find(/* 调用 value.startsWith('--wasm-bindgen=') 并返回调用结果。 */ value => value.startsWith('--wasm-bindgen='))?.slice(15) ?? 'wasm-bindgen'
  const installedBinding = await run(bindingTool, ['--version'])
  if (!installedBinding.includes(bindingVersion)) throw new Error(`wasm-bindgen ${bindingVersion} is required; found ${installedBinding.trim()}.`)
  await run('cargo', ['build', '--offline', '--quiet', '--manifest-path', join(temporary, 'Cargo.toml'), '--lib', '--target', 'wasm32-unknown-unknown', '--target-dir', join(root, 'target/rhai-api-metadata')])
  await run(bindingTool, ['--target', 'nodejs', '--out-dir', output, '--out-name', 'nova_rhai_metadata', join(root, 'target/rhai-api-metadata/wasm32-unknown-unknown/debug/nova_rhai_metadata_audit.wasm')])
  await writeFile(join(output, 'package.json'), '{"type":"commonjs"}\n')
  const wasmMetadata = JSON.parse(createRequire(import.meta.url)(join(output, 'nova_rhai_metadata.js')).metadata_json())
  const evidence = { rhaiVersion: version, sourceHash: createHash('sha256').update(source).digest('hex'), native: metadata, wasm: wasmMetadata }
  await writeFile(join(root, 'target/rhai-api-metadata/metadata.json'), JSON.stringify(evidence, null, 2))
  const inventory = createApiInventory({ ...evidence, source, manifest: await readFile(join(root, 'src/editor/scriptApi.ts'), 'utf8'), packageFiles: packages })
  await writeFile(join(root, 'src/visual/rhaiApiSignatures.generated.json'), JSON.stringify(inventory, null, 2) + '\n')
  console.log(JSON.stringify({ rhaiVersion: version, host: inventory.signatures.filter(/* 比较 item.origin 与 'host'，返回严格相等的判断结果。 */ item => item.origin === 'host').length, signatures: inventory.signatures.length, packages: inventory.packages.length, path: 'src/visual/rhaiApiSignatures.generated.json' }))
} finally { await rm(temporary, { recursive: true, force: true }) }
