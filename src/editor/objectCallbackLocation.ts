/** 对象回调源码定位：查找回调对应的源码范围，支持从对象编辑界面跳转。 */
import { parseRhai } from '../visual/rhaiSyntax'
/** Locate a unique declared callback in the current draft, including exact UTF16 span. */
/** 解析宿主模式 Rhai，仅在程序有效且存在唯一无接收类型的同名函数时返回其源码范围。 */ export function objectCallbackSpan(source:string,callback:string){
  const program=parseRhai(source,{moduleMode:'host'})
  const functions=program.body.filter(/* 先计算 node.kind==='FunctionDeclaration'&&!node.receiver；仅当其为真值时求右侧 node.name===callback，返回短路求值结果。 */ node=>node.kind==='FunctionDeclaration'&&!node.receiver&&node.name===callback)
  return program.valid&&functions.length===1?functions[0].span:null
}
