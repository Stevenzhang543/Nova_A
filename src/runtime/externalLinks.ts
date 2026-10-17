/** 外部链接打开：校验允许的链接并选择桌面或浏览器打开方式，处理打开失败。 */
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

/** 要求外链为无凭据的 HTTPS 地址且精确命中可信列表，否则拒绝打开。 */ export function trustedExternalUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || !TRUSTED_EXTERNAL_URLS.has(url.href)) {
    throw new Error('This external address is not permitted by Nova_A.')
  }
  return url.href
}

/** A true result means the open request succeeded, not that another browser rendered it. */
/** 验证可信地址后通过原生系统或浏览器新页打开，失败记录可恢复错误并提示用户。 */ export async function openExternalUrl(value: string): Promise<boolean> {
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
/** 在原生宿主安装点击拦截，将非下载、非同源链接转交可信外链入口，返回卸载函数。 */ export function installExternalLinkGuard(): () => void {
  const handle = /** 从事件路径查找链接，排除已处理事件和下载同源导航，再阻止默认跳转并安全打开外链。 */ (event: MouseEvent) => {
    if (event.defaultPrevented || !('__TAURI_INTERNALS__' in window)) return
    const anchor = event.composedPath().find(/** 识别事件传播路径中的真实超链接元素。 */ node => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
    if (!anchor || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href, document.baseURI)
    if (['http:', 'https:'].includes(url.protocol) && url.origin === location.origin) return
    event.preventDefault()
    void openExternalUrl(url.href)
  }
  document.addEventListener('click', handle)
  return /* 调用 document.removeEventListener('click', handle) 并返回调用结果。 */ () => document.removeEventListener('click', handle)
}
