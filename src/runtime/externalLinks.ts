import { openUrl } from '@tauri-apps/plugin-opener'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { reportRecoverableError } from './faultCenter'
import { notify } from './editorFeedback'

const TRUSTED_EXTERNAL_URLS = new Set([
  'https://whitelists.top/',
  'https://github.com/Stevenzhang543/Nova_A/',
  'https://github.com/Stevenzhang543/Nova_A/security'
])

export function trustedExternalUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || !TRUSTED_EXTERNAL_URLS.has(url.href)) {
    throw new Error('This external address is not permitted by Nova_A.')
  }
  return url.href
}

/** A true result means the open request succeeded, not that another browser rendered it. */
export async function openExternalUrl(value: string): Promise<boolean> {
  try {
    const url = trustedExternalUrl(value)
    if ('__TAURI_INTERNALS__' in window) await openUrl(url)
    else {
      const anchor = document.createElement('a')
      anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'
      anchor.click()
    }
    return true
  } catch (error) {
    reportRecoverableError(error, t('openProjectWebsite'), 'Editor')
    editorState.statusText = t('openWebsiteFailed')
    notify(editorState.statusText, 'error')
    return false
  }
}

/** Handle native links before the opener plugin's window listener, whose rejection is unhandled. */
export function installExternalLinkGuard(): () => void {
  const handle = (event: MouseEvent) => {
    if (event.defaultPrevented || !('__TAURI_INTERNALS__' in window)) return
    const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
    if (!anchor || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href, document.baseURI)
    if (['http:', 'https:'].includes(url.protocol) && url.origin === location.origin) return
    event.preventDefault()
    void openExternalUrl(url.href)
  }
  document.addEventListener('click', handle)
  return () => document.removeEventListener('click', handle)
}
