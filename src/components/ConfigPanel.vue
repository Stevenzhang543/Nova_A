<template>
  <div class="config-wrapper" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <div class="hover-zone"></div>
    <div class="config-panel" :class="{ 'is-visible': isHovered }">
      
      <div v-if="selectedEntity" class="settings-content">
        <h3 class="panel-title">Entity Settings</h3>
        <div class="entity-name">{{ selectedEntity.name }}_{{ selectedEntity.id }}</div>
        
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
        <div class="prop-group" title="How transparent the object is">
          <label>Transparency (%)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.transparency" min="0" max="100" step="1" />
            <input type="number" v-model.number="selectedEntity.transparency" min="0" max="100" step="1" />
          </div>
        </div>

        <hr /><div class="category-title">Shape & Size</div>
        <div class="prop-group" title="How big the object is. Bigger objects collide sooner.">
          <label>Absolute Size (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="absoluteSizeX" min="0.1" step="0.1" />
            <input type="number" v-model.number="absoluteSizeY" min="0.1" step="0.1" />
          </div>
        </div>

        <hr /><div class="category-title">Transform</div>
        <div class="prop-group" title="How far left/right (x) and up/down (y) it is">
          <label>Position (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="selectedEntity.transform.position.x" step="0.01" />
            <input type="number" v-model.number="selectedEntity.transform.position.y" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="Positive = Clockwise. Negative = Counterclockwise">
          <label>Rotation (Degrees)</label>
          <div class="row-inputs">
            <input type="range" v-model.number="rotationDegrees" min="-180" max="180" step="1" />
            <input type="number" v-model.number="rotationDegrees" step="1" />
          </div>
        </div>

        <hr /><div class="category-title">Motion</div>
        <div class="prop-group" title="How fast and in what direction the object is moving">
          <label>Linear Velocity (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="selectedEntity.velocity.x" step="0.01" />
            <input type="number" v-model.number="selectedEntity.velocity.y" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="How fast the object spins.">
          <label>Angular Velocity</label>
          <input type="number" v-model.number="selectedEntity.angularVelocity" step="0.01" />
        </div>
        <div class="prop-group" title="Slows down movement over time">
          <label>Linear Damping</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.linearDamping" min="0" max="1" step="0.01" />
            <input type="number" v-model.number="selectedEntity.linearDamping" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="Slows down spinning over time">
          <label>Angular Damping</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.angularDamping" min="0" max="1" step="0.01" />
            <input type="number" v-model.number="selectedEntity.angularDamping" step="0.01" />
          </div>
        </div>

        <hr /><div class="category-title">Mass & Behavior</div>
        <div class="prop-group" title="How heavy the object is">
          <label>Mass</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.mass" min="0.1" max="100" step="0.1" />
            <input type="number" v-model.number="selectedEntity.mass" step="0.1" />
          </div>
        </div>
        <div class="prop-group" title="How much gravity affects the object. 1 = normal">
          <label>Gravity Scale</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.gravityScale" min="0" max="5" step="0.1" />
            <input type="number" v-model.number="selectedEntity.gravityScale" step="0.1" />
          </div>
        </div>

        <hr /><div class="category-title">Forces</div>
        <div class="prop-group" title="A push applied to the object">
          <label>Force (X, Y)</label>
          <div class="row-inputs">
            <input type="number" v-model.number="selectedEntity.force.x" step="0.01" />
            <input type="number" v-model.number="selectedEntity.force.y" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="A twisting force that makes the object spin">
          <label>Torque</label>
          <input type="number" v-model.number="selectedEntity.torque" step="0.01" />
        </div>
        <div class="prop-group" title="How gravity affects the object ONLY">
          <label>Local Gravity</label>
          <input type="number" v-model.number="selectedEntity.gravity" step="0.1" />
        </div>

        <hr /><div class="category-title">Material</div>
        <div class="prop-group" title="How bouncy the object is.">
          <label>Restitution</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.restitution" min="0" max="1" step="0.01" />
            <input type="number" v-model.number="selectedEntity.restitution" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="How hard it is to start moving when touching something">
          <label>Static Friction</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.staticFriction" min="0" max="1" step="0.01" />
            <input type="number" v-model.number="selectedEntity.staticFriction" step="0.01" />
          </div>
        </div>
        <div class="prop-group" title="How much it resists sliding after it starts moving">
          <label>Dynamic Friction</label>
          <div class="row-inputs">
            <input type="range" v-model.number="selectedEntity.dynamicFriction" min="0" max="1" step="0.01" />
            <input type="number" v-model.number="selectedEntity.dynamicFriction" step="0.01" />
          </div>
        </div>
        <hr /><div class="category-title">Collision State</div>
        <div class="prop-group switch-group" title="Object cannot move (like a wall)">
          <label>Is Static</label>
          <label class="switch"><input type="checkbox" v-model="selectedEntity.isStatic"><span class="slider round"></span></label>
        </div>
        <div class="prop-group switch-group" title="Moves only when you control it, not by physics">
          <label>Is Kinematic</label>
          <label class="switch"><input type="checkbox" v-model="selectedEntity.isKinematic"><span class="slider round"></span></label>
        </div>

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
import { physicsState as state } from '../store/physics'

const isHovered = ref(false)
let hoverTimeout: number | null = null

const selectedEntity = computed(() => {
  if (state.selectedEntityId === null) return null
  return state.world.entities.find(e => e.id === state.selectedEntityId) || null
})

// Auto-close if deselected
watch(selectedEntity, (newVal) => {
  if (!newVal) isHovered.value = false
})

function onMouseEnter() {
  if (!selectedEntity.value) return // Block slide-out if nothing is selected
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => { isHovered.value = true }, 100)
}

function onMouseLeave() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => { isHovered.value = false }, 350)
}

// Color Picker Logic
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
    selectedEntity.value.color.r = (bigint >> 16) & 255
    selectedEntity.value.color.g = (bigint >> 8) & 255
    selectedEntity.value.color.b = bigint & 255
  }
  showColorPicker.value = false
}

function cancelColor() { showColorPicker.value = false }
// Add these advanced computed properties right after `cancelColor()`:

// FIX: Rotation mapping. Negative mapping means Positive UI input = Clockwise visual rotation
const rotationDegrees = computed({
  get() {
    if (!selectedEntity.value) return 0
    return parseFloat((selectedEntity.value.transform.rotation * (-180 / Math.PI)).toFixed(1))
  },
  set(val: number) {
    if (selectedEntity.value) {
      selectedEntity.value.transform.rotation = val * (-Math.PI / 180)
    }
  }
})

// FIX: Absolute Size X calculated in real-time
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

// FIX: Absolute Size Y calculated in real-time
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
/* Inherited layout styles */
.config-wrapper { position: absolute; top: 32px; bottom: 24px; right: 0; width: 25%; max-width: 300px; min-width: 220px; z-index: 100; pointer-events: none; }
.hover-zone { position: absolute; top: 0; bottom: 0; right: 0; width: 40px; pointer-events: auto; }
/* Replace your .config-panel block to make it wider so it covers the visual gap when bouncing */
.config-panel { 
  position: absolute; 
  top: 0; bottom: 0; 
  right: -60px; /* Shifted to hide off screen */
  width: calc(100% + 60px); /* Expanded width */
  background: rgba(37, 37, 38, 0.95); 
  backdrop-filter: blur(8px); 
  padding: 16px 76px 16px 16px; /* Offset padding so text isn't hidden by the shift */
  transform: translateX(100%); 
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
  pointer-events: auto; 
  display: flex; flex-direction: column; 
  overflow-y: auto; overflow-x: hidden;
  box-shadow: -4px 0 12px rgba(0,0,0,0.3); color: #ccc;
}
.config-panel.is-visible { transform: translateX(0); }
.settings-content { display: flex; flex-direction: column; gap: 12px; }
.panel-title { text-align: center; margin: 0; font-size: 16px; color: #fff; }
.entity-name { text-align: center; font-size: 12px; color: #0078d4; }
.category-title { color: #888; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
hr { border: none; border-top: 1px solid #444; margin: 4px 0; }

/* Property Grouping */
.prop-group { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.prop-group label { color: #aaa; font-weight: bold; }
.row-inputs { display: flex; gap: 8px; align-items: center; width: 100%; }
.row-inputs input[type="range"] { flex: 1; }
.row-inputs input[type="number"] { width: 60px; background: #1e1e1e; border: 1px solid #444; color: white; padding: 2px 4px; border-radius: 2px; }

/* Switch Layout */
.switch-group { flex-direction: row; justify-content: space-between; align-items: center; }

/* Custom Range Slider */
input[type="range"] { appearance: none; -webkit-appearance: none; width: 100%; background: transparent; margin: 4px 0; }
input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #444; border-radius: 2px; }
input[type="range"]::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #0078d4; margin-top: -4px; cursor: pointer; transition: transform 0.2s; }

/* iOS Style Switch */
.switch { position: relative; display: inline-block; width: 34px; height: 20px; margin: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #0078d4; }
input:checked + .slider:before { transform: translateX(14px); }
.slider.round { border-radius: 34px; }
.slider.round:before { border-radius: 50%; }

/* ADD these to the bottom of your style block */
.color-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.color-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
}

.color-btn img {
  width: 16px;
  height: 16px;
  filter: invert(1); /* Ensure it shows up white */
  opacity: 0.8;
}

.color-btn:hover img {
  opacity: 1;
}

/* Color Picker Modal Styling */
.color-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.color-modal {
  background: #252526;
  border: 1px solid #444;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.color-modal h4 {
  margin: 0;
  color: #fff;
  font-size: 14px;
}

.native-color-picker {
  width: 64px;
  height: 64px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.modal-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.modal-actions button {
  flex: 1;
  padding: 6px;
  background: #333;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 4px;
}

.modal-actions button:hover {
  background: #444;
}

.modal-actions button.primary {
  background: #0078d4;
  color: white;
  border-color: #0078d4;
}

.modal-actions button.primary:hover {
  background: #0086eb;
}

.settings-content input[type="number"] {
  background: #1e1e1e;
  border: 1px solid #444;
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  width: 100%;
  box-sizing: border-box;
}

.row-inputs input[type="number"] {
  width: 60px;
}
</style>