/** 跨平台原生物理进程回归：开发验证与 Windows 发布门禁复用相同的行为断言。 */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'

/** 验证实际可执行文件；不将协议检查等同于平台窗口或发布验收。 */
export function verifyNativeHeadless(exe, engineVersion) {
const checks=[]
/** 以独立标准输入所有者运行宿主并回收退出进程。 */
function run(lines,args=['--stdio']){const r=spawnSync(exe,args,{input:lines,encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:4*1024*1024});assert.equal(r.error,undefined);return {...r,rows:r.stdout.trim()?r.stdout.trim().split('\n').map(/** 解析协议响应。 */ s=>JSON.parse(s)):[]}}
/** 将协议请求序列编码为逐行命令。 */
function encode(commands){return commands.map(/** 保持请求顺序和原始序号。 */ x=>JSON.stringify(x)).join('\n')+'\n'}
/** 记录独立行为断言。 */
function check(name,fn){try{fn();checks.push({name,status:'passed'})}catch(e){checks.push({name,status:'failed',error:String(e.stack)})}}
const body=Array(56).fill(0);for(const i of [0,8,12,13,17,25,26])body[i]=1;body[4]=10
const seed=[{id:1,command:{op:'hello'}},{id:2,command:{op:'configure',tick_rate:60}},{id:3,command:{op:'upsert_body',handle:1,order:0,record:body}},{id:4,command:{op:'snapshot'}},{id:5,command:{op:'step',ticks:60,gravity:0,air_friction:0}}]
check('Independent native processes replay identical bounded physics commands',/** 真正启动两次宿主，验证物理移动与同主机重放。 */ ()=>{const a=run(encode(seed)),b=run(encode(seed));assert.equal(a.status,0);assert.equal(b.status,0);assert.ok(a.rows.every(/** 每条正常请求必须成功。 */ x=>x.ok));assert.equal(a.rows[0].result.webview,false);assert.equal(a.rows[0].result.scriptHost,false);assert.equal(a.rows[3].result.configurationPending,true);assert.equal(a.rows[3].result.checksum,null);assert.equal(a.rows[4].result.configurationPending,false);assert.ok(Math.abs(a.rows[4].result.state[2]-10)<.001);assert.deepEqual(a.rows,b.rows)})
check('Duplicate and reordered step commands cannot advance world twice',/** 序号冲突不改变求解器时间或输出。 */ ()=>{const r=run(encode([...seed,{id:5,command:{op:'step',ticks:60,gravity:0,air_friction:0}},{id:4,command:{op:'reset'}},{id:6,command:{op:'snapshot'}}]));assert.equal(r.rows[5].ok,false);assert.match(r.rows[5].error,/REQUEST_ORDER/);assert.equal(r.rows[6].ok,false);assert.deepEqual(r.rows[7].result,r.rows[4].result)})
check('Invalid records, malformed JSON and unknown fields recover without committing',/** 拒绝错误后同序号可发送合法命令，恢复进程仍保持空世界。 */ ()=>{const r=run('invalid\n'+encode([{id:1,command:{op:'upsert_body',handle:1,order:0,record:[1]}},{id:1,command:{op:'configure',tick_rate:0}},{id:1,command:{op:'hello',extra:true}},{id:1,command:{op:'snapshot'}}]));assert.equal(r.status,0);assert.ok(r.rows.slice(0,4).every(/** 前四次输入应失败。 */ x=>!x.ok));assert.equal(r.rows[4].ok,true);assert.deepEqual(r.rows[4].result.state,[])})
check('Filtered query rejects pending edits and reads synchronized real body',/** 同一查询先因未同步配置拒绝，步进后命中真实身份。 */ ()=>{const query={kind:'Point',origin:[0,0],direction:[1,0],size:[1,1],angle:0,radius:1,distance:10,layerMask:4294967295,includeSensors:true,excludedHandles:[],maximumResults:10};const r=run(encode([...seed.slice(0,4),{id:5,command:{op:'query',query}},{id:6,command:{op:'step',ticks:1,gravity:0,air_friction:0}},{id:7,command:{op:'query',query}}]));assert.match(r.rows[4].error,/STEP_REQUIRED/);assert.equal(r.rows[6].ok,true);assert.equal(r.rows[6].result.length,1)})
check('Reset disposes world; shutdown ignores queued commands; EOF closes cleanly',/** 验证会话清理和显式关闭边界。 */ ()=>{const r=run(encode([...seed,{id:6,command:{op:'reset'}},{id:7,command:{op:'shutdown'}},{id:8,command:{op:'step',ticks:1,gravity:0,air_friction:0}}]));assert.equal(r.status,0);assert.equal(r.rows.length,7);assert.deepEqual(r.rows[5].result.state,[]);assert.equal(r.rows[6].result.shutdown,true);assert.equal(run('').status,0)})
check('Oversized input terminates before parsing or executing',/** 有界读取防止宿主无限积累标准输入。 */ ()=>{const r=run(' '.repeat(65537)+'\n');assert.equal(r.status,2);assert.equal(r.rows.length,0);assert.match(r.stderr,/LINE_LIMIT/)})
check('Published binary version matches current machine version',/** 版本入口无需初始化物理世界。 */ ()=>{const r=spawnSync(exe,['--version'],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(r.status,0);assert.equal(r.stdout.trim(),`nova_headless ${engineVersion}`)})
return checks
}
