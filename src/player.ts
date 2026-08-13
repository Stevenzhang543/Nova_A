import { createApp } from 'vue'
import PlayerApp from './PlayerApp.vue'
import './assets/main.css'
import { installCrashReporter } from './runtime/crashReporter'

installCrashReporter('Nova Player')
createApp(PlayerApp).mount('#app')
