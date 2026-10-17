/** 真实模块及原生渲染审计辅助库，构建隔离环境并核验证据。 */
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {join,resolve,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'

/** 要求 Windows 文件和产品版本均为26.15.0，拒绝陈旧原生程序。 */ export function validateNativeRendererVersion(version) {
 for(const field of ['ProductVersion','FileVersion'])if(!new RegExp('^26\\.15\\.0(?:\\.0)?(?:[ +\\-]|$)').test(version[field]??''))throw Error('Refusing stale native binary: '+field+'='+version[field])
}
/** 核对26.15源码摘要、已通过原生构建门和实际二进制长度与散列。 */ export function validateNativeRendererReceipt(receipt,digest,sha256,bytes) {
 if(receipt?.format!=='nova-release-executed-gates'||receipt.version!==1||receipt.release!=='26.15'||receipt.machineVersion!=='26.15.0'||receipt.sourceInputDigest!==digest)throw Error('Native build receipt identifies another source or release.')
 const matching=(receipt.gates??[]).filter(/* 比较 gate.id 与 'native-build'，返回严格相等的判断结果。 */ gate=>gate.id==='native-build'),gate=matching[0]
 if(matching.length!==1||gate.status!=='passed'||gate.exitCode!==0||gate.sourceInputDigest!==digest)throw Error('The actual native-build gate must have passed against this source.')
 const artifacts=(gate.artifacts??[]).filter(/* 比较 artifact.name 与 'windows-editor'，返回严格相等的判断结果。 */ artifact=>artifact.name==='windows-editor')
 if(artifacts.length!==1||artifacts[0].status!=='passed'||artifacts[0].sha256!==sha256||artifacts[0].bytes!==bytes)throw Error('Native binary bytes do not match the qualified build artifact.')
 return gate
}
/** 要求浏览器比较报告来自相同冻结源码，断言全部通过且截图名称唯一。 */ export function validateRendererBrowserComparison(browser,digest) {
 if(browser?.sourceInputDigest!==digest||browser.sourceMode!=='staged'||!Array.isArray(browser.checks)||!browser.checks.length||browser.checks.some(/* 比较 check.status 与 'passed'，返回严格不等的判断结果。 */ check=>check.status!=='passed')||!Array.isArray(browser.captures)||!browser.captures.length||new Set(browser.captures.map(/* 返回 capture.name 的当前值。 */ capture=>capture.name)).size!==browser.captures.length)throw Error('Browser comparison must pass against the exact same frozen source digest and contain unique actual captures.')
}

/** 验证 Windows 集成源码快照、可执行版本、构建收据及日志和浏览器基线，返回已核验输入。 */ export async function qualifyNativeRendererInput(root,sourceRoot,executable,snapshotPath,comparisonPath,receiptPath) {
 if(process.platform!=='win32')throw Error('Native renderer comparison requires Windows and WebView2.')
 if(resolve(sourceRoot)!==resolve(root))throw Error('Native qualification requires promoted frozen source, not a development overlay.')
 if(!snapshotPath||!comparisonPath||!receiptPath)throw Error('Native comparison requires --snapshot, --compare and --build-receipt.')
 const {verifyReleaseSnapshot}=await import(pathToFileURL(join(root,'scripts/release-source-snapshot.mjs')))
 const manifest=await verifyReleaseSnapshot(resolve(snapshotPath),root)
 if(manifest.release!=='26.15'||manifest.machineVersion!=='26.15.0')throw Error('This renderer native gate requires the actual26.15 frozen source.')
 const result=spawnSync('powershell.exe',['-NoProfile','-Command','(Get-Item -LiteralPath $env:NOVA_RENDERER_AUDIT_EXE).VersionInfo | Select-Object FileVersion,ProductVersion | ConvertTo-Json -Compress'],{env:{...process.env,NOVA_RENDERER_AUDIT_EXE:resolve(executable)},encoding:'utf8',windowsHide:true,timeout:10000})
 if(result.status||result.error)throw result.error??Error(result.stderr)
 const version=JSON.parse(result.stdout)
 validateNativeRendererVersion(version)
 const bytes=await readFile(executable),sha256=createHash('sha256').update(bytes).digest('hex'),browser=JSON.parse(await readFile(comparisonPath,'utf8')),receipt=JSON.parse(await readFile(receiptPath,'utf8'))
 const gate=validateNativeRendererReceipt(receipt,manifest.sourceInputDigest,sha256,bytes.length)
 if(gate.log?.path!=='native-build.log')throw Error('Native build receipt has no safe build log.')
 const log=await readFile(join(dirname(resolve(receiptPath)),gate.log.path));if(log.length!==gate.log.bytes||createHash('sha256').update(log).digest('hex')!==gate.log.sha256)throw Error('Qualified native build log has changed.')
 validateRendererBrowserComparison(browser,manifest.sourceInputDigest)
 return{executable:resolve(executable),sha256,bytes:bytes.length,...version,sourceInputDigest:manifest.sourceInputDigest,browser,comparisonPath:resolve(comparisonPath),buildReceipt:resolve(receiptPath)}
}

/** 配对同名原生与浏览器截图，再在浏览器中执行像素差比较。 */ export async function compareRendererCaptures(nativeReport,nativeInput,evaluate) {
 const pairs=[]
 for(const capture of nativeReport.captures) {
  const baseline=nativeInput.browser.captures.find(/* 比较 item.name 与 capture.name，返回严格相等的判断结果。 */ item=>item.name===capture.name)
  if(!baseline||!baseline.file||baseline.file.includes('/')||baseline.file.includes('\\'))throw Error('Missing safe browser capture '+capture.name)
  pairs.push({name:capture.name,expected:'data:image/png;base64,'+(await readFile(join(dirname(nativeInput.comparisonPath),baseline.file))).toString('base64'),actual:capture.data})
 }
 if(pairs.length!==nativeInput.browser.captures.length)throw Error('Browser/native capture sets differ.')
 const compare=/** 解码每对截图并检查尺寸，计算平均误差和大差异像素比例判定比较结果。 */ async pairs=>{
  const decode=/** 将图像加载到画布并读取像素数据及尺寸。 */ async source=>{const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return{width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data}}
  const results=[]
  for(const pair of pairs){const expected=await decode(pair.expected),actual=await decode(pair.actual);if(expected.width!==actual.width||expected.height!==actual.height)throw Error('Dimensions differ: '+pair.name);let total=0,maximum=0,differentPixels=0;for(let index=0;index<expected.data.length;index+=4){let large=false;for(let channel=0;channel<4;channel++){const error=Math.abs(expected.data[index+channel]-actual.data[index+channel]);total+=error;maximum=Math.max(maximum,error);if(error>16)large=true}if(large)differentPixels++}const meanAbsoluteError=total/expected.data.length,largeDifferenceRatio=differentPixels/(expected.width*expected.height);results.push({name:pair.name,width:expected.width,height:expected.height,meanAbsoluteError,maximum,largeDifferenceRatio,status:meanAbsoluteError<=2&&largeDifferenceRatio<=.02?'passed':'failed'})}
  return results
 }
 return evaluate('('+compare.toString()+')('+JSON.stringify(pairs)+')')
}
