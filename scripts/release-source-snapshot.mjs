// 发布源码快照：按排除规则收集实际文件，校验版本和摘要，再原子发布不可覆盖的候选快照。
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// 将公开的 YY.SS 发布序号转换为机器版本；拒绝格式不符、早于 26 年或序号为零的输入。
export function releaseVersion(label) {
  const match = /^(\d{2})\.(\d{2})$/.exec(label ?? '')
  if (!match || Number(match[1]) < 26 || Number(match[2]) < 1) throw new Error('Use a release sequence YY.SS with year 26–99 and sequence 01–99.')
  return `${Number(match[1])}.${Number(match[2])}.0`
}

// 判断相对路径是否必须排除：拒绝越界路径、依赖、构建输出、第三方源码和本机凭据；保留 .env.example。
export function excludedReleaseSource(path) {
  const normalized = String(path).replaceAll('\\', '/'), parts = normalized.toLowerCase().split('/'), first = parts[0], name = parts.at(-1)
  if (!normalized || normalized.startsWith('/') || parts.some(/* 先计算 !part || part === '.'；仅当其为假值时求右侧 part === '..'，返回短路求值结果。 */ part => !part || part === '.' || part === '..') || /^[a-z]:/i.test(normalized)) return true
  if (first.startsWith('stage') || first === 'godot-master' || ['.git', '.agents', '.codex', '.ssh', '.aws', '.azure', '.kube', '.pnpm-store', '.vscodecounter', '.vite', '.cache', '.turbo', '.vscode', '.idea', 'dist', 'dist-ssr', 'node_modules', 'release-audits', 'releases', 'target', 'coverage', 'playwright-report', 'test-results', 'logs'].includes(first)) return true
  if (parts.some(/* 任一目录段属于本地缓存或工具输出时，将整条路径排除。 */ part => ['node_modules', '.git', '.cache', '.pnpm-store', '.vite', '.turbo', '.vscode', '.idea', 'coverage', 'playwright-report', 'test-results'].includes(part)) || /^(?:src-tauri|nova_core)\/target(?:\/|$)|^src-tauri\/gen(?:\/|$)|^nova_core\/pkg(?:\/|$)/i.test(normalized)) return true
  if (normalized.toLowerCase() === 'instructions.txt' || ['.ds_store', 'thumbs.db', 'desktop.ini', '.npmrc', '.pypirc', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'].includes(name)) return true
  if (/^\.env(?:\..+)?$/.test(name) && name !== '.env.example') return true
  return /^(?:credentials?|secrets?)(?:\..+)?\.json$|^(?:npm|yarn|pnpm|lerna)-debug\.log|\.(?:log|tsbuildinfo|tmp|temp|local|pem|pfx|p12|key|suo|ntvs\w*|njsproj|sln)$|\.sw.$/i.test(name)
}

const hash = /* 调用 createHash('sha256').update(value).digest('hex') 并返回调用结果。 */ value => createHash('sha256').update(value).digest('hex')
export const sourceDigest = /* 调用 hash(entries.map(entry => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join('')) 并返回调用结果。 */ entries => hash(entries.map(/** 以路径、哈希及字节数编码清单条目，使用空字符分隔防止字段歧义。 */ entry => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''))

// 递归读取真实普通文件并记录字节数和 SHA-256；不跟随符号链接，最后按路径排序以得到稳定摘要。
export async function releaseSourceInventory(root) {
  const entries = []
  // 遍历当前目录，把相对于根目录的路径写入清单；任何读取失败向上传播，避免生成不完整快照。
  const visit = async (directory, prefix = '') => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}${item.name}`
      if (excludedReleaseSource(path) || item.isSymbolicLink()) continue
      if (item.isDirectory()) await visit(join(directory, item.name), `${path}/`)
      else if (item.isFile()) { const bytes = await readFile(join(root, path)); entries.push({ path, bytes: bytes.length, sha256: hash(bytes) }) }
    }
  }
  await visit(root)
  return entries.sort(/* 根据 a.path < b.path 的真假，分别返回 -1 或 a.path > b.path ? 1 : 0。 */ (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
}

// 核对前后端、Cargo 清单和锁文件中的版本权威值；任何缺失或不一致都阻止冻结源码。
export async function assertReleaseSourceVersions(root, release) {
  const expected = releaseVersion(release), read = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')
  const authorities = [
    ['package.json', JSON.parse(await read('package.json')).version],
    ['src-tauri/tauri.conf.json', JSON.parse(await read('src-tauri/tauri.conf.json')).version],
    ['Cargo.toml', (await read('Cargo.toml')).match(/\[workspace\.package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]],
    ['src-tauri/Cargo.toml', (await read('src-tauri/Cargo.toml')).match(/\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]],
    ['src/projects/projectFormat.ts', (await read('src/projects/projectFormat.ts')).match(/NOVA_ENGINE_VERSION\s*=\s*'([^']+)'/)?.[1]],
    ['crates/nova_format/src/lib.rs', (await read('crates/nova_format/src/lib.rs')).match(/CURRENT_ENGINE_VERSION:\s*&str\s*=\s*"([^"]+)"/)?.[1]]
  ]
  const frontend = await read('src/projects/projectFormat.ts')
  if (frontend.match(/NOVA_RELEASE_NAME\s*=\s*'([^']+)'/)?.[1] !== release) throw new Error('Frontend public release label does not match the requested snapshot.')
  for (const path of ['Cargo.lock', 'src-tauri/Cargo.lock']) {
    const matches = [...(await read(path)).matchAll(/^name = "(nova_[^"]+)"\r?\nversion = "([^"]+)"/gm)]
    if (matches.length < (path === 'Cargo.lock' ? 7 : 1)) throw new Error(`Missing Nova_A lockfile authorities in ${path}.`)
    authorities.push(...matches.map(/* 返回按声明顺序构造的数组 [`${path}:${match[1]}`, match[2]]。 */ match => [`${path}:${match[1]}`, match[2]]))
  }
  const mismatches = authorities.filter(/* 比较 version 与 expected，返回严格不等的判断结果。 */ ([, version]) => version !== expected)
  if (mismatches.length) throw new Error(`Release authorities must all identify ${expected}: ${JSON.stringify(mismatches)}`)
  return expected
}

// 验证清单结构、版本和聚合摘要，再重新枚举指定工作区或快照目录；文件增删改均使验证失败。
export async function verifyReleaseSnapshot(manifestPath, sourceRoot) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.format !== 'nova-release-source-snapshot' || manifest.version !== 1 || releaseVersion(manifest.release) !== manifest.machineVersion || !Array.isArray(manifest.sourceInputs) || sourceDigest(manifest.sourceInputs) !== manifest.sourceInputDigest) throw new Error('Invalid source snapshot manifest.')
  const root = sourceRoot ?? join(dirname(manifestPath), 'source')
  await assertReleaseSourceVersions(root, manifest.release)
  const actual = await releaseSourceInventory(root)
  if (sourceDigest(actual) !== manifest.sourceInputDigest || JSON.stringify(actual) !== JSON.stringify(manifest.sourceInputs)) throw new Error('Source changed after the release snapshot; do not reuse its builds or evidence.')
  return manifest
}

// 在工作区缓存内暂存候选源码，复制前后双重验证内容；最终重命名发布，已有候选不可覆盖，失败清理暂存目录。
export async function createReleaseSnapshot(rootInput, release, candidate = '') {
  if (candidate && !/^[a-z0-9][a-z0-9-]{0,47}$/.test(candidate)) throw new Error('Candidate IDs must contain 1–48 lowercase letters, digits or hyphens.')
  const root = await realpath(rootInput), machineVersion = await assertReleaseSourceVersions(root, release)
  const snapshots = join(root, '.cache', 'release-snapshots')
  await mkdir(snapshots, { recursive: true })
  if (!(await realpath(snapshots)).startsWith(`${root}${sep}`)) throw new Error('Snapshot directory escapes the project root.')
  const final = join(snapshots, `v${release}${candidate ? `-${candidate}` : ''}`)
  try { await lstat(final); throw new Error(`Immutable release snapshot already exists: ${final}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const staging = join(snapshots, `.v${release}-staging-${randomUUID()}`)
  await mkdir(join(staging, 'source'), { recursive: true })
  try {
    const entries = await releaseSourceInventory(root)
    for (const entry of entries) {
      const input = join(root, entry.path), metadata = await lstat(input)
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`Source type changed while freezing ${entry.path}.`)
      const bytes = await readFile(input)
      if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new Error(`Source changed while freezing ${entry.path}.`)
      const target = join(staging, 'source', entry.path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: 'wx' })
    }
    const manifest = { format: 'nova-release-source-snapshot', version: 1, release, machineVersion, generatedAt: new Date().toISOString(), sourceInputDigest: sourceDigest(entries), sourceInputs: entries, policy: 'Filesystem source including uncommitted/untracked authored files; generated outputs, local caches, credentials and links excluded. Builds and evidence must bind to this digest.' }
    await writeFile(join(staging, 'snapshot.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
    await verifyReleaseSnapshot(join(staging, 'snapshot.json'), root)
    await verifyReleaseSnapshot(join(staging, 'snapshot.json'))
    // 在原子重命名前再次检查，防止并发候选覆盖已经冻结的版本。
    try { await lstat(final); throw new Error(`Immutable release snapshot already exists: ${final}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
    await rename(staging, final)
    return { directory: final, source: join(final, 'source'), manifest: join(final, 'snapshot.json'), sourceInputDigest: manifest.sourceInputDigest, files: entries.length }
  } finally { await rm(staging, { recursive: true, force: true }) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = /* 调用 process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) 并返回调用结果。 */ name => process.argv.find(/* 调用 value.startsWith(`--${name}=`) 并返回调用结果。 */ value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
  const root = resolve(option('root') ?? dirname(dirname(fileURLToPath(import.meta.url))))
  const verify = option('verify')
  const manifest = verify ? await verifyReleaseSnapshot(resolve(verify), root) : null
  const result = manifest ? { release: manifest.release, machineVersion: manifest.machineVersion, sourceInputDigest: manifest.sourceInputDigest, files: manifest.sourceInputs.length, status: 'passed' } : await createReleaseSnapshot(root, option('release'), option('candidate'))
  console.log(JSON.stringify(result, null, 2))
}
