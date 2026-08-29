import { createApp } from 'vue'
import PlayerApp from './PlayerApp.vue'
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './assets/main.css'
import { installCrashReporter } from './runtime/crashReporter'

installCrashReporter('Nova Player')
createApp(PlayerApp).mount('#app')
