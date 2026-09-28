import type { App } from 'vue'
import UiButton from './components/UiButton.vue'
import UiDialog from './components/UiDialog.vue'
import UiMenu from './components/UiMenu.vue'
import UiPanelHeader from './components/UiPanelHeader.vue'
import UiTabs from './components/UiTabs.vue'
import UiTreeRow from './components/UiTreeRow.vue'
import UiNumberField from './components/UiNumberField.vue'
import UiPropertyRow from './components/UiPropertyRow.vue'
import UiPropertySection from './components/UiPropertySection.vue'
import UiSlider from './components/UiSlider.vue'
import UiToggle from './components/UiToggle.vue'

export function installEditorUi(app: App): void {
  const components = { UiButton, UiDialog, UiMenu, UiPanelHeader, UiTabs, UiTreeRow, UiNumberField, UiPropertyRow, UiPropertySection, UiSlider, UiToggle }
  for (const [name, component] of Object.entries(components)) app.component(name, component)
}

declare module 'vue' {
  export interface GlobalComponents {
    UiButton: typeof UiButton
    UiDialog: typeof UiDialog
    UiMenu: typeof UiMenu
    UiPanelHeader: typeof UiPanelHeader
    UiTabs: typeof UiTabs
    UiTreeRow: typeof UiTreeRow
    UiNumberField: typeof UiNumberField
    UiPropertyRow: typeof UiPropertyRow
    UiPropertySection: typeof UiPropertySection
    UiSlider: typeof UiSlider
    UiToggle: typeof UiToggle
  }
}
