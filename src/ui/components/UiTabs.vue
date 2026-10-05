<template>
  <nav ref="tabs" class="ui-tabs ui-tabs--motion" role="tablist" @keydown="navigate">
    <button v-for="item in items" :key="item.id" :id="item.tabId" :aria-controls="item.controls" type="button" role="tab" :disabled="item.disabled" :aria-selected="modelValue === item.id" :tabindex="modelValue === item.id ? 0 : -1" :class="{ active: modelValue === item.id }" :title="item.label" @click="select(item.id)"><EditorIcon v-if="item.icon" :name="item.icon" /><span>{{ item.label }}</span></button>
    <span ref="indicator" class="ui-tab-indicator" aria-hidden="true" :style="indicatorStyle" />
  </nav>
</template>
<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import EditorIcon, { type EditorIconName } from '../../components/EditorIcon.vue'
import { animateReorder, cancelMotion, captureRects } from '../motion'
const props = withDefaults(defineProps<{ modelValue: string; items: ReadonlyArray<{ id: string; label: string; icon?: EditorIconName; disabled?: boolean; tabId?: string; controls?: string }>; activation?: 'automatic' | 'manual' }>(), { activation: 'manual' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const tabs = ref<HTMLElement>(), indicator = ref<HTMLElement>()
const indicatorBounds = ref({ left: 0, width: 0 })
const indicatorStyle = computed(() => ({ left: `${indicatorBounds.value.left}px`, width: `${indicatorBounds.value.width}px` }))
let observer: ResizeObserver | undefined, generation = 0, suspended = false
async function updateIndicator(animate = true) {
  const revision = ++generation, root = tabs.value, bar = indicator.value
  if (!root || !bar || suspended) return
  const active = root.querySelector<HTMLElement>('button.active')
  if (!active) { cancelMotion(bar); indicatorBounds.value = { left: 0, width: 0 }; return }
  if (!root.getBoundingClientRect().width) return
  const before = captureRects([bar])
  const rr = root.getBoundingClientRect(), ar = active.getBoundingClientRect()
  const target = { left: ar.left - rr.left + root.scrollLeft, width: ar.width }
  if (animate && Math.abs(target.left - indicatorBounds.value.left) < .1 && Math.abs(target.width - indicatorBounds.value.width) < .1) return
  indicatorBounds.value = target
  await nextTick()
  if (revision !== generation || suspended) return
  if (animate) animateReorder(before, [bar])
  else cancelMotion(bar)
}
function observe() {
  suspended = false
  if (typeof ResizeObserver !== 'undefined') {
    observer ??= new ResizeObserver(() => { void updateIndicator(false) })
    if (tabs.value) { observer.observe(tabs.value); for (const button of tabs.value.querySelectorAll('button')) observer.observe(button) }
  }
  void updateIndicator(false)
}
function suspend() { suspended = true; generation++; observer?.disconnect(); if (indicator.value) cancelMotion(indicator.value) }
onMounted(observe)
onActivated(observe)
onDeactivated(suspend)
onBeforeUnmount(suspend)
watch([() => props.modelValue, () => JSON.stringify(props.items.map(item => [item.id, item.label, item.icon, Boolean(item.disabled), item.tabId, item.controls]))], () => { void updateIndicator() }, { flush: 'post' })
function select(value: string) { emit('update:modelValue', value); emit('change', value) }
function navigate(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const current = items.indexOf(event.target as HTMLButtonElement)
  if (current < 0 || !items.length) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length
  items[next]?.focus()
  if (props.activation === 'automatic') {
    const enabled = props.items.filter(item => !item.disabled)
    if (enabled[next]) select(enabled[next].id)
  }
}
</script>
