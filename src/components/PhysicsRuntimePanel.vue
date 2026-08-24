<template>
  <aside :class="['physics-runtime-panel', { collapsed: monitor.collapsed }]" :aria-label="t('physicsMonitor')">
    <header>
      <div class="heading">
        <span class="live-dot" aria-hidden="true"></span>
        <div><strong>{{ t('physicsMonitor') }}</strong><small>{{ status }}</small></div>
      </div>
      <button class="icon-button" :title="t(monitor.collapsed ? 'expandPanel' : 'collapsePanel')" @click="monitor.collapsed = !monitor.collapsed">
        <span aria-hidden="true">{{ monitor.collapsed ? '‹' : '›' }}</span>
      </button>
    </header>

    <template v-if="!monitor.collapsed">
      <nav class="tabs" role="tablist">
        <button :class="{ active: monitor.activeTab === 'bodies' }" role="tab" :aria-selected="monitor.activeTab === 'bodies'" @click.stop="monitor.activeTab = 'bodies'">
          {{ t('physicalProperties') }} <span>{{ monitor.bodies.length }}</span>
        </button>
        <button :class="{ active: monitor.activeTab === 'collisions' }" role="tab" :aria-selected="monitor.activeTab === 'collisions'" @click.stop="monitor.activeTab = 'collisions'">
          {{ t('collisionTimeline') }} <span>{{ monitor.collisions.length }}</span>
        </button>
      </nav>
      <div class="runtime-tools">
        <input v-model="monitor.query" type="search" :placeholder="t('filterRuntimeData')">
        <button :class="{ active: monitor.frozen }" @click="monitor.frozen = !monitor.frozen">{{ t(monitor.frozen ? 'resumeTelemetry' : 'freezeTelemetry') }}</button>
        <button v-if="monitor.activeTab === 'collisions'" :disabled="!monitor.collisions.length" @click="clearCollisionTimeline">{{ t('clear') }}</button>
      </div>

      <section v-if="monitor.activeTab === 'bodies'" class="telemetry-browser" role="tabpanel">
        <div class="virtual-list" @scroll="bodyScroll = ($event.target as HTMLElement).scrollTop">
          <div :style="{ height: `${bodyTop}px` }"></div>
          <button v-for="body in visibleBodies" :key="body.uuid" :class="{ active: selectedBody?.uuid === body.uuid }" @click="selectedBodyUuid = body.uuid"><span><strong>{{ body.name }}</strong><small>{{ body.bodyType }} · L{{ body.layer }}</small></span><code>{{ numberText(body.speed, 'm/s') }}</code></button>
          <div :style="{ height: `${bodyBottom}px` }"></div>
        </div>
        <article v-if="selectedBody" class="telemetry-card telemetry-detail">
          <div class="card-title"><strong>{{ selectedBody.name }}</strong><span>{{ selectedBody.bodyType }} · L{{ selectedBody.layer }}</span></div>
          <div class="metric-grid">
            <Metric :label="t('position')" :value="vectorText(selectedBody.position.x, selectedBody.position.y, 'm')" /><Metric :label="t('direction')" :value="numberText(selectedBody.directionDegrees, '°')" /><Metric :label="t('speed')" :value="numberText(selectedBody.speed, 'm/s')" /><Metric :label="t('velocity')" :value="vectorText(selectedBody.velocity.x, selectedBody.velocity.y, 'm/s')" /><Metric :label="t('acceleration')" :value="vectorText(selectedBody.acceleration.x, selectedBody.acceleration.y, 'm/s²')" /><Metric :label="t('force')" :value="vectorText(selectedBody.force.x, selectedBody.force.y, 'N')" /><Metric :label="t('angularVelocity')" :value="numberText(selectedBody.angularVelocity, 'rad/s')" /><Metric :label="t('kineticEnergy')" :value="numberText(selectedBody.kineticEnergy, 'J')" /><Metric :label="t('contacts')" :value="String(selectedBody.contactCount)" /><Metric :label="t('state')" :value="t(selectedBody.sleeping ? 'sleeping' : 'awake')" />
          </div>
        </article>
        <p v-if="!bodies.length" class="empty">{{ t('noPhysicalObjects') }}</p>
      </section>

      <section v-else class="telemetry-browser timeline" role="tabpanel">
        <div class="virtual-list" @scroll="collisionScroll = ($event.target as HTMLElement).scrollTop">
          <div :style="{ height: `${collisionTop}px` }"></div>
          <button v-for="collision in visibleCollisions" :key="collision.id" :class="{ active: selectedCollision?.id === collision.id }" @click="selectedCollisionId = collision.id"><span><strong>{{ collision.firstName }} ↔ {{ collision.secondName }}</strong><small>{{ typeLabel(collision.type) }} · {{ timeText(collision.recordedAt) }}</small></span><code>{{ numberText(collision.forceMagnitude, 'N') }}</code></button>
          <div :style="{ height: `${collisionBottom}px` }"></div>
        </div>
        <article v-if="selectedCollision" class="event-body telemetry-detail"><div class="card-title"><strong>{{ selectedCollision.firstName }} ↔ {{ selectedCollision.secondName }}</strong><span>{{ typeLabel(selectedCollision.type) }} · {{ timeText(selectedCollision.recordedAt) }}</span></div>
            <div class="metric-grid compact">
              <Metric :label="t('impactForce')" :value="numberText(selectedCollision.forceMagnitude, 'N')" /><Metric :label="t('impulse')" :value="numberText(selectedCollision.impulseMagnitude, 'N·s')" /><Metric :label="t('directionChange')" :value="numberText(selectedCollision.directionChangeDegrees, '°')" /><Metric :label="t('collisionPoint')" :value="vectorText(selectedCollision.point[0], selectedCollision.point[1], 'm')" /><Metric :label="t('normalForce')" :value="numberText(selectedCollision.normalForce, 'N')" /><Metric :label="t('frictionForce')" :value="numberText(selectedCollision.tangentForce, 'N')" /><Metric :label="t('incomingVelocity')" :value="vectorText(selectedCollision.incomingRelativeVelocity[0], selectedCollision.incomingRelativeVelocity[1], 'm/s')" /><Metric :label="t('resultingVelocity')" :value="vectorText(selectedCollision.resultingRelativeVelocity[0], selectedCollision.resultingRelativeVelocity[1], 'm/s')" />
            </div>
        </article>
        <p v-if="!collisions.length" class="empty">{{ t('noCollisionsRecorded') }}</p>
      </section>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { t } from '../i18n'
import { physicsState } from '../store/physics'
import { clearCollisionTimeline, physicsMonitorState as monitor } from '../runtime/physicsMonitor'

const Metric = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  setup: props => () => h('div', { class: 'metric' }, [h('span', props.label), h('strong', { title: props.value }, props.value)])
})

const query = computed(() => monitor.query.trim().toLocaleLowerCase())
const bodies = computed(() => query.value ? monitor.bodies.filter(body => `${body.name} ${body.bodyType} ${body.layer}`.toLocaleLowerCase().includes(query.value)) : monitor.bodies)
const collisions = computed(() => query.value ? monitor.collisions.filter(event => `${event.firstName} ${event.secondName} ${event.type}`.toLocaleLowerCase().includes(query.value)) : monitor.collisions)
const bodyScroll = ref(0), collisionScroll = ref(0), selectedBodyUuid = ref(''), selectedCollisionId = ref<number | null>(null)
const rowHeight = 46, visibleRows = 7
const bodyStart = computed(() => Math.max(0, Math.floor(bodyScroll.value / rowHeight) - 2)), collisionStart = computed(() => Math.max(0, Math.floor(collisionScroll.value / rowHeight) - 2))
const visibleBodies = computed(() => bodies.value.slice(bodyStart.value, bodyStart.value + visibleRows + 4)), visibleCollisions = computed(() => collisions.value.slice(collisionStart.value, collisionStart.value + visibleRows + 4))
const bodyTop = computed(() => bodyStart.value * rowHeight), bodyBottom = computed(() => Math.max(0, (bodies.value.length - bodyStart.value - visibleBodies.value.length) * rowHeight))
const collisionTop = computed(() => collisionStart.value * rowHeight), collisionBottom = computed(() => Math.max(0, (collisions.value.length - collisionStart.value - visibleCollisions.value.length) * rowHeight))
const selectedBody = computed(() => bodies.value.find(body => body.uuid === selectedBodyUuid.value) ?? bodies.value[0] ?? null)
const selectedCollision = computed(() => collisions.value.find(collision => collision.id === selectedCollisionId.value) ?? collisions.value[0] ?? null)
const status = computed(() => `${t(physicsState.playMode === 'paused' ? 'runtimePaused' : 'live')} · ${physicsState.engineDiagnostics.totalPhysicsSteps} ${t('steps')}`)

function clean(value: number): number { return Math.abs(value) < 5e-10 ? 0 : value }
function numberText(value: number, unit = ''): string { return `${clean(value).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit}`.trim() }
function vectorText(x: number, y: number, unit = ''): string { return `(${numberText(x)}, ${numberText(y)}) ${unit}`.trim() }
function timeText(value: number): string { return `${(value / 1000).toFixed(3)}s` }
function typeLabel(type: string): string { return t(type as Parameters<typeof t>[0]) }
</script>

<style scoped>
.physics-runtime-panel { position: relative; z-index: 190; width: clamp(340px, 26vw, 410px); min-width: 0; display: flex; flex: 0 0 auto; flex-direction: column; overflow: hidden; border-left: 1px solid var(--border-strong); background: color-mix(in srgb, var(--surface-1) 97%, transparent); box-shadow: -12px 0 32px color-mix(in srgb, #000 16%, transparent); backdrop-filter: blur(16px); }
.physics-runtime-panel.collapsed { width: 44px; }
header { min-height: 54px; padding: 9px 10px 9px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); }
.heading { min-width: 0; display: flex; align-items: center; gap: 10px; }
.heading div { min-width: 0; display: grid; gap: 2px; }
.heading strong, .heading small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.heading strong { font-size: 12px; } .heading small { color: var(--text-muted); font-size:11px; }
.live-dot { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 15%, transparent); animation: live-pulse 1.8s ease-in-out infinite; }
.collapsed .heading { display: none; }
.icon-button { width: 28px; height: 28px; flex: 0 0 auto; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); color: var(--text-secondary); font-size: 18px; }
.tabs { min-height: 40px; padding: 5px 8px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; border-bottom: 1px solid var(--border-subtle); }
.tabs button { min-width: 0; padding: 7px 6px; border: 0; border-bottom: 2px solid transparent; border-radius: 7px 7px 0 0; background: transparent; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tabs button.active { border-bottom-color: var(--accent); background: var(--surface-hover); color: var(--text-primary); }
.tabs span { margin-left: 4px; padding: 1px 5px; border-radius: 999px; background: var(--surface-3); color: var(--text-muted); font-size:11px; }
.runtime-tools { padding: 8px; display: grid; grid-template-columns: minmax(90px, 1fr) auto auto; gap: 5px; border-bottom: 1px solid var(--border-subtle); }
.runtime-tools input { width: 100%; min-width: 0; height: 30px; padding: 0 9px; }
.runtime-tools button { min-width: 0; height: 30px; padding: 0 9px; white-space: nowrap; }
.runtime-tools button.active { border-color: var(--accent); background: var(--accent-soft); }
.telemetry-browser{min-height:0;flex:1;padding:8px;display:flex;flex-direction:column;gap:8px;overflow:hidden}.virtual-list{height:180px;flex:0 0 180px;overflow:auto;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.virtual-list button{width:100%;height:46px;padding:5px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:0;border-bottom:1px solid var(--border-subtle);background:transparent;text-align:left}.virtual-list button.active{background:var(--selection-bg)}.virtual-list button>span{min-width:0;display:grid}.virtual-list strong,.virtual-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.virtual-list small{color:var(--text-muted)}.virtual-list code{color:var(--accent)}.telemetry-detail{min-height:0;overflow:auto}
.telemetry-card, .event-body { min-width: 0; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-2); }
.telemetry-card + .telemetry-card { margin-top: 8px; }
.card-title { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-title strong, .card-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-title strong { font-size: 11px; } .card-title span { color: var(--text-muted); font-size:11px; }
.metric-grid { margin-top: 9px; display: grid; grid-template-columns: 1fr 1fr; gap: 7px 10px; }
.metric { min-width: 0; display: grid; gap: 2px; }
.metric :deep(span) { color: var(--text-muted); font-size:11px; letter-spacing: .04em; text-transform: uppercase; }
.metric :deep(strong) { overflow: hidden; color: var(--text-secondary); font-family: var(--font-mono); font-size:11px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.timeline-event { min-width: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 5px; }
.timeline-event + .timeline-event { margin-top: 8px; }
.event-rail { position: relative; display: flex; justify-content: center; }
.event-rail::after { content: ''; position: absolute; top: 13px; bottom: -14px; width: 1px; background: var(--border-strong); }
.timeline-event:last-child .event-rail::after { display: none; }
.event-rail span { z-index: 1; width: 7px; height: 7px; margin-top: 12px; border: 2px solid var(--accent); border-radius: 50%; background: var(--surface-1); }
.empty { margin: 30px 12px; color: var(--text-muted); text-align: center; line-height: 1.5; }
@keyframes live-pulse { 50% { opacity: .58; transform: scale(.86); } }
@media (prefers-reduced-motion: reduce) { .live-dot { animation: none; } }
@media (max-width: 1250px) { .physics-runtime-panel { position: absolute; z-index: 190; top: 0; right: 0; bottom: 0; width: min(390px, calc(100vw - 72px)); } }
@media (max-width: 520px) { .metric-grid { grid-template-columns: 1fr; } .runtime-tools { grid-template-columns: 1fr 1fr; } .runtime-tools input { grid-column: 1 / -1; } }
</style>
