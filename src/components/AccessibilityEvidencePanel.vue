<!-- 语义无障碍证据面板：展示运行时语义树、桥接能力与问题，并允许导出快照。 -->
<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { computed, onMounted } from 'vue'
import { createSemanticEvidence, detectNativeAccessibilityCapabilities, downloadSemanticEvidence, nativeAccessibilityState } from '../runtime/accessibilityEvidence'
import { gameUiRuntime } from '../runtime/gameUi'
import { activeTextDirection, localizationSettings } from '../runtime/localization'
import { runtimeAccessibilitySettings } from '../runtime/presentation'
import { preferencesState } from '../store/preferences'

const words={en:{title:'Semantic evidence',subtitle:'Inspect the accessibility tree exported by the player.',bridge:'Native bridge',provider:'Provider',nodes:'Semantic nodes',issues:'Issues',refresh:'Refresh bridge',download:'Export snapshot',empty:'Run the Game view once to populate current runtime bounds.',honest:'Custom native adapters are not claimed unless the host reports them.'},de:{title:'Semantischer Nachweis',subtitle:'Barrierefreiheitsbaum des Players prüfen.',bridge:'Native Brücke',provider:'Anbieter',nodes:'Semantische Knoten',issues:'Probleme',refresh:'Brücke aktualisieren',download:'Snapshot exportieren',empty:'Game-Ansicht einmal starten, um aktuelle Laufzeitgrenzen zu erfassen.',honest:'Eigene native Adapter werden nur bei Bestätigung durch den Host angegeben.'},zh:{title:'语义无障碍证据',subtitle:'检查播放器导出的无障碍树。',bridge:'原生桥接',provider:'提供者',nodes:'语义节点',issues:'问题',refresh:'刷新桥接',download:'导出快照',empty:'请先运行一次游戏视图，以生成当前运行时边界。',honest:'仅当主机确认时才声明自定义原生适配器。'}}as const
/** 按编辑器语言选择本面板文案，未知语言回退到英文。 */ function l(key:keyof typeof words.en):string{return(words[preferencesState.locale]??words.en)[key]}
const snapshot=computed(/** 使用当前游戏语义节点、预览语言、阅读方向与文字缩放生成证据快照。 */ ()=>createSemanticEvidence(gameUiRuntime.accessibilityNodes(),{locale:localizationSettings.previewLocale,direction:activeTextDirection(),textScale:runtimeAccessibilitySettings.textScale}))
/** 将当前语义证据下载为带预览语言标识的 JSON 文件。 */ function download():void{downloadSemanticEvidence(snapshot.value,`nova-accessibility-${localizationSettings.previewLocale}.json`)}
onMounted(/** 面板挂载后启动原生无障碍桥接能力检测。 */ ()=>void detectNativeAccessibilityCapabilities())
</script>

<template>
  <section class="semantic-card">
    <header><div><strong>{{ l('title') }}</strong><p>{{ l('subtitle') }}</p></div><span :class="{ready:nativeAccessibilityState.capabilities.webviewDomBridge}"><EditorIcon :name="nativeAccessibilityState.capabilities.webviewDomBridge ? 'check' : 'warning'" /> {{ l('bridge') }}</span></header>
    <dl><div><dt>{{ l('provider') }}</dt><dd>{{ nativeAccessibilityState.capabilities.automationProvider }}</dd></div><div><dt>{{ l('nodes') }}</dt><dd>{{ snapshot.nodes.length }}</dd></div><div><dt>{{ l('issues') }}</dt><dd>{{ snapshot.issues.length }}</dd></div><div><dt>400%</dt><dd>{{ runtimeAccessibilitySettings.textScale.toFixed(2) }}×</dd></div></dl>
    <p v-if="!snapshot.nodes.length">{{ l('empty') }}</p><p>{{ l('honest') }}</p>
    <ul><li v-for="note in nativeAccessibilityState.capabilities.notes" :key="note">{{ note }}</li></ul>
    <article v-for="issue in snapshot.issues.slice(0,20)" :key="`${issue.uuid}:${issue.code}`" :class="issue.severity"><strong>{{ issue.code }}</strong><span>{{ issue.message }}</span></article>
    <div class="actions"><UiButton icon="refresh" :label="l('refresh')" :disabled="nativeAccessibilityState.loading" @click="detectNativeAccessibilityCapabilities" /><button class="primary" @click="download">{{ l('download') }}</button></div>
    <p v-if="nativeAccessibilityState.error" class="error" role="alert">{{ nativeAccessibilityState.error }}</p>
  </section>
</template>

<style scoped> .semantic-card{display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-sm);border-top:1px solid var(--border-subtle)}.semantic-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--ui-space-sm)}.semantic-card header p,.semantic-card>p,.semantic-card li{margin:var(--ui-space-xs) 0;color:var(--text-muted);font-size:var(--type-caption)}.semantic-card header>span{display:flex;align-items:center;gap:var(--ui-space-xs);color:var(--warning);white-space:nowrap}.semantic-card header>span.ready{color:var(--success)}dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(12ch,1fr));gap:var(--ui-space-sm)}dl>div{padding-block:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle)}dt{color:var(--text-muted);font-size:var(--type-caption)}dd{margin:var(--ui-space-xs) 0;overflow-wrap:anywhere}.semantic-card article{display:grid;grid-template-columns:minmax(12ch,.4fr) minmax(0,1fr);gap:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle);padding-block:var(--ui-space-xs)}.semantic-card article.error,.error{color:var(--danger)}.semantic-card article.warning{color:var(--warning)}.actions{display:flex;gap:var(--ui-space-xs);flex-wrap:wrap}</style>
