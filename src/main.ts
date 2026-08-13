import { createApp } from "vue";
import App from "./App.vue";
import './assets/main.css'
import { installCrashReporter } from './runtime/crashReporter'

installCrashReporter('Nova_A Editor')
createApp(App).mount("#app");
