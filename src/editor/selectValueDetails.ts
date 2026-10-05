
/** Full selected values for native editor selects. One generation owns visibility and ARIA. */
import { animatePresence, cancelMotion } from '../ui/motion'
let dispose: (()=>void)|null=null
export function installSelectValueDetails():void{
 if(dispose||typeof document==='undefined')return
 const hint=document.createElement('div')
 hint.id='nova-selected-value-detail';hint.dataset.novaSelectDetail='true';hint.setAttribute('role','tooltip');hint.hidden=true
 document.body.append(hint)
 let active:HTMLSelectElement|null=null,generation=0
 const validOwner=(element:HTMLSelectElement)=>{
  if(!element.isConnected||!element.closest('.editor-root,.project-manager'))return false
  for(let node:HTMLElement|null=element;node;node=node.parentElement){const style=getComputedStyle(node);if(node.hidden||node.inert||node.getAttribute('aria-hidden')==='true'||style.display==='none'||style.visibility==='hidden')return false}
  return true
 }
 const ownerObserver=typeof MutationObserver==='function'?new MutationObserver(()=>{if(active&&!validOwner(active))hide()}):null
 const detach=()=>{
  if(!active)return
  const tokens=(active.getAttribute('aria-describedby')??'').split(/\s+/).filter(t=>t&&t!==hint.id)
  if(tokens.length)active.setAttribute('aria-describedby',tokens.join(' '));else active.removeAttribute('aria-describedby')
 }
 const place=(element:HTMLSelectElement)=>{
  const box=element.getBoundingClientRect(),inset=8
  hint.style.left=Math.max(inset,Math.min(box.left,innerWidth-hint.offsetWidth-inset))+'px'
  hint.style.top=Math.max(inset,Math.min(box.bottom+4,innerHeight-hint.offsetHeight-inset))+'px'
 }
 const hide=()=>{
  ownerObserver?.disconnect()
  if(hint.hidden)return
  detach();active=null;const ticket=++generation
  animatePresence(hint,'leave',()=>{if(ticket===generation&&!active)hint.hidden=true},{distance:3,scale:1,duration:'micro'})
 }
 const show=(element:HTMLSelectElement)=>{
  if(!validOwner(element)||element.closest('.canvas-container,.player-root,[data-game-ui-control]'))return
  const text=element.selectedOptions[0]?.textContent?.trim();if(!text)return
  if(active===element&&hint.textContent===text){place(element);return}
  detach();++generation;active=element;hint.textContent=text;hint.hidden=false
  ownerObserver?.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','inert','aria-hidden','class','style']})
  const ids=(element.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean)
  element.setAttribute('aria-describedby',[...new Set([...ids,hint.id])].join(' '))
  place(element);animatePresence(hint,'enter',undefined,{distance:3,scale:1,duration:'fast'})
 }
 const reposition=()=>{if(active){const box=active.getBoundingClientRect();if(!active.isConnected||!box.width||!box.height||box.bottom<0||box.top>innerHeight)hide();else place(active)}}
 const enter=(e:Event)=>{if(e.target instanceof HTMLSelectElement)show(e.target)}
 const focus=(e:Event)=>{if(active&&e.target!==active)hide();if(e.target instanceof HTMLSelectElement)show(e.target)}
 const intent=(e:Event)=>{if(active&&e.target!==active)hide()}
 const leave=(e:Event)=>{if(e.target===active&&document.activeElement!==active)hide()}
 const blur=(e:Event)=>{if(e.target===active)hide()}
 const change=(e:Event)=>{if(e.target===active&&active)show(active)}
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape')hide()}
 document.addEventListener('pointerover',enter,true);document.addEventListener('focusin',focus,true);document.addEventListener('pointerdown',intent,true)
 document.addEventListener('pointerout',leave,true);document.addEventListener('focusout',blur,true)
 document.addEventListener('change',change,true);document.addEventListener('input',change,true)
 document.addEventListener('keydown',key,true);document.addEventListener('scroll',reposition,true);window.addEventListener('resize',hide)
 dispose=()=>{
  ownerObserver?.disconnect();detach();active=null;++generation;cancelMotion(hint);hint.remove()
  document.removeEventListener('pointerover',enter,true);document.removeEventListener('focusin',focus,true);document.removeEventListener('pointerdown',intent,true)
  document.removeEventListener('pointerout',leave,true);document.removeEventListener('focusout',blur,true)
  document.removeEventListener('change',change,true);document.removeEventListener('input',change,true)
  document.removeEventListener('keydown',key,true);document.removeEventListener('scroll',reposition,true);window.removeEventListener('resize',hide)
 }
}
export function disposeSelectValueDetails():void{dispose?.();dispose=null}
