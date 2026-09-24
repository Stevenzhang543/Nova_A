/** 编辑器网页启动入口：注册应用及全局行为，挂载 Nova_A 编辑界面。 */
import { createApp } from "vue";
import App from "./App.vue";
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './assets/main.css'
import './assets/editorReadability.css'
import { installCrashReporter } from './runtime/crashReporter'
import { reportFatalError } from './runtime/faultCenter'
import { installExternalLinkGuard } from './runtime/externalLinks'

installCrashReporter('Nova_A Editor')
installExternalLinkGuard()
const app = createApp(App)
app.config.errorHandler = /** 执行时调用 reportFatalError(error, `Vue: ${info}`)；不显式返回调用结果。 */ (error, _instance, info) => { reportFatalError(error, `Vue: ${info}`) }
try { app.mount("#app") }
catch (error) {
  reportFatalError(error, 'Application mount')
  const root = document.querySelector<HTMLElement>('#app')
  if (root) root.innerHTML = '<main class="app-loading" role="alert">Nova_A could not start. Reload with ?safe-mode=1 or inspect the local crash log.</main>'
}
