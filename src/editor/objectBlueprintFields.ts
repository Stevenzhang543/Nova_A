/** 对象蓝图字段验证：检查可持久化配置后再允许提交草稿。 */
import type { ObjectBlueprintDocument } from '../runtime/objectBlueprints'
export interface BlueprintFieldIssue { code:string; field:string; message:string }
/** Raw form validation precedes serializer normalization, so invalid edits remain visible. */
/** 检查蓝图名称、唯一标签分组、支持的组件集合及资源引用格式，返回按字段定位的错误。 */ export function validateObjectBlueprintFields(document:ObjectBlueprintDocument,allowedComponents:readonly string[]):BlueprintFieldIssue[]{
  const issues:BlueprintFieldIssue[]=[],issue=/* 调用 issues.push({code:'OBJECT-DRAFT-FIELD',field,message}) 并返回调用结果。 */ (field:string,message:string)=>issues.push({code:'OBJECT-DRAFT-FIELD',field,message})
  const text=/* 先计算 typeof value==='string'&&value.length>0&&value.length<=maximum&&value===value.trim()；仅当其为真值时求右侧 !/[\u0000-\u001f]/.test(value)，返回短路求值结果。 */ (value:unknown,maximum:number)=>typeof value==='string'&&value.length>0&&value.length<=maximum&&value===value.trim()&&!/[\u0000-\u001f]/.test(value)
  if(!text(document.name,120))issue('name','Use a nonempty name up to120 characters, without surrounding whitespace or control characters.')
  for(const field of ['tags','groups'] as const){const values=document[field];if(!Array.isArray(values)||values.length>32||values.some(/* 返回 text(value,80) 的逻辑取反结果。 */ value=>!text(value,80))||new Set(values).size!==values.length)issue(field,'Use at most32 distinct nonempty entries, each up to80 characters without surrounding whitespace or control characters.')}
  for(const field of ['requiredComponents','excludedComponents'] as const){const values=document[field];if(!Array.isArray(values)||values.length>allowedComponents.length||values.some(/* 返回 allowedComponents.includes(value) 的逻辑取反结果。 */ value=>!allowedComponents.includes(value))||new Set(values).size!==values.length)issue(field,'Choose distinct supported component types.')}
  for(const field of ['prefabAsset','eventSheetAsset','baseBlueprintAsset'] as const){const value=document[field];if(value!==null&&(!text(value,512)||!value.startsWith('asset://')))issue(field,'Select an asset reference or inheritance fallback.')}
  return issues
}
