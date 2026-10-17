/** 版本审计与用户夹具辅助库，区分开发证据和实际资格。 */
import {spawnSync} from 'node:child_process'
import {existsSync,readFileSync} from 'node:fs'
import {mkdir} from 'node:fs/promises'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

/** 按脚本是否位于集成仓库解析26.14审计源码、报告、缓存和构建目标目录。 */ export function runtimeAudit14Paths(scriptUrl) {
  const stage=dirname(dirname(fileURLToPath(scriptUrl))),integrated=existsSync(join(stage,'package.json')),root=integrated?stage:resolve(stage,'../..')
  const authority=JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
  const reportDir=integrated?join(root,'release-audits'):join(stage,'reports')
  return {stage,root,integrated,reportDir,sourceRoot:integrated?root:stage,cacheDir:integrated?join(root,'.cache/verification-v26.14'):stage,targetDir:integrated?join(root,'target'):join(stage,'target'),metadata:{milestone:'26.14',engineVersion:authority.version,sourceMode:integrated?'integrated':'isolated-overlay'}}
}

/** 仅离线构建允许的脚本运行时示例，检查退出状态和实际可执行产物。 */ export async function buildRuntimeAudit14Example(paths,name) {
  if(!['runtime_bridge','nova_script_test'].includes(name))throw Error('Unsupported runtime audit example: '+name)
  await mkdir(paths.reportDir,{recursive:true})
  const args=['build','--manifest-path',join(paths.sourceRoot,'Cargo.toml'),'--target-dir',paths.targetDir,'--offline','-p','nova_script','--example',name]
  const result=spawnSync('cargo',args,{cwd:paths.root,encoding:'utf8',timeout:180_000,maxBuffer:32*1024*1024,windowsHide:true})
  if(result.error||result.status!==0)throw result.error??Error('Native audit build failed: '+result.stderr+'\n'+result.stdout)
  const executable=join(paths.targetDir,'debug/examples',name+(process.platform==='win32'?'.exe':''))
  if(!existsSync(executable))throw Error('Native audit build did not produce '+executable)
  return executable
}
