<!-- 本版静态网站部署说明：与发布包一起保留，实际兼容性以本版运行证据为准。 -->
# Hosting Nova_A 26.24 on a website

The Web release is a static site. Unzip its contents into a directory on your HTTP/HTTPS server and open `index.html`. A nested path such as `https://your-site.example/tools/nova/index.html` is supported. Preserve the directory structure. No Nova_A application backend or SPA catch-all route is required for the editor and ordinary local Web games.

Use HTTPS for a public deployment and browser features that require a secure context. Serve `.wasm` as `application/wasm`, JavaScript as JavaScript, and HTML as HTML. Return a real 404 for missing files; do not replace missing scripts or WASM with your website's HTML page. Do not open the ZIP's HTML directly with `file://`.

Upload one complete build together. Revalidate `index.html`, `player.html`, `player-manifest.json`, and `release-metadata.json`; hashed files in `assets/` can use long immutable caching. Do not combine HTML/manifest files from one release with assets from another. The public `player-manifest.json` lets in-browser game export work on hosts that block hidden directories. The original `.vite/manifest.json` remains a compatibility fallback.

## Downloading a game

In Build, choose Web and select **Download Web ZIP**. This downloads a complete standalone game even if your browser offers a folder picker. Extract that ZIP to its own server directory and open its `index.html`. The ordinary Build action still supports folder output where the browser provides it. Native desktop builds remain a desktop-editor capability.

Each game ZIP contains its player, `game.nova-pak`, build report and integrity metadata. Keep them together. A desktop editor may also download a Web ZIP; this does not turn a Windows executable into a cross-platform executable.

## Services and browser qualification

The static editor does not supply a multiplayer authority, relay service, cloud storage account or native compilation server. Projects that deliberately use such services need the corresponding separately configured service. Ordinary offline project authoring and local Web gameplay do not require one.

The required local deployment audit uses the recorded Edge/Chromium build. It must load the editor and exported game under separate nested paths, blocks hidden paths, downloads through the explicit ZIP control, verifies package contents, and starts the downloaded player. Only a completed, source-bound 26.24 report is evidence for that environment. Firefox, Safari, real iPhone/Android use, landscape gating and installed home-screen behavior are separate roadmap checks; they are not claimed as qualified by this Windows audit. Internet Explorer is not a supported target.

Cross-origin isolation is not required by this release. If your website enables COOP/COEP, apply a consistent policy to all required resources and test the resulting deployment. Check the editor's runtime diagnostics for graphics capabilities; do not assume every browser/device supports the same renderer quality.

## Deutsch — Bereitstellung

Den Inhalt des Web-ZIP vollständig auf einen HTTP/HTTPS-Server kopieren und `index.html` öffnen. Unterverzeichnisse werden unterstützt; ein Nova_A-Backend oder eine SPA-Umleitung ist für normale lokale Projekte nicht nötig. WASM mit `application/wasm` ausliefern, fehlende Dateien als 404 behandeln und HTML sowie `player-manifest.json` neu validieren. Unter **Build → Web → Web-ZIP herunterladen** entsteht ein vollständiges Spiel-ZIP. Dessen Dateien gemeinsam in ein eigenes Serververzeichnis kopieren. Mobile Geräte und andere Browser sind erst nach eigenen Prüfungen qualifiziert.

## 中文 — 网站部署

将 Web ZIP 的完整内容解压到 HTTP/HTTPS 网站目录，然后打开 `index.html`。支持子目录；普通本地项目不需要 Nova_A 后端或 SPA 重写规则。请为 WASM 使用 `application/wasm`，缺失文件返回 404，并让 HTML 与 `player-manifest.json` 重新验证缓存。通过 **构建 → Web → 下载 Web ZIP** 下载完整游戏，将游戏 ZIP 的全部文件部署到独立目录。Windows 上的浏览器审核不能替代真实手机或其他浏览器测试。
