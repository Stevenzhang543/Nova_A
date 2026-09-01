<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { createSemanticEvidence, detectNativeAccessibilityCapabilities, downloadSemanticEvidence, nativeAccessibilityState } from '../runtime/accessibilityEvidence'
import { gameUiRuntime } from '../runtime/gameUi'
import { activeTextDirection, localizationSettings } from '../runtime/localization'
import { runtimeAccessibilitySettings } from '../runtime/presentation'
import { preferencesState } from '../store/preferences'

const words={en:{title:'Semantic evidence',subtitle:'Inspect the accessibility tree exported by the player.',bridge:'Native bridge',provider:'Provider',nodes:'Semantic nodes',issues:'Issues',refresh:'Refresh bridge',download:'Export snapshot',empty:'Run the Game view once to populate current runtime bounds.',honest:'Custom native adapters are not claimed unless the host reports them.'},de:{title:'Semantischer Nachweis',subtitle:'Barrierefreiheitsbaum des Players prüfen.',bridge:'Native Brücke',provider:'Anbieter',nodes:'Semantische Knoten',issues:'Probleme',refresh:'Brücke aktualisieren',download:'Snapshot exportieren',empty:'Game-Ansicht einmal starten, um aktuelle Laufzeitgrenzen zu erfassen.',honest:'Eigene native Adapter werden nur bei Bestätigung durch den Host angegeben.'},zh:{title:'语义无障碍证据',subtitle:'检查播放器导出的无障碍树。',bridge:'原生桥接',provider:'提供者',nodes:'语义节点',issues:'问题',refresh:'刷新桥接',download:'导出快照',empty:'请先运行一次游戏视图，以生成当前运行时边界。',honest:'仅当主机确认时才声明自定义原生适配器。'}}as const
function l(key:keyof typeof words.en):string{return(words[preferencesState.locale]??words.en)[key]}
const snapshot=computed(()=>createSemanticEvidence(gameUiRuntime.accessibilityNodes(),{locale:localizationSettings.previewLocale,direction:activeTextDirection(),textScale:runtimeAccessibilitySettings.textScale}))
function download():void{downloadSemanticEvidence(snapshot.value,`nova-accessibility-${localizationSettings.previewLocale}.json`)}
onMounted(()=>void detectNativeAccessibilityCapabilities())
</script>

<template>
  <section class="semantic-card">
    <header><div><strong>{{ l('title') }}</strong><p>{{ l('subtitle') }}</p></div><span :class="{ready:nativeAccessibilityState.capabilities.webviewDomBridge}">{{ nativeAccessibilityState.capabilities.webviewDomBridge?'✓':'—' }} {{ l('bridge') }}</span></header>
    <dl><div><dt>{{ l('provider') }}</dt><dd>{{ nativeAccessibilityState.capabilities.automationProvider }}</dd></div><div><dt>{{ l('nodes') }}</dt><dd>{{ snapshot.nodes.length }}</dd></div><div><dt>{{ l('issues') }}</dt><dd>{{ snapshot.issues.length }}</dd></div><div><dt>400%</dt><dd>{{ runtimeAccessibilitySettings.textScale.toFixed(2) }}×</dd></div></dl>
    <p v-if="!snapshot.nodes.length">{{ l('empty') }}</p><p>{{ l('honest') }}</p>
    <ul><li v-for="note in nativeAccessibilityState.capabilities.notes" :key="note">{{ note }}</li></ul>
    <article v-for="issue in snapshot.issues.slice(0,20)" :key="`${issue.uuid}:${issue.code}`" :class="issue.severity"><strong>{{ issue.code }}</strong><span>{{ issue.message }}</span></article>
    <div class="actions"><button :disabled="nativeAccessibilityState.loading" @click="detectNativeAccessibilityCapabilities">{{ l('refresh') }}</button><button class="primary" @click="download">{{ l('download') }}</button></div>
    <p v-if="nativeAccessibilityState.error" class="error" role="alert">{{ nativeAccessibilityState.error }}</p>
  </section>
</template>

<style scoped>
.semantic-card{padding:11px;display:grid;gap:8px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2)}.semantic-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.semantic-card header div{min-width:0}.semantic-card header strong{font-size:13px}.semantic-card header p,.semantic-card>p,.semantic-card li{margin:2px 0;color:var(--text-muted);font-size:12px;line-height:1.45}.semantic-card header>span{padding:4px 7px;border-radius:99px;color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent);font-size:11px;white-space:nowrap}.semantic-card header>span.ready{color:var(--success);background:color-mix(in srgb,var(--success) 10%,transparent)}dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:5px}dl div{padding:6px;border-radius:7px;background:var(--surface-3)}dt{color:var(--text-muted);font-size:11px}dd{margin:2px 0 0;overflow-wrap:anywhere;font-size:12px}.semantic-card ul{margin:0;padding-left:16px}.semantic-card article{padding:6px;display:grid;grid-template-columns:minmax(150px,.4fr) 1fr;gap:6px;border-radius:7px;background:var(--surface-3);font-size:12px}.semantic-card article.error strong,.error{color:var(--danger)}.semantic-card article.warning strong{color:var(--warning)}.actions{display:flex;gap:6px;flex-wrap:wrap}.actions button{min-height:31px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.actions button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
</style>

