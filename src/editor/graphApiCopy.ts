/** 引擎回调、宿主接口和语言内建调用的本地化帮助；签名、函数名和源代码保持不变。 */
import {RHAI_API_SIGNATURES} from '../visual/rhaiApiSignatures'
import type {GraphCopyLocale} from './graphSyntaxCopy'
const signatures=new Map(RHAI_API_SIGNATURES.filter(/** 仅处理当前 WASM 环境公开的宿主或内建签名，标准库长篇文档另行翻译。 */ signature=>signature.available&&signature.profiles.includes('wasm')&&!signature.internal&&!signature.operator&&signature.origin!=='standard-package').map(/** 使用稳定的重载编号区分同名 API。 */ signature=>['rhai-api.'+signature.id,signature]))
/** 由注册签名生成准确的三语调用说明；未知类型和作者扩展描述不尝试猜译。 */
export function graphApiHelp(type:string,locale:GraphCopyLocale,fallback:string):string|undefined{
  const signature=signatures.get(type)
  if(!signature)return undefined
  if(locale==='en')return fallback
  const parameters=signature.parameters.map(/** 参数名称和类型属于程序标识，完整保留用于对照源码。 */ parameter=>parameter.name+(parameter.optional?'?':'')+': '+parameter.type).join(', ')
  if(signature.role==='lifecycle')return locale==='zh'
    ? `声明引擎分派的回调 ${signature.name}(${parameters})。参数由引擎提供；该节点声明函数，不会主动调用宿主接口。`
    : `Vom Engine-Host ausgelösten Rückruf ${signature.name}(${parameters}) deklarieren. Der Host liefert die Parameter; dieser Knoten deklariert eine Funktion und ruft keine Host-Funktion auf.`
  const hasOptional=signature.parameters.some(/** 只根据实际签名决定是否显示可选参数规则。 */ parameter=>parameter.optional)
  const parameterRule=hasOptional
    ? (locale==='zh'?'带 ? 的参数可省略；其他参数必需。':'Parameter mit ? sind optional; alle anderen sind erforderlich.')
    : (locale==='zh'?'所有列出的参数都必需。':'Alle aufgeführten Parameter sind erforderlich.')
  const call=locale==='zh'
    ? `调用 ${signature.name}(${parameters})，返回类型 ${signature.returnType}。${parameterRule}插入的字面量是可编辑占位值，不改变参数是否可选。`
    : `${signature.name}(${parameters}) aufrufen; Rückgabetyp: ${signature.returnType}. ${parameterRule} Eingefügte Literale sind bearbeitbare Platzhalter und ändern nicht, ob ein Parameter optional ist.`
  if(signature.origin==='intrinsic'&&signature.variadic)return call+(locale==='zh'
    ? ' call/curry 还可接收零个或多个动态实参；函数指针必须来自 Fn 或闭包。'
    : ' call/curry können zusätzlich beliebig viele dynamische Argumente erhalten; der Funktionszeiger muss von Fn oder einer Closure stammen.')
  return call
}
