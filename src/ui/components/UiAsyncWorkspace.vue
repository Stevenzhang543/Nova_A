<template>
  <section class="ui-workspace-host" data-ui-motion-surface="smooth" data-ui-motion-opacity="preserve" :data-ui-motion-key="displayed" :aria-busy="pending || undefined" :data-displayed-view="displayed">
    <KeepAlive v-if="cache" :max="12"><component :is="current" v-if="current" :key="displayed" :inert="pending || undefined" /></KeepAlive>
    <component :is="current" v-else-if="current" :key="displayed" :inert="pending || undefined" />
    <div v-if="pending" class="ui-loading-line" role="status">{{ t('loading') }}</div>
    <div v-if="error" class="ui-workspace-error" role="alert"><span>{{ error }}</span><button type="button" @click="load(view)">{{ t('retry') }}</button></div>
  </section>
</template>
<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch, type Component } from 'vue'
import { t } from '../../i18n'
const props = withDefaults(defineProps<{ view: string; loaders: Record<string, () => Promise<{ default: Component }>>; cache?: boolean }>(), { cache: true })
const emit = defineEmits<{ display: [view: string] }>()
const current = shallowRef<Component | null>(null), displayed = ref(''), pending = ref(false), error = ref('')
const resolved = new Map<string, Component>()
let revision = 0
async function load(view: string) {
  const ticket = ++revision, loader = props.loaders[view]
  error.value = ''
  if (!loader) { current.value = null; displayed.value = view; pending.value = false; emit('display', view); return }
  pending.value = !resolved.has(view)
  try {
    const component = resolved.get(view) ?? markRaw((await loader()).default)
    resolved.set(view, component)
    if (ticket !== revision) return
    current.value = component; displayed.value = view; pending.value = false; emit('display', view)
  } catch (failure) {
    if (ticket !== revision) return
    pending.value = false
    error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
watch(() => props.view, load, { immediate: true })
onBeforeUnmount(() => { revision++ })
</script>
