import type { ObjectBlueprintDocument } from '../runtime/objectBlueprints'
export interface BlueprintFieldIssue { code:string; field:string; message:string }
/** Raw form validation precedes serializer normalization, so invalid edits remain visible. */
export function validateObjectBlueprintFields(document:ObjectBlueprintDocument,allowedComponents:readonly string[]):BlueprintFieldIssue[]{
  const issues:BlueprintFieldIssue[]=[],issue=(field:string,message:string)=>issues.push({code:'OBJECT-DRAFT-FIELD',field,message})
  const text=(value:unknown,maximum:number)=>typeof value==='string'&&value.length>0&&value.length<=maximum&&value===value.trim()&&!/[\u0000-\u001f]/.test(value)
  if(!text(document.name,120))issue('name','Use a nonempty name up to120 characters, without surrounding whitespace or control characters.')
  for(const field of ['tags','groups'] as const){const values=document[field];if(!Array.isArray(values)||values.length>32||values.some(value=>!text(value,80))||new Set(values).size!==values.length)issue(field,'Use at most32 distinct nonempty entries, each up to80 characters without surrounding whitespace or control characters.')}
  for(const field of ['requiredComponents','excludedComponents'] as const){const values=document[field];if(!Array.isArray(values)||values.length>allowedComponents.length||values.some(value=>!allowedComponents.includes(value))||new Set(values).size!==values.length)issue(field,'Choose distinct supported component types.')}
  for(const field of ['prefabAsset','eventSheetAsset','baseBlueprintAsset'] as const){const value=document[field];if(value!==null&&(!text(value,512)||!value.startsWith('asset://')))issue(field,'Select an asset reference or inheritance fallback.')}
  return issues
}
