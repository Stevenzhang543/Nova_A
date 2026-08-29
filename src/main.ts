import { createApp } from "vue";
import App from "./App.vue";
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './assets/main.css'
import { installCrashReporter } from './runtime/crashReporter'
import { reportFatalError } from './runtime/faultCenter'

installCrashReporter('Nova_A Editor')
const app = createApp(App)
app.config.errorHandler = (error, _instance, info) => { reportFatalError(error, `Vue: ${info}`) }
try { app.mount("#app") }
catch (error) {
  reportFatalError(error, 'Application mount')
  const root = document.querySelector<HTMLElement>('#app')
  if (root) root.innerHTML = '<main class="app-loading" role="alert">Nova_A could not start. Reload with ?safe-mode=1 or inspect the local crash log.</main>'
}
