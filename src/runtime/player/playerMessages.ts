/** 26.43 P-E2：独立播放器需要的少量界面与校验文字（不导入编辑器 i18n）。 */
export type PlayerLocale = 'en' | 'de' | 'zh'
const MESSAGES = {
  en: {
    playerLoading: 'Loading game…', playerLoadFailed: 'This game could not start: {message}', playerRetry: 'Try again',
    headlessServer: 'Headless authoritative server', headlessServerRunning: 'Authoritative headless simulation is running.',
    enterFullscreen: 'Full screen', exitFullscreen: 'Exit full screen', gameView: 'Game',
    invalidEntityRecord: 'Every entity must be an object.', unsupportedShape: 'Unsupported entity shape: {shape}',
    invalidProjectRoot: 'The project root must be an object or entity array.', virtualControls: 'Touch controls', gameUi: 'Game interface'
  },
  de: {
    playerLoading: 'Spiel wird geladen…', playerLoadFailed: 'Dieses Spiel konnte nicht starten: {message}', playerRetry: 'Erneut versuchen',
    headlessServer: 'Autoritativer Headless-Server', headlessServerRunning: 'Die autoritative Headless-Simulation läuft.',
    enterFullscreen: 'Vollbild', exitFullscreen: 'Vollbild beenden', gameView: 'Spiel',
    invalidEntityRecord: 'Jeder Objekteintrag muss ein Objekt sein.', unsupportedShape: 'Nicht unterstützte Objektform: {shape}',
    invalidProjectRoot: 'Der Projektstamm muss ein Objekt oder ein Objekt-Array sein.', virtualControls: 'Touch-Steuerung', gameUi: 'Spieloberfläche'
  },
  zh: {
    playerLoading: '正在加载游戏…', playerLoadFailed: '无法启动此游戏：{message}', playerRetry: '重试',
    headlessServer: '无界面权威服务器', headlessServerRunning: '权威无界面模拟正在运行。',
    enterFullscreen: '全屏', exitFullscreen: '退出全屏', gameView: '游戏',
    invalidEntityRecord: '每个对象记录都必须是对象。', unsupportedShape: '不支持的对象形状：{shape}',
    invalidProjectRoot: '项目根节点必须是对象或对象数组。', virtualControls: '触控按键', gameUi: '游戏界面'
  }
} as const
export type PlayerMessageKey = keyof typeof MESSAGES.en

/** The visitor's language (the game's own text comes from its localization tables, not from here). */
export function playerLocale(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): PlayerLocale {
  for (const language of languages) {
    const code = String(language || '').toLowerCase()
    if (code.startsWith('zh')) return 'zh'
    if (code.startsWith('de')) return 'de'
    if (code.startsWith('en')) return 'en'
  }
  return 'en'
}
export function createPlayerMessages(locale: PlayerLocale = playerLocale()) {
  const table = MESSAGES[locale] ?? MESSAGES.en
  return (key: PlayerMessageKey, parameters?: Record<string, string | number>): string =>
    String(table[key] ?? MESSAGES.en[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) => parameters && name in parameters ? String(parameters[name]) : match)
}
export type PlayerMessages = ReturnType<typeof createPlayerMessages>
