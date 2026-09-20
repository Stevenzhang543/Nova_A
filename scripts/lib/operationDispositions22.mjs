import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
/** An exclusion documents scope; it never becomes an executed test case. */
export async function linkOperationDispositions22(operations,entries,readSource=path=>readFile(path)){
 const hashes=new Map(),seen=new Set();let excluded=0;
 for(const entry of entries){
  if(!/^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.ts$/.test(entry.source)||typeof entry.reason!=='string'||entry.reason.length<30||entry.disposition!=='Explicit exclusion from authored document transaction corpus')throw Error('Invalid explicit operation disposition');
  const key=entry.id+'#'+entry.kind;if(seen.has(key))throw Error('Duplicate operation disposition '+key);seen.add(key);
  const matches=operations.filter(row=>row.id===entry.id&&row.source===entry.source&&row.kind===entry.kind);if(matches.length!==1)throw Error('Stale operation disposition '+key);
  if(!hashes.has(entry.source))hashes.set(entry.source,createHash('sha256').update(await readSource(entry.source)).digest('hex'));
  if(hashes.get(entry.source)!==entry.sourceSha256)throw Error('Source changed since disposition review '+entry.source);
  matches[0].scopeExclusion={reason:entry.reason,sourceSha256:entry.sourceSha256,scope:entry.disposition};
  if(!matches[0].cases.length){matches[0].disposition=entry.disposition+': '+entry.reason;excluded++}
 }
 return excluded;
}
