import { watch } from 'vue'
import { preferencesState, type ThemeMode } from '../store/preferences'

/** Relative public URLs work in the desktop WebView and root or nested Web hosting. */
export function brandImageUrl(theme: ThemeMode): string {
  return `${import.meta.env.BASE_URL}branding/nova-${theme}-256.png`
}

export function brandFaviconUrl(theme: ThemeMode): string {
  return `${import.meta.env.BASE_URL}${theme === 'light' ? 'nova-icon-light-32.png' : 'nova-icon-32.png'}`
}

/** The editor owns its favicon; exported games keep their own entry and identity. */
export function installAppBranding(): () => void {
  return watch(() => preferencesState.theme, theme => {
    const favicon = document.querySelector<HTMLLinkElement>('#nova-app-icon')
    if (favicon) favicon.href = brandFaviconUrl(theme)
  }, { immediate: true })
}
