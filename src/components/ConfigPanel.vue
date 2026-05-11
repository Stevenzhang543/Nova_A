<template>
  <div class="config-wrapper">
    <div class="config-panel" :class="{ 'is-visible': selectedEntity !== null }">
      
      <div v-if="selectedEntity" class="settings-content">
        <h3 class="panel-title">Entity Settings</h3>
        <div class="entity-name">{{ selectedEntity.name }}_{{ selectedEntity.id }}</div>
        
        <hr /><div class="category-title">Body Type</div>
        <div class="prop-group">
          <select v-model="bodyType" class="full-select clean-dropdown">
            <option value="Dynamic">Dynamic</option>
            <option value="Kinematic">Kinematic</option>
            <option value="Static">Static</option>
          </select>
        </div>

        <div class="prop-group" style="margin-top: 8px;">
          <label>Collision Layer</label>
          <select v-model.number="selectedEntity.layer" class="full-select clean-dropdown">
            <option v-for="l in estate.layers" :key="l" :value="l">Layer {{ l }}</option>
          </select>
        </div>

        <hr /><div class="category-title">Appearance</div>
        <div class="prop-group" title="color">
          <div class="color-header">
            <label>Color (RGB)</label>
            <button class="color-btn" @click="openColorPicker">
              <img src="../assets/icons/color.svg" alt="Pick Color" />
            </button>
          </div>
          <input type="range" v-model.number="selectedEntity.color.r" min="0" max="255" />
          <input type="range" v-model.number="selectedEntity.color.g" min="0" max="255" />
          <input type="range" v-model.number="selectedEntity.color.b" min="0" max="255" />
        </div>
        <div class="prop-group">
          <label>Transparency (%)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.transparency" min="0" max="100" step="1" />
            <input type="number" v-model.number="selectedEntity.transparency" min="0" max="100" step="1" />
          </div>
        </div>

        <hr /><div class="category-title">Shape & Size</div>
        <div class="prop-group">
          <label>Absolute Size (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="absoluteSizeX" min="0.1" step="0.1" />
            <input type="number" v-model.number="absoluteSizeY" min="0.1" step="0.1" />
          </div>
        </div>

        <hr /><div class="category-title">Transform & Motion</div>
        <div class="prop-group">
          <label>Position (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="selectedEntity.transform.position.x" step="0.01" />
            <input type="number" v-model.number="selectedEntity.transform.position.y" step="0.01" />
          </div>
        </div>
        <div class="prop-group">
          <label>Rotation (Degrees)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="rotationDegrees" min="-180" max="180" step="1" />
            <input type="number" v-model.number="rotationDegrees" step="1" />
          </div>
        </div>
        <div class="prop-group">
          <label>Linear Velocity (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="selectedEntity.velocity.x" step="0.01" />
            <input type="number" v-model.number="selectedEntity.velocity.y" step="0.01" />
          </div>
        </div>
        <div class="prop-group">
          <label>Angular Velocity</label>
          <input type="number" v-model.number="selectedEntity.angularVelocity" step="0.01" />
        </div>
        <hr /><div class="category-title">Damping & Friction</div>
      <div class="prop-group">
        <label>Linear Damping</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity.linearDamping" min="0" max="1" step="0.01" @change="onConfigChange" /><input type="number" v-model.number="selectedEntity.linearDamping" step="0.01" @change="onConfigChange" /></div>
        </div>
        <div class="prop-group">
          <label>Angular Damping</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity!.angularDamping" min="0" max="1" step="0.01" @change="onConfigChange" /><input type="number" v-model.number="selectedEntity!.angularDamping" step="0.01" @change="onConfigChange" /></div>
        </div>
        <div class="prop-group">
          <label>Static Friction</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity!.staticFriction" min="0" max="1" step="0.01" @change="onConfigChange" /><input type="number" v-model.number="selectedEntity!.staticFriction" step="0.01" @change="onConfigChange" /></div>
        </div>
        <div class="prop-group">
          <label>Dynamic Friction</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity!.dynamicFriction" min="0" max="1" step="0.01" @change="onConfigChange" /><input type="number" v-model.number="selectedEntity!.dynamicFriction" step="0.01" @change="onConfigChange" /></div>
        </div>

        <hr /><div class="category-title">Mass Properties</div>
        <div class="prop-group text-display">
          <span>Inv Mass:</span> <span>{{ (selectedEntity!.mass > 0 && bodyType === 'Dynamic') ? (1/selectedEntity!.mass).toFixed(4) : '0 (Infinite)' }}</span>
        </div>
        <div class="prop-group text-display">
          <span>Inv Inertia:</span> <span>{{ (selectedEntity!.inertia > 0 && bodyType === 'Dynamic') ? (1/selectedEntity!.inertia).toFixed(4) : '0 (Infinite)' }}</span>
        </div>
        <div class="prop-group text-display">
          <span>Surface Area (m²):</span> <span>{{ entityArea.toFixed(2) }}</span>
        </div>
        
        <div class="prop-group">
          <label>Density (kg/m²)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity!.density" min="0.1" max="10" step="0.1" @input="onDensityChange" />
            <input type="number" v-model.number="selectedEntity!.density" step="0.1" @change="onDensityChange" />
          </div>
        </div>
        <div class="prop-group">
          <label>Mass (kg)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity!.mass" min="0.1" max="100" step="0.1" @input="onMassChange" />
            <input type="number" v-model.number="selectedEntity!.mass" step="0.1" @change="onMassChange" />
          </div>
        </div>
        
        <div class="prop-group">
          <label>Gravity Scale</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity!.gravityScale" min="0" max="5" step="0.1" /><input type="number" v-model.number="selectedEntity!.gravityScale" step="0.1" /></div>
        </div>
        <div class="prop-group"><label>Local Gravity Pull</label><input type="number" v-model.number="selectedEntity!.gravity" step="0.1" /></div>

        <hr /><div class="category-title">Continuous Forces</div>
        <div class="prop-group">
          <label>Force (X, Y)</label>
          <div class="row-inputs"><input type="number" v-model.number="selectedEntity!.force.x" step="0.01" /><input type="number" v-model.number="selectedEntity!.force.y" step="0.01" /></div>
        </div>
        <div class="prop-group"><label>Torque</label><input type="number" v-model.number="selectedEntity!.torque" step="0.01" /></div>

        <hr /><div class="category-title">Interactive Impulses</div>
        <div class="impulse-form">
          <div class="row-inputs"><input type="number" v-model.number="impulseX" placeholder="Force X" /><input type="number" v-model.number="impulseY" placeholder="Force Y" /></div>
          <div class="row-inputs"><input type="number" v-model.number="offsetX" placeholder="Offset X" /><input type="number" v-model.number="offsetY" placeholder="Offset Y" /></div>
          <button class="action-btn" @click="applyImpulse">Apply Linear Impulse</button>
          <div class="row-inputs"><input type="number" v-model.number="angularImpulse" placeholder="Torque (N·m·s)" style="width:100%" /></div>
          <button class="action-btn" @click="applyAngularImpulse">Apply Angular Impulse</button>
        </div>

        <hr /><div class="category-title">Material Response</div>
        <div class="prop-group switch-group">
          <label>Is Sensor</label>
          <label class="switch"><input type="checkbox" v-model="selectedEntity!.isSensor"><span class="slider round"></span></label>
        </div>
        <div class="prop-group">
          <label>Restitution (Bounciness)</label>
          <div class="row-inputs"><input type="range" v-model.number="selectedEntity!.restitution" min="0" max="1" step="0.01" /><input type="number" v-model.number="selectedEntity!.restitution" step="0.01" /></div>
        </div>
        <div class="prop-group"><label>Restitution Threshold (m/s)</label><input type="number" v-model.number="selectedEntity!.restitutionThreshold" step="0.1" /></div>

        <hr /><div class="category-title">Collision Diagnostics</div>
        <div class="prop-group text-display">
          <span>Contacts:</span> <span :class="{'active-contact': selectedEntity!.contactCount > 0}">{{ selectedEntity!.contactCount }}</span>
        </div>
        <div class="prop-group text-display" v-if="selectedEntity!.contactCount > 0"><span>Normal:</span> <span>[{{ selectedEntity!.contactNormal.x.toFixed(2) }}, {{ selectedEntity!.contactNormal.y.toFixed(2) }}]</span></div>
        <div class="prop-group text-display" v-if="selectedEntity!.contactCount > 0"><span>Penetration:</span> <span>{{ selectedEntity!.penetrationDepth.toFixed(3) }} m</span></div>

      </div>
    </div>

    <div v-if="showColorPicker" class="color-modal-overlay">
      <div class="color-modal">
        <h4>Select Color</h4>
        <input type="color" v-model="tempColor" class="native-color-picker" />
        <div class="modal-actions">
          <button @click="cancelColor">Cancel</button>
          <button @click="applyColor" class="primary">Next</button>
        </div>
      </div>
    </div>
   </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { physicsState as state, pushHistory } from '../store/physics'
import { editorState as estate } from '../store/editor'

const selectedEntity = computed(() => {
  if (state.selectedEntityId === null) return null
  return state.world.entities.find(e => e.id === state.selectedEntityId) || null
})

function onConfigChange() { pushHistory() }

const bodyType = computed({
  get() {
    if (!selectedEntity.value) return 'Dynamic'
    if (selectedEntity.value.isStatic) return 'Static'
    if (selectedEntity.value.isKinematic) return 'Kinematic'
    return 'Dynamic'
  },
  set(val: string) {
    if (selectedEntity.value) {
      selectedEntity.value.isStatic = val === 'Static'
      selectedEntity.value.isKinematic = val === 'Kinematic'
    }
  }
})

const entityArea = computed(() => {
  const e = selectedEntity.value;
  if (!e) return 0;
  let a = absoluteSizeX.value * absoluteSizeY.value;
  if (e.shapeType === 'Circle') a = Math.PI * (absoluteSizeX.value / 2) * (absoluteSizeY.value / 2);
  if (e.shapeType === 'Triangle') a = a / 2;
  return a;
});

function onDensityChange() {
  if (selectedEntity.value) selectedEntity.value.mass = selectedEntity.value.density * entityArea.value;
}

function onMassChange() {
  if (selectedEntity.value && entityArea.value > 0) {
    selectedEntity.value.density = selectedEntity.value.mass / entityArea.value;
  }
}

watch(entityArea, (newArea) => {
  if (selectedEntity.value && !selectedEntity.value.isStatic && newArea > 0) {
    selectedEntity.value.mass = selectedEntity.value.density * newArea;
  }
})

const impulseX = ref(0); const impulseY = ref(0); const offsetX = ref(0); const offsetY = ref(0); const angularImpulse = ref(0)

function applyImpulse() {
  if (!selectedEntity.value || bodyType.value !== 'Dynamic') return
  const e = selectedEntity.value
  e.velocity.x += impulseX.value / e.mass
  e.velocity.y += impulseY.value / e.mass
  const cross = (offsetX.value * impulseY.value) - (offsetY.value * impulseX.value)
  e.angularVelocity += cross / e.inertia
}

function applyAngularImpulse() {
  if (!selectedEntity.value || bodyType.value !== 'Dynamic') return
  selectedEntity.value.angularVelocity += angularImpulse.value / selectedEntity.value.inertia
}

const showColorPicker = ref(false)
const tempColor = ref('#ffffff')

function openColorPicker() {
  if (!selectedEntity.value) return
  const { r, g, b } = selectedEntity.value.color
  tempColor.value = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)
  showColorPicker.value = true
}

function applyColor() {
  if (selectedEntity.value) {
    const hex = tempColor.value.replace(/^#/, '')
    const bigint = parseInt(hex, 16)
    selectedEntity.value.color.r = (bigint >> 16) & 255; selectedEntity.value.color.g = (bigint >> 8) & 255; selectedEntity.value.color.b = bigint & 255
  }
  showColorPicker.value = false
}

function cancelColor() { showColorPicker.value = false }

const rotationDegrees = computed({
  get() {
    if (!selectedEntity.value) return 0
    return parseFloat((selectedEntity.value.transform.rotation * (-180 / Math.PI)).toFixed(1))
  },
  set(val: number) {
    if (selectedEntity.value) { selectedEntity.value.transform.rotation = val * (-Math.PI / 180) }
  }
})

const absoluteSizeX = computed({
  get() {
    const e = selectedEntity.value; if (!e) return 0;
    if (e.shapeType === 'Circle') return parseFloat(((e as any).radiusX * 2 * e.transform.scale.x).toFixed(1));
    let minX = Infinity, mxX = -Infinity;
    for (const v of (e as any).vertices) { if (v.x < minX) minX = v.x; if (v.x > mxX) mxX = v.x; }
    return parseFloat(((mxX - minX) * e.transform.scale.x).toFixed(1));
  },
  set(val: number) {
    const e = selectedEntity.value; if (!e || val <= 0.1) return;
    if (e.shapeType === 'Circle') e.transform.scale.x = val / ((e as any).radiusX * 2);
    else {
      let minX = Infinity, mxX = -Infinity;
      for (const v of (e as any).vertices) { if (v.x < minX) minX = v.x; if (v.x > mxX) mxX = v.x; }
      e.transform.scale.x = val / (mxX - minX);
    }
  }
})

const absoluteSizeY = computed({
  get() {
    const e = selectedEntity.value; if (!e) return 0;
    if (e.shapeType === 'Circle') return parseFloat(((e as any).radiusY * 2 * e.transform.scale.y).toFixed(1));
    let minY = Infinity, mxY = -Infinity;
    for (const v of (e as any).vertices) { if (v.y < minY) minY = v.y; if (v.y > mxY) mxY = v.y; }
    return parseFloat(((mxY - minY) * e.transform.scale.y).toFixed(1));
  },
  set(val: number) {
    const e = selectedEntity.value; if (!e || val <= 0.1) return;
    if (e.shapeType === 'Circle') e.transform.scale.y = val / ((e as any).radiusY * 2);
    else {
      let minY = Infinity, mxY = -Infinity;
      for (const v of (e as any).vertices) { if (v.y < minY) minY = v.y; if (v.y > mxY) mxY = v.y; }
      e.transform.scale.y = val / (mxY - minY);
    }
  }
})
</script>

<style scoped>
.config-wrapper { position: absolute; top: 32px; bottom: 24px; right: 0; width: 25%; max-width: 300px; min-width: 220px; z-index: 100; pointer-events: none; }
.config-panel { 
  position: absolute; top: 0; bottom: 0; right: -60px; width: calc(100% + 60px); 
  background: rgba(37, 37, 38, 0.95); backdrop-filter: blur(8px); 
  padding: 16px 76px 16px 16px; transform: translateX(100%); 
  transition: transform 0.2s ease-out; /* Smooth instant slide */
  pointer-events: auto; display: flex; flex-direction: column; 
  overflow-y: auto; overflow-x: hidden; box-shadow: -4px 0 12px rgba(0,0,0,0.3); color: #ccc;
}
.config-panel.is-visible { transform: translateX(0); }
.settings-content { display: flex; flex-direction: column; gap: 12px; }
.panel-title { text-align: center; margin: 0; font-size: 16px; color: #fff; }
.entity-name { text-align: center; font-size: 12px; color: #0078d4; }
.category-title { color: #888; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
hr { border: none; border-top: 1px solid #444; margin: 4px 0; }
.prop-group { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.prop-group label { color: #aaa; font-weight: bold; }
.row-inputs { display: flex; gap: 8px; align-items: center; width: 100%; }
.row-inputs input[type="range"] { flex: 1; }
.row-inputs input[type="number"], .settings-content input[type="number"] { width: 60px; background: #1e1e1e; border: 1px solid #444; color: white; padding: 2px 4px; border-radius: 2px; }
.settings-content input[type="number"] { width: 100%; box-sizing: border-box; }
.row-inputs input[type="number"] { width: 60px; }
.switch-group { flex-direction: row; justify-content: space-between; align-items: center; }
input[type="range"] { appearance: none; -webkit-appearance: none; width: 100%; background: transparent; margin: 4px 0; }
input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #444; border-radius: 2px; }
input[type="range"]::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #0078d4; margin-top: -4px; cursor: pointer; transition: transform 0.2s; }
.switch { position: relative; display: inline-block; width: 34px; height: 20px; margin: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #0078d4; }
input:checked + .slider:before { transform: translateX(14px); }
.slider.round { border-radius: 34px; }
.slider.round:before { border-radius: 50%; }
.color-header { display: flex; justify-content: space-between; align-items: center; }
.color-btn { background: transparent; border: none; cursor: pointer; padding: 2px; display: flex; }
.color-btn img { width: 16px; height: 16px; filter: invert(1); opacity: 0.8; }
.color-btn:hover img { opacity: 1; }
.color-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; pointer-events: auto; }
.color-modal { background: #252526; border: 1px solid #444; padding: 16px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.color-modal h4 { margin: 0; color: #fff; font-size: 14px; }
.native-color-picker { width: 64px; height: 64px; padding: 0; border: none; border-radius: 4px; cursor: pointer; background: transparent; }
.modal-actions { display: flex; gap: 8px; width: 100%; }
.modal-actions button { flex: 1; padding: 6px; background: #333; color: #ccc; border: 1px solid #555; border-radius: 4px; }
.modal-actions button:hover { background: #444; }
.modal-actions button.primary { background: #0078d4; color: white; border-color: #0078d4; }
.modal-actions button.primary:hover { background: #0086eb; }

.full-select { width: 100%; background: #1e1e1e; color: white; border: 1px solid #444; padding: 4px; border-radius: 4px; }

.clean-dropdown {
  appearance: none; -webkit-appearance: none; -moz-appearance: none; outline: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
  background-repeat: no-repeat; background-position-x: 98%; background-position-y: 50%; padding-right: 20px;
}
.clean-dropdown:focus { border-color: #0078d4; }

.text-display { flex-direction: row; justify-content: space-between; font-size: 11px; }
.text-display span:last-child { color: #0078d4; font-family: monospace; }
.active-contact { color: #ff4500 !important; font-weight: bold; }
.impulse-form { display: flex; flex-direction: column; gap: 8px; }
.action-btn { background: #0078d4; color: white; border: none; padding: 4px; cursor: pointer; border-radius: 4px; }
.action-btn:hover { background: #0086eb; }
</style>