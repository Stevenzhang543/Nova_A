/** 验证脚本（v26.13-studio-layout）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {build} from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),temporary=await mkdtemp(join(tmpdir(),'nova-studio-layout-'))
try{
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{layout:join(root,'src/editor/studioPaneLayout.ts'),geometry:join(root,'src/visual/graphEditorGeometry.ts'),wires:join(root,'src/visual/graphWireEditing.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const {studioPaneLayout}=await import(pathToFileURL(join(temporary,'layout.mjs')).href)
  const request={width:1358,primaryOpen:true,secondaryOpen:true,primaryWidth:264,secondaryWidth:344,activePanel:'secondary',focused:false}
  const original=JSON.stringify(request),wide=studioPaneLayout(request)
  assert.ok(wide.primaryVisible&&wide.secondaryVisible)
  assert.ok(request.width-wide.primaryWidth-wide.secondaryWidth>=440)
  const narrow=studioPaneLayout({...request,width:942});assert.equal(narrow.primaryVisible,false);assert.equal(narrow.secondaryVisible,true)
  const palette=studioPaneLayout({...request,width:942,activePanel:'primary'});assert.equal(palette.primaryVisible,true);assert.equal(palette.secondaryVisible,false)
  const restored=studioPaneLayout(request);assert.deepEqual(restored,wide);assert.equal(JSON.stringify(request),original)
  const focused=studioPaneLayout({...request,focused:true});assert.equal(focused.primaryVisible,false);assert.equal(focused.secondaryVisible,false)
  const drawer=studioPaneLayout({...request,width:480});assert.equal(drawer.drawer,true);assert.equal(drawer.primaryVisible,false);assert.ok(drawer.secondaryWidth<=456)
  for(const width of [1,300,640,942,1358,Infinity,NaN])for(const size of [-100,0,200,10000,NaN]){
    const result=studioPaneLayout({...request,width,primaryWidth:size,secondaryWidth:size})
    assert.ok(Number.isFinite(result.primaryWidth)&&result.primaryWidth>0);assert.ok(Number.isFinite(result.secondaryWidth)&&result.secondaryWidth>0)
  }
  const {graphEditorNodeSize,graphEditorPinPoint,nearestGraphNode,graphPolylinePath,placeGraphComment}=await import(pathToFileURL(join(temporary,'geometry.mjs')).href)
  const {insertWireReroute,changeWireReroute}=await import(pathToFileURL(join(temporary,'wires.mjs')).href)
  const node={uuid:'a',position:{x:10,y:20},size:{width:200,height:100},pins:[]},pin={uuid:'p',direction:'output'}
  node.pins.push(pin)
  assert.deepEqual(graphEditorNodeSize(node,{width:240,height:147}),{width:240,height:147})
  assert.deepEqual(graphEditorNodeSize(node,{width:NaN,height:0}),node.size)
  assert.deepEqual(graphEditorPinPoint(node,pin,{x:242,y:83}),{x:252,y:103})
  assert.deepEqual(graphEditorPinPoint({...node,collapsed:true},pin,{x:242,y:83},{width:240,height:48}),{x:250,y:44})
  const nodes=[node,{...node,uuid:'b',position:{x:320,y:20}},{...node,uuid:'c',position:{x:320,y:200}},{...node,uuid:'d',position:{x:10,y:300}}]
  assert.equal(nearestGraphNode(nodes,'a','right').uuid,'b');assert.equal(nearestGraphNode(nodes,'a','down').uuid,'d');assert.equal(nearestGraphNode(nodes,'a','left'),undefined)
  const sameCenter=[nodes[1],{...nodes[1],uuid:'z'},node];assert.equal(nearestGraphNode(sameCenter,'a','right').uuid,'b')
  assert.equal(graphPolylinePath([{x:0,y:1},{x:20,y:1},{x:20,y:40}]),'M 0 1 L 20 1 L 20 40');assert.equal(graphPolylinePath([{x:NaN,y:0},{x:1,y:1}]),'')
  const occupied=[{x:0,y:0,width:800,height:600},{x:824,y:0,width:360,height:220}],occupiedBefore=JSON.stringify(occupied),commentSize={width:360,height:220},placed=placeGraphComment(occupied,{x:100,y:100},commentSize)
  assert.equal(JSON.stringify(occupied),occupiedBefore);assert.ok(occupied.every(/** 判断新注释矩形与现有矩形之间是否至少保留二十四像素间距。 */ rect=>placed.x>=rect.x+rect.width+24||placed.x+commentSize.width+24<=rect.x||placed.y>=rect.y+rect.height+24||placed.y+commentSize.height+24<=rect.y));assert.deepEqual(placeGraphComment([], {x:25,y:35},commentSize),{x:25,y:35})
  const edge={uuid:'wire',from:{nodeUuid:'a',pinUuid:'a0'},to:{nodeUuid:'b',pinUuid:'b0'},reroutes:[{x:20,y:0},{x:20,y:40}]},before=JSON.stringify(edge),ends=[{x:0,y:0},{x:40,y:40}]
  const inserted=insertWireReroute(edge,{x:20,y:15},ends)
  assert.deepEqual(inserted,[{x:20,y:0},{x:20,y:15},{x:20,y:40}]);assert.equal(JSON.stringify(edge),before)
  inserted[0].x=19;assert.equal(edge.reroutes[0].x,20)
  assert.deepEqual(changeWireReroute(edge,1,{x:25,y:44}),[{x:20,y:0},{x:25,y:44}]);assert.equal(JSON.stringify(edge),before)
  for(const point of [{x:NaN,y:1},{x:1,y:Infinity},{x:1_000_001,y:0}]){assert.throws(/* 调用 changeWireReroute(edge,0,point) 并返回调用结果。 */ ()=>changeWireReroute(edge,0,point));assert.throws(/* 调用 insertWireReroute(edge,point,ends) 并返回调用结果。 */ ()=>insertWireReroute(edge,point,ends));assert.equal(JSON.stringify(edge),before)}
  assert.throws(/* 调用 changeWireReroute(edge,-1,{x:0,y:0}) 并返回调用结果。 */ ()=>changeWireReroute(edge,-1,{x:0,y:0}),/no longer exists/);assert.throws(/* 调用 changeWireReroute(edge,2,{x:0,y:0}) 并返回调用结果。 */ ()=>changeWireReroute(edge,2,{x:0,y:0}),/no longer exists/)
  assert.throws(/* 调用 insertWireReroute({...edge,reroutes:Array.from({length:64},()=>({x:1,y:2}))},{x:2,y:3},ends) 并返回调用结果。 */ ()=>insertWireReroute({...edge,reroutes:Array.from({length:64},/** 返回固定二维坐标作为测试值。 */ ()=>({x:1,y:2}))},{x:2,y:3},ends),/64/)
  assert.throws(/* 调用 insertWireReroute(edge,{x:2,y:3},ends,100_000) 并返回调用结果。 */ ()=>insertWireReroute(edge,{x:2,y:3},ends,100_000),/100,000/);assert.equal(JSON.stringify(edge),before)
  const groups=['wide pane budget','narrow inspector','narrow palette','preference restoration','focus restoration','drawer budget','malformed dimension bounds','measured bounds fallback','actual pin geometry','collapsed pin center','spatial node navigation','stable navigation tie','finite wire paths','ordered immutable insertion','immutable waypoint changes','atomic invalid-coordinate refusal','missing waypoint refusal','per-wire and document bounds']
  groups.push('comment placement avoids measured nodes and existing comments without moving either')
  await mkdir(join(root,'release-audits'),{recursive:true})
  await writeFile(join(root,'release-audits/v26.13-studio-layout.json'),JSON.stringify({status:'passed',generatedAt:new Date().toISOString(),scope:'Production pure pane/geometry/wire helpers; no browser geometry or integrated editor interaction claim.',checks:groups.map(/** 按名称构造已通过的检查记录。 */ name=>({name,status:'passed'}))},null,2)+'\n')
  console.log(`26.13 studio helpers:${groups.length} behavior groups passed (no browser/layout integration claim)`)
}finally{await rm(temporary,{recursive:true,force:true})}
