<script lang="ts">
import { cloneVNode, computed, defineComponent, h, isVNode, provide, type VNode } from 'vue'
function nameControls(nodes: VNode[], label: string): VNode[] {
  return nodes.map(node => {
    if (!isVNode(node)) return node
    const interactive = typeof node.type === 'object' || ['input', 'select', 'textarea', 'button'].includes(String(node.type))
    const copy = cloneVNode(node, interactive && !node.props?.['aria-label'] && !node.props?.['aria-labelledby'] ? { 'aria-label': label } : {})
    if (Array.isArray(node.children)) {
      const pair = String(node.props?.class ?? '').split(' ').includes('pair')
      copy.children = node.children.map((child, index) => isVNode(child) ? nameControls([child], pair ? `${label} ${index === 0 ? 'X' : 'Y'}` : label)[0] : child)
    }
    return copy
  })
}
export default defineComponent({
  props: { label: { type: String, required: true }, help: String, unit: String, stacked: Boolean },
  setup(props, { slots }) {
    provide('ui-property-label', computed(() => props.label))
    return () => h('div', { class: ['ui-property-row', { 'ui-property-row--stacked': props.stacked }], role: 'group', 'aria-label': props.label }, [
      h('span', { class: 'ui-property-label', title: props.help }, [slots.label?.() ?? props.label, props.unit ? h('small', props.unit) : null]),
      h('div', { class: 'ui-property-control' }, [...nameControls(slots.default?.() ?? [], props.label), props.help ? h('small', { class: 'ui-property-help' }, props.help) : null]),
      slots.details?.(),
    ])
  },
})
</script>
