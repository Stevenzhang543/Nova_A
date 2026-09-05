import { parseRhai } from '../visual/rhaiSyntax'
/** Locate a unique declared callback in the current draft, including exact UTF16 span. */
export function objectCallbackSpan(source:string,callback:string){
  const program=parseRhai(source,{moduleMode:'host'})
  const functions=program.body.filter(node=>node.kind==='FunctionDeclaration'&&!node.receiver&&node.name===callback)
  return program.valid&&functions.length===1?functions[0].span:null
}
