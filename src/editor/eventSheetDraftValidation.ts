import type { EventSheetDiagnostic, EventSheetDocument } from '../runtime/eventSheets'
const copy={
  en:{callback:'Use a callback identifier beginning with a letter or underscore, followed by letters, digits or underscores.',priority:'Priority must be a whole number between −1,000,000 and 1,000,000.',seed:'The deterministic seed must be a whole number between 1 and 2,147,483,647.'},
  de:{callback:'Der Callback muss mit einem Buchstaben oder Unterstrich beginnen und darf danach Buchstaben, Ziffern oder Unterstriche enthalten.',priority:'Die Priorität muss eine ganze Zahl zwischen −1.000.000 und 1.000.000 sein.',seed:'Der deterministische Startwert muss eine ganze Zahl zwischen 1 und 2.147.483.647 sein.'},
  zh:{callback:'回调标识符必须以字母或下划线开头，之后只能包含字母、数字或下划线。',priority:'优先级必须是 −1,000,000 到 1,000,000 之间的整数。',seed:'确定性种子必须是 1 到 2,147,483,647 之间的整数。'},
}
/** Validate the actual editing values before the saved-document normalizer runs. */
export function validateEventSheetDraft(document:EventSheetDocument,locale:keyof typeof copy='en'):EventSheetDiagnostic[]{
  const labels=copy[locale],issues:EventSheetDiagnostic[]=[]
  if(!Number.isInteger(document.deterministicSeed)||document.deterministicSeed<1||document.deterministicSeed>2147483647)issues.push({code:'EVENT-DRAFT-SEED',severity:'error',message:labels.seed})
  for(const handler of document.handlers){
    if(typeof handler.callback!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handler.callback))issues.push({code:'EVENT-DRAFT-CALLBACK',severity:'error',message:labels.callback,handlerUuid:handler.uuid})
    if(!Number.isInteger(handler.priority)||handler.priority< -1000000||handler.priority>1000000)issues.push({code:'EVENT-DRAFT-PRIORITY',severity:'error',message:labels.priority,handlerUuid:handler.uuid})
  }
  return issues
}
