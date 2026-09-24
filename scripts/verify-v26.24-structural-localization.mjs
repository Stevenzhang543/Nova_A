/** 结构显示本地化回归：覆盖所有公开语法种类，验证文案不会改写图文档。 */
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-copy24-'))
try{
  await build({configFile:false,root:process.cwd(),logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{lexer:resolve('src/visual/rhaiSyntaxLexer.ts'),copy:resolve('src/editor/graphSyntaxCopy.ts'),diagnostics:resolve('src/editor/graphDiagnosticCopy.ts'),schema:resolve('src/visual/graphSyntaxSchema.ts'),legacy:resolve('src/editor/graphLegacyCopy.ts'),catalog:resolve('src/visual/graphCatalog.ts'),production:resolve('src/visual/graphProduction.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const copy=await import(pathToFileURL(join(temporary,'copy.mjs'))),schema=await import(pathToFileURL(join(temporary,'schema.mjs')))
  const checks=[]
  for(const kind of [...schema.RHAI_SYNTAX_KINDS,'Sequence']){
    const canonical=kind.replace(/([a-z])([A-Z])/g,'$1 $2')
    const node={type:'rhai.'+kind,title:canonical+' · user_变量',config:{fields:{name:'user_变量'}}},before=JSON.stringify(node)
    assert.equal(copy.syntaxNodeTitle(node,'en'),node.title)
    assert.match(copy.syntaxNodeTitle(node,'zh'),/[\u3400-\u9fff]/)
    assert.ok(copy.syntaxNodeTitle(node,'zh').endsWith(' · user_变量'))
    assert.ok(copy.syntaxNodeTitle(node,'de').endsWith(' · user_变量'))
    assert.equal(copy.syntaxNodeTitle({...node,title:'Authored custom title'},'zh'),'Authored custom title')
    assert.match(copy.syntaxNodeHelp(node.type,'zh','fallback'),/源码/)
    assert.notEqual(copy.syntaxNodeHelp(node.type,'de','fallback'),'fallback')
    assert.equal(JSON.stringify(node),before)
    checks.push(kind)
  }
  // 所有模式公开的字段、可排序分组和可选子项均使用共享字段词典，防止只翻译普通输入框。
  for(const kind of [...schema.RHAI_SYNTAX_KINDS,'Sequence']){
    const node={type:'rhai.'+kind,config:{},pins:[],size:{width:256,height:120}}
    schema.initializeSyntaxNode(node)
    const keys=[...schema.syntaxNodeEditableFields(node).map(/** 收集直接可编辑字段键。 */ field=>field.key),...schema.syntaxNodeChildLists(node).map(/** 收集有序子列表的字段键。 */ list=>list.field),...schema.syntaxNodeOptionalChildren(node).map(/** 收集可选子项字段键。 */ option=>option.field)]
    for(const key of keys)assert.match(copy.syntaxFieldLabel(key,'zh'),/[\u3400-\u9fff]/,kind+': '+key)
  }
  const legacy=await import(pathToFileURL(join(temporary,'legacy.mjs'))),catalog=await import(pathToFileURL(join(temporary,'catalog.mjs')))
  const production=await import(pathToFileURL(join(temporary,'production.mjs'))),legacyGraph=catalog.defaultVisualGraph('Localization fixture'),legacyScope=production.createGraphRoutine('function','localization_fixture')
  assert.equal(legacy.LEGACY_GRAPH_COPY_TYPES.length,41)
  for(const type of legacy.LEGACY_GRAPH_COPY_TYPES){
    const definition=catalog.graphNodeDefinition(type,legacyGraph,legacyScope)
    assert.ok(definition,type)
    const node={type,title:definition.title},before=JSON.stringify(node)
    assert.match(copy.syntaxNodeTitle(node,'zh'),/[\u3400-\u9fff]/,type)
    assert.equal(copy.graphPaletteTitle(type,node.title,'zh'),copy.syntaxNodeTitle(node,'zh'))
    assert.equal(copy.syntaxNodeTitle(node,'en'),node.title)
    assert.equal(copy.syntaxNodeTitle({...node,title:'Authored 变量 title'},'zh'),'Authored 变量 title')
    assert.match(copy.syntaxNodeHelp(type,'zh',definition.description),/[\u3400-\u9fff]/,type)
    assert.notEqual(copy.syntaxNodeHelp(type,'de',definition.description),definition.description,type)
    assert.equal(copy.syntaxPinLabel(node,{name:'Value',key:'value'},'zh'),'值')
    assert.equal(copy.syntaxPinLabel(node,{name:'Authored 端口',key:'value'},'zh'),'Authored 端口')
    assert.equal(JSON.stringify(node),before)
  }
  const node={type:'rhai.Call'}
  assert.equal(copy.syntaxPinLabel(node,{key:'arguments_2',name:'arguments 3'},'zh'),'实参 3')
  assert.equal(copy.syntaxPinLabel(node,{key:'arguments_2',name:'Add arguments'},'zh'),'添加实参')
  assert.equal(copy.syntaxPinLabel({type:'custom.node'},{key:'arguments_2',name:'my authored pin'},'zh'),'my authored pin')
  assert.equal(copy.syntaxFieldLabel('name','zh'),'名称')
  assert.equal(copy.syntaxFieldLabel('unknown-authored-key','zh'),'unknown-authored-key')
  assert.equal(copy.syntaxCategoryLabel('Language flow','zh'),'语言控制流')
  const apiInventory=JSON.parse(await readFile('src/visual/rhaiApiSignatures.generated.json','utf8'))
  const apiCopies=apiInventory.signatures.filter(/** 与真实节点库一致地筛选可插入的非标准库 API。 */ signature=>signature.available&&signature.profiles.includes('wasm')&&!signature.internal&&!signature.operator&&signature.origin!=='standard-package')
  for(const signature of apiCopies){
    const type='rhai-api.'+signature.id,original='Registered help '+signature.name
    assert.equal(copy.syntaxNodeHelp(type,'en',original),original)
    assert.match(copy.syntaxNodeHelp(type,'zh',original),/[\u3400-\u9fff]/)
    assert.notEqual(copy.syntaxNodeHelp(type,'de',original),original)
    for(const locale of ['zh','de'])assert.ok(copy.syntaxNodeHelp(type,locale,original).includes(signature.name))
  }
  // 可选实参与变参只按当前签名显示，不能把占位值误称为必填规则。
  for(const signature of apiCopies){
    const help=copy.syntaxNodeHelp('rhai-api.'+signature.id,'zh','fallback')
    if(signature.parameters.some(/** 验证元数据实际声明的可选参数。 */ parameter=>parameter.optional)){
      assert.ok(help.includes('带 ? 的参数可省略'),signature.name)
      assert.ok(!help.includes('所有列出的参数都必需'),signature.name)
    }else if(signature.role!=='lifecycle')assert.ok(help.includes('所有列出的参数都必需'),signature.name)
    if(signature.origin==='intrinsic')assert.equal(help.includes('零个或多个动态实参'),signature.variadic,signature.name)
  }
  const lexer=await import(pathToFileURL(join(temporary,'lexer.mjs')))
  const standardCopies=[],checkedDocuments=new Set()
  /** 用真实 Rhai token 比较示例程序，允许翻译注释而不改变标识、字面量或操作符。 */
  const examples=document=>[...document.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(/** 从每个围栏提取不含空白与注释的程序 token。 */ match=>lexer.lexRhai(match[1]).tokens.filter(/** 仅移除词法器明确识别的空白及注释。 */ token=>!lexer.isRhaiTrivia(token)).map(/** 保留 token 类别与原始程序文本。 */ token=>[token.kind,token.text]))
  for(const signature of apiInventory.signatures.filter(/** 与真实节点库共享标准库可用性筛选。 */ item=>item.available&&item.profiles.includes('wasm')&&!item.internal&&!item.operator&&item.origin==='standard-package')){
    const type='rhai-api.'+signature.id,original=signature.documentation||'No registered documentation',before=JSON.stringify(signature)
    assert.equal(copy.syntaxNodeHelp(type,'en',original),original)
    assert.equal(copy.syntaxNodeHelp(type,'en','Caller-provided custom help'),'Caller-provided custom help')
    const zh=copy.syntaxNodeHelp(type,'zh',original),de=copy.syntaxNodeHelp(type,'de',original)
    if(signature.documentation)assert.notEqual(zh,original,'Every nonempty registered standard-library document has a complete translation: '+signature.id)
    if(zh!==original){
      assert.match(zh,/[\u3400-\u9fff]/);assert.notEqual(de,original)
      if(!checkedDocuments.has(original)){
        const prose=original.replace(/```[\s\S]*?```/g,'')
        for(const token of prose.match(/`[^`]+`/g)??[]){assert.ok(zh.includes(token),signature.name+': '+token);assert.ok(de.includes(token),signature.name+': '+token)}
        assert.deepEqual(examples(zh),examples(original),signature.name+' Chinese code examples')
        assert.deepEqual(examples(de),examples(original),signature.name+' German code examples')
        checkedDocuments.add(original)
      }
      standardCopies.push(signature.id)
    }else assert.equal(de,original,'Unknown documentation retains its complete fallback in both languages')
    assert.equal(JSON.stringify(signature),before)
  }
  assert.ok(standardCopies.length>=78,'Reviewed short standard-library help remains localized')
  const packageNames=new Set(JSON.stringify(apiInventory).match(/\b[A-Za-z]+Package\b/g))
  for(const category of ['Code','Operators','Language callbacks','Language engine API','Language built-ins',...[...packageNames].map(/** 与生成目录的实际包集合逐一核对。 */ name=>'Language '+name)]){
    assert.match(copy.syntaxCategoryLabel(category,'zh'),/[\u3400-\u9fff]/,category)
    assert.notEqual(copy.syntaxCategoryLabel(category,'de'),category)
    assert.equal(copy.syntaxCategoryLabel(category,'en'),category)
  }
  assert.equal(copy.syntaxCategoryLabel('Language Authored_Custom','zh'),undefined)
  for(const name of ['constructor','toString','__proto__'])assert.equal(copy.syntaxCategoryLabel(name,'zh'),undefined,'Custom category must not resolve through Object.prototype')
  // 编译器、布局器、词法器和语法器发出的每个稳定编号都必须有中文及德文说明。
  const diagnostics=await import(pathToFileURL(join(temporary,'diagnostics.mjs'))),codes=new Set()
  for(const file of ['src/visual/graphCompiler.ts','src/visual/graphLayoutEngine.ts','src/visual/graphSyntax.ts','src/visual/rhaiSyntax.ts','src/visual/rhaiSyntaxLexer.ts']){
    const text=await readFile(file,'utf8')
    for(const match of text.matchAll(/['"]((?:GRAPH-|RHAI-)[A-Z][A-Z-]+|MISSING_ENDPOINT|DEPTH_FOLDED|WIRE_ROUTE_BLOCKED)['"]/g))if(!match[1].endsWith('-')&&match[1]!=='RHAI-LIMIT')codes.add(match[1])
  }
  for(const code of codes){const diagnostic={code,message:'Authored_变量 42:17 → original diagnostic'},before=JSON.stringify(diagnostic);assert.match(diagnostics.graphDiagnosticMessage(diagnostic,'zh'),/[\u3400-\u9fff]/);assert.notEqual(diagnostics.graphDiagnosticMessage(diagnostic,'de'),diagnostic.message,code);assert.equal(diagnostics.graphDiagnosticMessage(diagnostic,'en'),diagnostic.message);assert.equal(JSON.stringify(diagnostic),before)}
  assert.equal(diagnostics.graphDiagnosticMessage({code:'FUTURE-UNKNOWN',message:'Future authored 变量'},'zh'),'Future authored 变量')
  assert.equal(diagnostics.graphDiagnosticDetailsLabel('zh'),'原始详情')
  for(const reason of ['Missing expression','Unexpected expression token','Unsupported source requires review']){
    assert.equal(diagnostics.graphConversionReason(reason,'en'),reason)
    assert.match(diagnostics.graphConversionReason(reason,'zh'),/[\u3400-\u9fff]/)
    assert.notEqual(diagnostics.graphConversionReason(reason,'de'),reason)
  }
  for(const severity of ['error','warning','info']){
    assert.equal(diagnostics.graphDiagnosticSeverityLabel(severity,'en'),severity)
    assert.match(diagnostics.graphDiagnosticSeverityLabel(severity,'zh'),/[\u3400-\u9fff]/)
    assert.notEqual(diagnostics.graphDiagnosticSeverityLabel(severity,'de'),severity)
  }
  assert.equal(diagnostics.graphConversionReason('Future authored 原因','zh'),'Future authored 原因')
  assert.equal(diagnostics.graphDiagnosticSeverityLabel('future-level','de'),'future-level')
  await mkdir('release-audits',{recursive:true})
  const report={format:'nova-v26.24-structural-localization',version:1,targetRelease:'26.24',generatedAt:new Date().toISOString(),status:'passed',kinds:checks,legacyTypes:legacy.LEGACY_GRAPH_COPY_TYPES,diagnosticCodes:[...codes].sort(),localizedHostAndIntrinsicSignatures:apiCopies.length,localizedStandardSignatures:standardCopies,scope:'Pure display helpers; no document mutation. Rendered layout/locales have separate browser checks.'}
  await writeFile('release-audits/v26.24-structural-localization.json',JSON.stringify(report)+'\n')
  console.log(JSON.stringify({status:report.status,kinds:checks.length,legacyTypes:legacy.LEGACY_GRAPH_COPY_TYPES.length,diagnostics:codes.size}))
}finally{await rm(temporary,{recursive:true,force:true})}
