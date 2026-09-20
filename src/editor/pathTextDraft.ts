import type { Vec2 } from '../world/types'
export type ParsedPathText = {kind:'points';points:Vec2[]} | {kind:'tangents';tangents:Array<{incoming:Vec2;outgoing:Vec2}>}
export type PathTextIssue = 'syntax' | 'count'
export type PathTextResult = {value:ParsedPathText;issue:null} | {value:null;issue:PathTextIssue}
/** Parse complete entries before returning any geometry; no truncation or partial acceptance. */
export function parsePathText(source:string,kind:'points'|'tangents',maximum=10_000):PathTextResult {
 if(typeof source!=='string'||kind!=='points'&&kind!=='tangents')return{value:null,issue:'syntax'}
 if(!Number.isInteger(maximum)||maximum<0)return{value:null,issue:'count'}
 const tokens=source.trim()?source.trim().split(/\s+/):[]
 if(tokens.length>Math.min(10_000,Math.max(0,maximum))||kind==='points'&&tokens.length<2)return{value:null,issue:'count'}
 const vector=(text:string):Vec2|null=>{const parts=text.split(',');if(parts.length!==2||parts.some(part=>!part.trim()))return null;const [x,y]=parts.map(Number);return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null}
 if(kind==='points'){const points:Vec2[]=[];for(const token of tokens){const point=vector(token);if(!point)return{value:null,issue:'syntax'};points.push(point)}return{value:{kind,points},issue:null}}
 const tangents:Array<{incoming:Vec2;outgoing:Vec2}>=[];for(const token of tokens){const pair=token.split(':');if(pair.length!==2)return{value:null,issue:'syntax'};const incoming=vector(pair[0]),outgoing=vector(pair[1]);if(!incoming||!outgoing)return{value:null,issue:'syntax'};tangents.push({incoming,outgoing})}return{value:{kind,tangents},issue:null}
}
