/** 平台前置条件的三语展示与宿主判定：不安装依赖，不把未检测的目标视为就绪。 */
export type PlatformLocale29 = 'en' | 'de' | 'zh'
export interface PlatformProbe29 { nativeAvailable?: boolean; nativeHost?: boolean; nativeReason?: string; host: string; architecture: string; androidAvailable?: boolean; androidReason?: string }
const copy = {
  en: {
    title: 'Runtime and build prerequisites', refresh: 'Refresh host detection',
    web: 'Web ZIP: no desktop SDK or backend is required for local editing and single-player games. Serve over HTTP(S); use HTTPS for installable PWA. Optional multiplayer needs an explicitly configured service and its CORS/TLS permissions.',
    browser: 'This browser cannot package a native executable. Choose Web ZIP, or open the matching-platform desktop editor. No Rust/SDK installation is needed to download a Web game.',
    probeFailed: 'The desktop export capability probe is unavailable or failed. Refresh detection and read its technical detail below; verify the player/template files belong to this build before retrying. This does not mean the editor is running in a browser.',
    mismatch: 'Native export requires the same operating system and architecture as the available player template. Use a matching-host desktop build; changing the target name does not cross-compile the player.',
    native: 'Desktop GUI/player exports use the system WebView. The shipped player template is reused; exporting a game does not require a local Rust compiler. Building Nova_A from source does require the platform SDK.',
    windows: 'Windows x64: install Microsoft Evergreen WebView2 Runtime. Portable EXE files do not embed it. Run scripts/check-windows-prerequisites.ps1 before first launch if the editor cannot open. Low-end settings reduce presentation work, not OS/runtime requirements.',
    linux: 'Linux: build on Linux with WebKitGTK 4.1, GTK 3, OpenSSL, a font package and distribution build tools. Driver/audio/input and clean-machine qualification are still pending.',
    macos: 'macOS: use a matching x86_64/arm64 Mac, Xcode Command Line Tools and the system WKWebView. Signed/notarized delivery and real-device acceptance remain separate gates.',
    android: 'Android requires JDK 17, SDK 35, build-tools, NDK 27 and a validated Nova_A Android template. Open Android Delivery for the exact missing items; refresh after installing them.',
    headless: 'This export mode disables rendering in a WebView-backed player; it still needs desktop runtime dependencies. The separate native physics JSONL command is windowless but does not run the full scripted game or networking transport.',
    unknown: 'No registered platform matches this target. Select a supported target before building.',
  },
  de: {
    title: 'Laufzeit- und Build-Voraussetzungen', refresh: 'Host-Erkennung aktualisieren',
    web: 'Web-ZIP: Für lokales Bearbeiten und Einzelspielerspiele sind weder Desktop-SDK noch Backend nötig. Über HTTP(S) bereitstellen; installierbare PWAs benötigen HTTPS. Optionaler Mehrspielermodus braucht einen expliziten Dienst mit CORS-/TLS-Berechtigungen.',
    browser: 'Dieser Browser kann keine native Anwendung paketieren. Web-ZIP wählen oder den Desktop-Editor auf dem Zielsystem öffnen. Zum Herunterladen eines Web-Spiels sind Rust und SDKs nicht nötig.',
    probeFailed: 'Die Export-Erkennung des Desktop-Editors ist fehlgeschlagen oder nicht verfügbar. Erkennung aktualisieren, technische Details prüfen und die Spielervorlagen dieses Builds kontrollieren. Das bedeutet nicht, dass der Editor in einem Browser läuft.',
    mismatch: 'Native Exporte benötigen Betriebssystem und Architektur der vorhandenen Spielervorlage. Einen passenden Desktop-Host verwenden; ein anderer Zielname kompiliert den Spieler nicht plattformübergreifend.',
    native: 'Desktop-Editor und Spieler verwenden die System-WebView. Der Spiel-Export verwendet die vorhandene Spielervorlage und benötigt keinen Rust-Compiler. Der Bau von Nova_A aus Quellcode benötigt dagegen das Plattform-SDK.',
    windows: 'Windows x64: Microsoft Evergreen WebView2 Runtime installieren. Portable EXE-Dateien enthalten sie nicht. Wenn der Editor nicht startet, zuerst scripts/check-windows-prerequisites.ps1 ausführen. Der Sparmodus senkt Darstellungsarbeit, nicht die Systemanforderungen.',
    linux: 'Linux: auf Linux mit WebKitGTK 4.1, GTK 3, OpenSSL, Schriftpaket und Distributions-Buildwerkzeugen bauen. Treiber, Audio, Eingabe und Neuinstallation sind noch extern zu qualifizieren.',
    macos: 'macOS: passenden x86_64-/arm64-Mac, Xcode Command Line Tools und System-WKWebView verwenden. Signierung, Notarisierung und echte Geräteabnahme bleiben separate Prüfungen.',
    android: 'Android benötigt JDK 17, SDK 35, Build-Tools, NDK 27 und eine validierte Nova_A-Vorlage. Android Delivery zeigt fehlende Komponenten; nach Installation die Erkennung aktualisieren.',
    headless: 'Dieser Export deaktiviert die Darstellung in einem WebView-Spieler und benötigt weiterhin die Desktop-Laufzeit. Der separate native Physik-JSONL-Befehl ist fensterlos, führt aber weder das vollständige Skriptspiel noch Netzwerktransporte aus.',
    unknown: 'Dieses Ziel ist nicht registriert. Vor dem Bauen ein unterstütztes Ziel wählen.',
  },
  zh: {
    title: '运行与构建前置条件', refresh: '重新检测宿主',
    web: 'Web ZIP：本地编辑和单机游戏不需要桌面 SDK 或后端。通过 HTTP(S) 托管；可安装 PWA 需要 HTTPS。可选多人功能需要明确配置服务及其 CORS/TLS 权限。',
    browser: '此浏览器不能打包原生可执行文件。请选择 Web ZIP，或打开与目标平台匹配的桌面编辑器。下载 Web 游戏不需要安装 Rust 或 SDK。',
    probeFailed: '桌面导出能力探测不可用或失败。请重新检测并阅读下方技术详情，确认播放器和模板属于当前构建后重试。这不表示当前编辑器运行在浏览器中。',
    mismatch: '原生导出需要与现有播放器模板相同的操作系统和架构。请使用匹配宿主的桌面构建；修改目标名称不会交叉编译播放器。',
    native: '桌面编辑器和播放器使用系统 WebView。游戏导出复用已编译的播放器模板，不需要本机 Rust 编译器；从源码编译 Nova_A 才需要平台 SDK。',
    windows: 'Windows x64：安装 Microsoft Evergreen WebView2 Runtime。便携 EXE 不内嵌该运行时。如果编辑器无法启动，请先运行 scripts/check-windows-prerequisites.ps1。低端模式减少显示负载，不降低操作系统或运行时要求。',
    linux: 'Linux：在 Linux 上使用 WebKitGTK 4.1、GTK 3、OpenSSL、字体包及发行版编译工具构建。驱动、音频、输入和干净机器验收仍待外部检查。',
    macos: 'macOS：使用架构匹配的 x86_64/arm64 Mac、Xcode Command Line Tools 和系统 WKWebView。签名、公证及真实设备验收仍是独立检查。',
    android: 'Android 需要 JDK 17、SDK 35、build-tools、NDK 27 和已验证的 Nova_A 模板。请在 Android Delivery 查看具体缺项，安装后重新检测。',
    headless: '此导出模式只关闭 WebView 播放器的渲染，仍需要桌面运行时。独立原生物理 JSONL 命令无需窗口，但不会执行完整脚本游戏或网络传输。',
    unknown: '该目标没有登记。构建前请选择支持的目标。',
  },
}
/** 返回当前语言的标题与刷新动作，使用调用方已有的响应式语言源。 */
export function platformPrerequisiteCopy29(locale: PlatformLocale29) { return copy[locale] }
/** 根据实际宿主能力生成可行动说明；检测失败原文由调用方单独保留。 */
export function platformPrerequisites29(target: string, architecture: string, mode: string, probe: PlatformProbe29, locale: PlatformLocale29): string[] {
  const text = copy[locale]
  if (target === 'web') return [text.web]
  if (!['windows', 'linux', 'macos', 'android'].includes(target)) return [text.unknown]
  const result = [target === 'android' ? text.android : text.native, text[target as 'windows' | 'linux' | 'macos' | 'android']]
  if (target === 'android') result.splice(1, 1)
  if (!probe.nativeAvailable) result.unshift(probe.nativeHost ? text.probeFailed : text.browser)
  else if (target !== 'android' && (probe.host !== target || probe.architecture !== architecture)) result.unshift(text.mismatch)
  if (mode === 'headless-server') result.push(text.headless)
  return result
}
