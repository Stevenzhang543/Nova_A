/** 路径点文本草稿：把用户输入解析成坐标并报告非法条目。 */
import type { Vec2 } from '../world/types'
export type ParsedPathText = {kind:'points';points:Vec2[]} | {kind:'tangents';tangents:Array<{incoming:Vec2;outgoing:Vec2}>}
export type PathTextIssue = 'syntax' | 'count'
export type PathTextResult = {value:ParsedPathText;issue:null} | {value:null;issue:PathTextIssue}
/** Parse complete entries before returning any geometry; no truncation or partial acceptance. */
/** 检查路径点或切线文本的类型和数量上限，逐项解析有限坐标，失败时返回语法或数量问题而不生成部分值。 */ export function parsePathText(source:string,kind:'points'|'tangents',maximum=10_000):PathTextResult {
 if(typeof source!=='string'||kind!=='points'&&kind!=='tangents')return{value:null,issue:'syntax'}
 if(!Number.isInteger(maximum)||maximum<0)return{value:null,issue:'count'}
 const tokens=source.trim()?source.trim().split(/\s+/):[]
 if(tokens.length>Math.min(10_000,Math.max(0,maximum))||kind==='points'&&tokens.length<2)return{value:null,issue:'count'}
 const vector=/** 要求一对非空逗号分隔数值，只有两个坐标均有限时返回向量。 */ (text:string):Vec2|null=>{const parts=text.split(',');if(parts.length!==2||parts.some(/* 返回 part.trim() 的逻辑取反结果。 */ part=>!part.trim()))return null;const [x,y]=parts.map(Number);return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null}
 if(kind==='points'){const points:Vec2[]=[];for(const token of tokens){const point=vector(token);if(!point)return{value:null,issue:'syntax'};points.push(point)}return{value:{kind,points},issue:null}}
 const tangents:Array<{incoming:Vec2;outgoing:Vec2}>=[];for(const token of tokens){const pair=token.split(':');if(pair.length!==2)return{value:null,issue:'syntax'};const incoming=vector(pair[0]),outgoing=vector(pair[1]);if(!incoming||!outgoing)return{value:null,issue:'syntax'};tangents.push({incoming,outgoing})}return{value:{kind,tangents},issue:null}
}
