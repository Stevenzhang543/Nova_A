# 26.25 browser and mobile operation

Nova_A's home-screen edition is an **online Web application**, not a native iOS binary. Host the complete Web release under HTTPS (including a subdirectory such as `/apps/nova/`). The manifest uses relative identity, scope, start URL and PNG icon URLs. On iPhone, open the site in Safari, choose Share → Add to Home Screen, then open it from the home screen. Browser install UI availability remains browser-controlled. The app does not force an installation prompt.

No service worker or application-shell cache is installed. A disconnected, already-open session retains in-memory edits, but previously unloaded tools, asset requests, reloading and first launch may fail offline. Save/export projects while connected. There is no claim of an offline-capable editor. No update reload occurs automatically: save first, then reload. Hosts must publish a complete release atomically, revalidate `index.html`, `browser-capabilities.js` and `manifest.webmanifest`, and retain previous hashed assets while existing sessions may still lazy-load them. Do not replace the contents of hashed asset URLs. This avoids mixing cached app shells and new modules; deploying individual files into a live version can still break old sessions and is unsupported.

The editor uses landscape on primary touch devices. Portrait adds an accessible localized guard without unmounting the editor, its open panels, project or unsaved fields. The editor is inert behind the guard. No orientation-lock API is assumed. The visual viewport follows keyboard height, pan and zoom; screen orientation determines rotation, so a keyboard cannot falsely request rotation. Safe-area insets protect the editor from display cutouts. Desktop and exported game orientation are unchanged.

In the Design canvas, one finger uses the current editing tool; two fingers pan and pinch to zoom. Starting a second finger ends the first editing transaction before camera movement; lift all fingers before a new edit. A tool that creates an object on first contact still performs that action. Mouse and game input paths are unchanged. Other controls use native scrolling, taps and the existing file input/download fallback. Mobile does not promise desktop-equivalent drag/drop file selection or OS folder-picker support.

| Engine/device | Capability policy | Qualification |
| --- | --- | --- |
| Chromium / Edge | ES modules, WASM, fetch, Promise, Worker, ResizeObserver, inert | Current installed Windows Edge; focused CDP touch/orientation emulation is separate from phone hardware |
| Firefox | Same capability gate; native file picker/download fallback | Unavailable until a Firefox browser run is recorded |
| WebKit / Safari | Same capability gate; iOS home-screen guidance | Unavailable until a WebKit/Safari run is recorded |
| iPhone 12 | Landscape editor, safe areas, keyboard and home-screen launch | Device not connected; physical touch, keyboard, download and installation qualification pending |
| Internet Explorer / missing required capabilities | ES5 pre-module unsupported notice in EN/DE/ZH | Legacy capability harness; no editor support claim |

Browser support is capability-based, not a promise that every browser works. PNG installation icons are original Nova_A letter-mark assets drawn locally. Runtime/API and graphics-driver limitations can still require renderer fallback or produce a recoverable diagnostic.

## 中文操作说明

使用 HTTPS 部署完整 Web 包，也可部署在子目录。iPhone Safari 中选择“分享 → 添加到主屏幕”。这是联网 Web 应用，不是 iOS 原生程序，也不支持离线启动。不会自动刷新更新；请先保存，再刷新。服务器应原子发布完整版本并保留旧哈希资源，避免旧会话加载失败。

触屏编辑器使用横屏，竖屏只覆盖提示而不关闭项目或草稿。软键盘改变可视区域，不被视为旋转。设计画布单指使用当前工具，双指平移缩放；第二指会结束第一指已经开始的编辑事务。其他面板使用点按与原生滚动。文件导入使用系统文件选择，导出采用浏览器下载；不同手机的保存位置由系统决定。

## Deutsche Bedienhinweise

Das vollständige Web-Paket über HTTPS bereitstellen; Unterverzeichnisse werden unterstützt. Auf dem iPhone in Safari „Teilen → Zum Home-Bildschirm“ wählen. Dies ist eine Online-Web-App, keine native iOS-App und kein Offline-Editor. Updates laden nicht automatisch neu: zuerst speichern. Atomar veröffentlichen und alte Hash-Ressourcen für offene Sitzungen behalten.

Der Touch-Editor arbeitet im Querformat. Hochformat blendet nur einen Hinweis ein; Projekt und Entwürfe bleiben erhalten. Die Bildschirmtastatur ändert den sichtbaren Bereich, nicht die Orientierung. Ein Finger verwendet das aktuelle Design-Werkzeug, zwei Finger verschieben/vergrößern die Ansicht. Der zweite Finger beendet die bereits begonnene Bearbeitung. Dateien über die normale Dateiauswahl importieren und über den Browser herunterladen.

Open top menus intentionally close on viewport resize to prevent stale off-screen placement; after rotation, reopen the menu normally. This does not close the editor or project. / 旋转时顶部菜单会安全收起，防止使用过期位置；返回横屏后可重新打开，项目和编辑器保持原状。
