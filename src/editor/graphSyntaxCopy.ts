/** 结构节点显示文案：只翻译编辑器标签，永不修改图标识、端口键或用户编写的 Rhai。 */
import {graphApiHelp} from './graphApiCopy'
import {graphStandardApiHelp} from './graphStandardApiCopy'
import {legacyGraphTitle,legacyGraphHelp,legacyGraphPin} from './graphLegacyCopy'
import type { GraphNode, GraphPin } from '../visual/graphTypes'
export type GraphCopyLocale = 'en' | 'de' | 'zh'
const names: Record<string, [string,string,string]> = {
  Program:['Program','Programm','程序'],Literal:['Literal','Literal','字面量'],Identifier:['Identifier','Bezeichner','标识符'],Array:['Array','Array','数组'],Map:['Map','Zuordnung','映射'],MapEntry:['Map entry','Zuordnungseintrag','映射条目'],Unary:['Unary','Unärer Ausdruck','一元运算'],Binary:['Binary','Binärer Ausdruck','二元运算'],Assignment:['Assignment','Zuweisung','赋值'],Call:['Call','Aufruf','调用'],Member:['Member','Elementzugriff','成员访问'],Index:['Index','Indexzugriff','索引访问'],Parameter:['Parameter','Parameter','参数'],Closure:['Closure','Closure','闭包'],TemplateText:['Template text','Vorlagentext','模板文本'],InterpolatedString:['Interpolated string','Interpolierte Zeichenfolge','插值字符串'],Block:['Block','Block','作用域块'],If:['If','Bedingung','条件分支'],SwitchCase:['Switch case','Auswahlfall','分支项'],Switch:['Switch','Fallauswahl','多路分支'],For:['For','Zählschleife','遍历循环'],While:['While','Bedingungsschleife','条件循环'],Loop:['Loop','Endlosschleife','循环'],DoWhile:['Do while','Nachprüfende Schleife','后置条件循环'],Try:['Try','Fehlerbehandlung','异常处理'],VariableDeclaration:['Variable declaration','Variablendeklaration','变量声明'],FunctionDeclaration:['Function declaration','Funktionsdeklaration','函数声明'],ExpressionStatement:['Expression statement','Ausdrucksanweisung','表达式语句'],Return:['Return','Rückgabe','返回'],Break:['Break','Schleifenabbruch','跳出循环'],Continue:['Continue','Nächster Durchlauf','继续循环'],Throw:['Throw','Fehler auslösen','抛出异常'],ModuleDeclaration:['Module declaration','Moduldeklaration','模块声明'],ExportDeclaration:['Export declaration','Exportdeklaration','导出声明'],ExportMetadata:['Export metadata','Exportmetadaten','导出元数据'],Empty:['Empty','Leer','空语句'],Invalid:['Preserved source','Erhaltener Quelltext','保留源码'],Sequence:['Sequence','Anweisungsfolge','语句序列'],
}
const fields: Record<string,[string,string,string]> = {
  raw:['Source value','Quellwert','源码值'],name:['Name','Name','名称'],literalKind:['Literal kind','Literaltyp','字面量类型'],key:['Key','Schlüssel','键'],quoted:['Quoted key','Schlüssel in Anführungszeichen','键使用引号'],operator:['Operator','Operator','运算符'],shortCircuit:['Short circuit','Kurzschlussauswertung','短路求值'],property:['Property','Eigenschaft','成员名'],optional:['Optional access','Optionaler Zugriff','可选访问'],namespace:['Namespace access','Namensraumzugriff','命名空间访问'],declarationKind:['Declaration kind','Deklarationsart','声明种类'],exported:['Exported','Exportiert','导出'],terminated:['Terminating semicolon','Abschließendes Semikolon','末尾分号'],private:['Private','Privat','私有'],until:['Until condition','Bis-Bedingung','直到条件满足'],isDefault:['Default branch','Standardzweig','默认分支'],keyword:['Keyword','Schlüsselwort','关键字'],alias:['Alias','Alias','别名'],reason:['Reason','Grund','原因'],separator:['Separator','Trennzeichen','分隔符'],
  receiver:['Receiver','Empfänger','接收者'],body:['Body','Rumpf','语句体'],elements:['Elements','Elemente','元素'],entries:['Entries','Einträge','条目'],value:['Value','Wert','值'],operand:['Operand','Operand','操作数'],left:['Left operand','Linker Operand','左操作数'],right:['Right operand','Rechter Operand','右操作数'],target:['Target','Ziel','赋值目标'],callee:['Callable','Aufrufziel','被调函数'],arguments:['Arguments','Argumente','实参'],object:['Object','Objekt','对象'],index:['Index','Index','索引'],parameters:['Parameters','Parameter','形参'],parts:['Parts','Teile','片段'],condition:['Condition','Bedingung','条件'],consequent:['Then branch','Dann-Zweig','成立分支'],alternate:['Else branch','Sonst-Zweig','否则分支'],variable:['Iteration variable','Schleifenvariable','遍历变量'],counter:['Counter','Zähler','循环序号'],iterable:['Iterable','Iterierbarer Wert','可遍历值'],parameter:['Catch parameter','Fehlerparameter','异常参数'],handler:['Catch body','Fehlerbehandlung','异常处理体'],cases:['Cases','Fälle','分支列表'],patterns:['Patterns','Muster','匹配模式'],guard:['Guard condition','Zusatzbedingung','守卫条件'],initializer:['Initial value','Anfangswert','初始值'],expression:['Expression','Ausdruck','表达式'],path:['Module path','Modulpfad','模块路径'],metadata:['Metadata','Metadaten','元数据'],result:['Result','Ergebnis','结果'],
}
/** 根据受支持的界面语言选择文案；英文保留现有显示，未知键原样返回。 */
function translated(table:Record<string,[string,string,string]>,key:string,locale:GraphCopyLocale,fallback:string):string{return table[key]?.[locale==='zh'?2:locale==='de'?1:0]??fallback}
/** 翻译结构种类，不翻译用户变量、函数或 API 名称。 */
export function syntaxKindLabel(kind:string,locale:GraphCopyLocale,fallback=kind):string{return locale==='en'?fallback:translated(names,kind,locale,fallback)}
/** 保留由作者修改过的标题；仅替换自动生成标题的固定种类前缀。 */
export function syntaxNodeTitle(node:GraphNode,locale:GraphCopyLocale):string{
  if(!node.type.startsWith('rhai.'))return legacyGraphTitle(node.type,node.title,locale)
  if(locale==='en')return node.title
  const kind=node.type.slice(5),canonical=kind.replace(/([a-z])([A-Z])/g,'$1 $2')
  if(node.title!==canonical&&!node.title.startsWith(canonical+' · '))return node.title
  return syntaxKindLabel(kind,locale,canonical)+node.title.slice(canonical.length)
}
/** 生成结构编辑帮助；保留运行时已有的操作、递归和集合上限。 */
export function syntaxNodeHelp(type:string,locale:GraphCopyLocale,fallback:string):string{
  const apiHelp=graphApiHelp(type,locale,fallback)??graphStandardApiHelp(type,locale,fallback)
  if(apiHelp!==undefined)return apiHelp
  const kind=type.startsWith('rhai.')?type.slice(5):''
  if(!names[kind])return legacyGraphHelp(type,locale,fallback)
  if(locale==='en')return fallback
  const title=syntaxKindLabel(kind,locale)
  return locale==='zh'?`编辑“${title}”及其结构子节点。源码与图共用同一程序，运行时仍执行操作数、递归及集合容量限制。`:`„${title}“ und seine strukturellen Unterknoten bearbeiten. Quelltext und Graph verwenden dasselbe Programm; Ausführungs-, Rekursions- und Sammlungsgrenzen bleiben aktiv.`
}
/** 字段标签使用稳定键匹配，字段实际值及语言关键字保持原样。 */
export function syntaxFieldLabel(key:string,locale:GraphCopyLocale,fallback=key):string{return translated(fields,key,locale,fallback)}
/** 列表端口按字段名与一基序号显示；新增端口保留“添加”的含义。 */
export function syntaxPinLabel(node:GraphNode,pin:GraphPin,locale:GraphCopyLocale):string{
  if(!node.type.startsWith('rhai.'))return legacyGraphPin(node.type,pin.name,locale)
  if(!names[node.type.slice(5)]||locale==='en')return pin.name
  const match=/^(.*)_(\d+)$/.exec(pin.key),key=match?.[1]??pin.key
  const base=syntaxFieldLabel(key,locale,pin.name)
  if(pin.name.startsWith('Add '))return(locale==='zh'?'添加':'Hinzufügen: ')+base
  return base+(match?' '+(Number(match[2])+1):'')
}
/** 系统分类使用固定词典；包标识用于技术检索，未知扩展分类交还调用方原样显示。 */
export function syntaxCategoryLabel(category:string,locale:GraphCopyLocale):string|undefined{
  const categories:Record<string,[string,string,string]>={
    Code:['Code','Programmcode','代码'],Operators:['Operators','Operatoren','运算符'],
    'Language flow':['Language flow','Sprachkontrollfluss','语言控制流'],
    'Language values':['Language values','Sprachwerte','语言数据'],
    'Language callbacks':['Language callbacks','Sprachrückrufe','语言回调'],
    'Language engine API':['Language engine API','Engine-API','引擎接口'],
    'Language built-ins':['Language built-ins','Sprachinterne Funktionen','语言内置函数'],
  }
  if(Object.prototype.hasOwnProperty.call(categories,category))return translated(categories,category,locale,category)
  const packageName=category.startsWith('Language ')?category.slice(9):''
  const packages=new Set(['LanguageCorePackage','ArithmeticPackage','BasicFnPackage','BasicStringPackage','BasicIteratorPackage','BitFieldPackage','LogicPackage','BasicMathPackage','BasicArrayPackage','BasicBlobPackage','BasicMapPackage','BasicTimePackage','MoreStringPackage'])
  if(packages.has(packageName))return locale==='zh'?'语言库 · '+packageName:locale==='de'?'Sprachpaket · '+packageName:category
  return undefined
}

/** 节点库与画布使用相同系统标题规则，不改写 API 签名或扩展节点标题。 */
export function graphPaletteTitle(type:string,title:string,locale:GraphCopyLocale):string{return type.startsWith('rhai.')?syntaxKindLabel(type.slice(5),locale,title):legacyGraphTitle(type,title,locale)}
