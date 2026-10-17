# Nova_A 26.26 / 26.26.0 Web hosting

Extract the complete Web ZIP into your website directory. Serve index.html over HTTP/HTTPS with WebAssembly MIME application/wasm and real 404 responses; no application backend or SPA rewrite is needed for local authoring. Subdirectory hosting is supported. External multiplayer/cloud services still require their own configured servers.

Use HTTPS for home-screen installation and secure browser APIs. The manifest has relative scope/start_url and local icons. Safari on iPhone: Share → Add to Home Screen. This is a Web app, not an iOS binary. Browser installation UI varies by platform; there is no promise of automatic installation.

## Updates and offline behavior
This release is online-only: no service worker caches an application shell. Offline reload is unsupported. Loaded tabs may keep working with memory-resident resources, but lazy panels, import/build dependencies and reload may require the network. Save/download project backups before closing or updating.

Deploy a complete build atomically. Revalidate HTML, browser bootstrap, manifest and player-manifest.json (Cache-Control: no-cache). Hashed assets may be immutable; retain the previous asset files while old tabs remain open. Never mix an old player manifest with a new asset directory. Reload after saving to adopt an update. Do not overwrite a live directory file by file.

## Mobile and browser boundaries
The editor uses landscape on touch devices, an accessible portrait prompt, visual viewport sizing and safe areas. Orientation locking is not required. The mounted editor preserves drafts when rotated. Software keyboard height changes must not trigger the portrait prompt. Design canvas uses one-finger edit gestures and two-finger pan/zoom. Use the focus workspace to enlarge the canvas on narrow landscape screens. Browser file import/download are the fallback when directory access is unavailable.

Build → Web → Download Web ZIP exports a complete game. Keep its player, game.nova-pak and integrity metadata together and deploy them to a separate directory. Test the downloaded game, not just the editor preview.

Capabilities, not a browser name, control startup. Legacy browsers receive a readable unsupported notice before application module execution. Internet Explorer is unsupported. Consult the actual 26.26 browser report for tested engine/version; unavailable Firefox/WebKit and physical iPhone/Android remain unqualified.

## Deutsch
Vollständiges Web-ZIP in ein Server-Unterverzeichnis entpacken. HTTPS für Installation; Safari: Teilen → Zum Home-Bildschirm. Kein Nova-Backend für lokale Projekte nötig. Nur online, kein Offline-Neuladen. Vor Updates speichern; vollständigen Build atomar bereitstellen, HTML/Manifest neu validieren und alte Hash-Dateien für offene Tabs behalten. Touch im Querformat; Hochformat erhält ungespeicherte Felder. Web-Spiel-ZIP separat vollständig bereitstellen. Nicht getestete Browser und echte Geräte bleiben ungeprüft.

## 中文
完整解压 Web ZIP 到网站目录，支持子目录；普通本地项目不需要 Nova 后端。使用 HTTPS 安装主屏幕网页；iPhone Safari：分享 → 添加到主屏幕。仅在线，不支持断网重载。更新前保存，整包原子部署，HTML/清单重新验证缓存，保留旧哈希资源供旧标签使用。触摸横屏编辑，竖屏提示保留未保存字段。下载的游戏 ZIP 须完整部署到独立目录。未实测浏览器和真实设备保持待验证。

## Asset updates / 资源更新

Reimported assets retain UUID identity; save the project and rebuild the exported game after replacement. Deploy the complete new game package, never only a changed image/audio file beside an older package. Test imported fonts and audio on target devices. Resource cache checks do not qualify external hosting services.

重导入后保存项目并重新构建游戏，部署完整新资源包，不要只替换旧包旁边的单个图片或音频。字体与音频的目标设备兼容仍需实机检查。
