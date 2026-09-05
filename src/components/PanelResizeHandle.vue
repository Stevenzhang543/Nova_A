<template>
  <div class="resize-handle panel-resize-handle" :class="[orientation,{dragging:drag!==null,disabled}]" role="separator" :tabindex="disabled ? -1 : 0" :aria-label="accessibleLabel" :aria-orientation="orientation" :aria-valuenow="Math.round(modelValue)" :aria-valuemin="minimum" :aria-valuemax="maximum" :aria-disabled="disabled" :title="accessibleLabel" @pointerdown.stop.prevent="start" @pointermove.stop="move" @pointerup.stop="finish" @pointercancel.stop="cancel" @lostpointercapture="lostCapture" @keydown="keyboard" @dblclick.stop.prevent="reset" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { preferencesState } from '../store/preferences'
import { clampPanelSize, draggedPanelSize, keyedPanelSize, visiblePanelSize } from '../editor/panelLayout'

const props = withDefaults(defineProps<{ modelValue:number; orientation:'vertical'|'horizontal'; minimum:number; maximum:number; resetValue?:number; reverse?:boolean; label:string; disabled?:boolean }>(),{reverse:false,disabled:false})
const emit=defineEmits<{ 'update:modelValue':[value:number];commit:[value:number];dragging:[value:boolean] }>()
const copy={en:'Resize; arrow keys, Shift for larger steps, Escape to cancel drag',de:'Größe ändern; Pfeiltasten, Umschalt für größere Schritte, Escape bricht Ziehen ab',zh:'调整大小；方向键调整，Shift 加大步长，Escape 取消拖动'}
const accessibleLabel=computed(()=>props.label+' — '+copy[preferencesState.locale])
const drag=shallowRef<{element:HTMLElement;id:number;coordinate:number;initial:number;visible:number;current:number;moved:boolean;scale:number;cursor:string;selection:string}|null>(null)
const coordinate=(event:PointerEvent)=>props.orientation==='vertical'?event.clientX:event.clientY
function start(event:PointerEvent) {
  if(props.disabled || event.button!==0 || drag.value)return
  const element=event.currentTarget as HTMLElement,parent=element.parentElement,rect=parent?.getBoundingClientRect()
  const size=props.orientation==='vertical'?parent?.offsetWidth:parent?.offsetHeight,physical=props.orientation==='vertical'?rect?.width:rect?.height
  drag.value={element,id:event.pointerId,coordinate:coordinate(event),initial:props.modelValue,visible:visiblePanelSize(props.modelValue,size,props.minimum,props.maximum),current:props.modelValue,moved:false,scale:size&&physical?physical/size:1,cursor:document.body.style.cursor,selection:document.body.style.userSelect}
  document.body.style.cursor=props.orientation==='vertical'?'ew-resize':'ns-resize';document.body.style.userSelect='none'
  element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);emit('dragging',true)
}
function move(event:PointerEvent) {const current=drag.value;if(!current||current.id!==event.pointerId)return;const distance=coordinate(event)-current.coordinate;if(distance!==0)current.moved=true;if(!current.moved)return;current.current=draggedPanelSize(current.visible,distance,current.scale,props.reverse,props.minimum,props.maximum);emit('update:modelValue',current.current)}
function end(restore:boolean,notify=true) {const current=drag.value;if(!current)return;drag.value=null;document.body.style.cursor=current.cursor;document.body.style.userSelect=current.selection;if(current.element.hasPointerCapture(current.id))current.element.releasePointerCapture(current.id);if(notify){const value=restore?current.initial:current.current;emit('update:modelValue',value);emit('commit',value);emit('dragging',false)}}
function finish(event:PointerEvent){if(drag.value?.id===event.pointerId){move(event);end(false)}}
function cancel(event:PointerEvent){if(drag.value?.id===event.pointerId)end(true)}
function lostCapture(event:PointerEvent){if(drag.value?.id===event.pointerId)end(true)}
function keyboard(event:KeyboardEvent) {if(event.key==='Escape'&&drag.value){event.preventDefault();event.stopPropagation();end(true);return}if(props.disabled||drag.value)return;const parent=(event.currentTarget as HTMLElement).parentElement,measured=props.orientation==='vertical'?parent?.offsetWidth:parent?.offsetHeight;const value=keyedPanelSize(visiblePanelSize(props.modelValue,measured,props.minimum,props.maximum),event.key,props.orientation,props.reverse,event.shiftKey,props.minimum,props.maximum);if(value===null)return;event.preventDefault();event.stopPropagation();emit('update:modelValue',value);emit('commit',value)}
function reset(){if(props.disabled||props.resetValue===undefined)return;end(true);const value=clampPanelSize(props.resetValue,props.minimum,props.maximum);emit('update:modelValue',value);emit('commit',value)}
watch(()=>props.disabled,disabled=>{if(disabled)end(true)})
onBeforeUnmount(()=>end(true,false))
</script>

<style scoped>
.panel-resize-handle{position:absolute;z-index:12;touch-action:none;user-select:none;outline:none;border:0;background:transparent;transition:background 120ms}
.panel-resize-handle.vertical{top:0;bottom:0;width:8px;cursor:ew-resize}
.panel-resize-handle.horizontal{left:0;right:0;height:8px;cursor:ns-resize}
.panel-resize-handle::after{content:'';position:absolute;border-radius:4px;background:var(--border-strong);opacity:.85}
.panel-resize-handle.vertical::after{width:3px;height:40px;left:3px;top:calc(50% - 20px)}
.panel-resize-handle.horizontal::after{height:3px;width:40px;top:3px;left:calc(50% - 20px)}
.panel-resize-handle:hover,.panel-resize-handle:focus-visible,.panel-resize-handle.dragging{background:var(--accent-soft)}
.panel-resize-handle:focus-visible::after,.panel-resize-handle:hover::after,.panel-resize-handle.dragging::after{background:var(--accent)}
.panel-resize-handle.disabled{display:none}
</style>
