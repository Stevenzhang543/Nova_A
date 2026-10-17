# Nova_A 26.40 / 26.40.0 Web hosting

Extract the complete Web ZIP into your website directory. Serve index.html over HTTP/HTTPS with WebAssembly MIME application/wasm and real 404 responses; no application backend or SPA rewrite is needed for local authoring. Subdirectory hosting is supported. External multiplayer/cloud services still require their own configured servers.

Use HTTPS for home-screen installation and secure browser APIs. The manifest has relative scope/start_url and local icons. Safari on iPhone: Share 鈫?Add to Home Screen. This is a Web app, not an iOS binary. Browser installation UI varies by platform; there is no promise of automatic installation.

## Updates and offline behavior
This release is online-only: no service worker caches an application shell. Offline reload is unsupported. Loaded tabs may keep working with memory-resident resources, but lazy panels, import/build dependencies and reload may require the network. Save/download project backups before closing or updating.

Deploy a complete build atomically. Revalidate HTML, browser bootstrap, manifest and player-manifest.json (Cache-Control: no-cache). Hashed assets may be immutable; retain the previous asset files while old tabs remain open. Never mix an old player manifest with a new asset directory. Reload after saving to adopt an update. Do not overwrite a live directory file by file.

## Mobile and browser boundaries
The editor uses landscape on touch devices, an accessible portrait prompt, visual viewport sizing and safe areas. Orientation locking is not required. The mounted editor preserves drafts when rotated. Software keyboard height changes must not trigger the portrait prompt. Design canvas uses one-finger edit gestures and two-finger pan/zoom. Use the focus workspace to enlarge the canvas on narrow landscape screens. Browser file import/download are the fallback when directory access is unavailable.

Build 鈫?Web 鈫?Download Web ZIP exports a complete game. Keep its player, game.nova-pak and integrity metadata together and deploy them to a separate directory. Test the downloaded game, not just the editor preview.

Capabilities, not a browser name, control startup. Legacy browsers receive a readable unsupported notice before application module execution. Internet Explorer is unsupported. Consult the actual 26.40 browser report for tested engine/version; unavailable Firefox/WebKit and physical iPhone/Android remain unqualified.

## Deutsch
Vollst盲ndiges Web-ZIP in ein Server-Unterverzeichnis entpacken. HTTPS f眉r Installation; Safari: Teilen 鈫?Zum Home-Bildschirm. Kein Nova-Backend f眉r lokale Projekte n枚tig. Nur online, kein Offline-Neuladen. Vor Updates speichern; vollst盲ndigen Build atomar bereitstellen, HTML/Manifest neu validieren und alte Hash-Dateien f眉r offene Tabs behalten. Touch im Querformat; Hochformat erh盲lt ungespeicherte Felder. Web-Spiel-ZIP separat vollst盲ndig bereitstellen. Nicht getestete Browser und echte Ger盲te bleiben ungepr眉ft.

## 涓枃
瀹屾暣瑙ｅ帇 Web ZIP 鍒扮綉绔欑洰褰曪紝鏀寔瀛愮洰褰曪紱鏅€氭湰鍦伴」鐩笉闇€瑕?Nova 鍚庣銆備娇鐢?HTTPS 瀹夎涓诲睆骞曠綉椤碉紱iPhone Safari锛氬垎浜?鈫?娣诲姞鍒颁富灞忓箷銆備粎鍦ㄧ嚎锛屼笉鏀寔鏂綉閲嶈浇銆傛洿鏂板墠淇濆瓨锛屾暣鍖呭師瀛愰儴缃诧紝HTML/娓呭崟閲嶆柊楠岃瘉缂撳瓨锛屼繚鐣欐棫鍝堝笇璧勬簮渚涙棫鏍囩浣跨敤銆傝Е鎽告í灞忕紪杈戯紝绔栧睆鎻愮ず淇濈暀鏈繚瀛樺瓧娈点€備笅杞界殑娓告垙 ZIP 椤诲畬鏁撮儴缃插埌鐙珛鐩綍銆傛湭瀹炴祴娴忚鍣ㄥ拰鐪熷疄璁惧淇濇寔寰呴獙璇併€?

## Asset updates / 璧勬簮鏇存柊

Reimported assets retain UUID identity; save the project and rebuild the exported game after replacement. Deploy the complete new game package, never only a changed image/audio file beside an older package. Test imported fonts and audio on target devices. Resource cache checks do not qualify external hosting services.

閲嶅鍏ュ悗淇濆瓨椤圭洰骞堕噸鏂版瀯寤烘父鎴忥紝閮ㄧ讲瀹屾暣鏂拌祫婧愬寘锛屼笉瑕佸彧鏇挎崲鏃у寘鏃佽竟鐨勫崟涓浘鐗囨垨闊抽銆傚瓧浣撲笌闊抽鐨勭洰鏍囪澶囧吋瀹逛粛闇€瀹炴満妫€鏌ャ€?

## Optional services and platform delivery

26.40 / 26.40.0 does not add a mandatory backend. A disabled networking configuration must continue to support local authoring and games. Explicitly enabled multiplayer/authentication/relay adapters require their own compatible endpoints, HTTPS/WSS and server Origin/CORS policy where applicable. Static hosting cannot supply a native UDP listener. Do not embed service secrets in public Web files. See [platform prerequisites and recipes](PLATFORM_26_29.md) and [network boundaries](NETWORK_26_29.md).

The targeted static-host check loads both root and nested editor URLs, fetches actual relative manifest/icons, checks the declared online-only policy and absence of service-worker registration, then downloads and starts an actual Web game. It does not claim browser home-screen installation or physical phone qualification. See `release-audits/v26.40-static-host-user.json` after that command has actually passed.

Deutsch: Kein verpflichtendes Backend. Nur ausdr眉cklich aktivierte Netzwerkdienste ben枚tigen eigene kompatible Endpunkte, HTTPS/WSS und gegebenenfalls Origin-/CORS-Freigaben. Ein statischer Server bietet keinen nativen UDP-Listener. Die PWA bleibt online; eine Manifest-Pr眉fung ist keine echte Ger盲teinstallation.

涓枃锛氭病鏈夊己鍒跺悗绔€備粎鏄庣‘鍚敤鐨勮仈缃戞湇鍔￠渶瑕佸吋瀹圭鐐广€丠TTPS/WSS 鍙婇€傜敤鐨?Origin/CORS 閰嶇疆锛涢潤鎬佺綉绔欎笉鏄師鐢?UDP 鐩戝惉鍣ㄣ€傛 PWA 浠嶄粎鍦ㄧ嚎锛屾竻鍗曟鏌ヤ笉绛変簬鐪熷疄璁惧瀹夎楠屾敹銆?

## Supplied branding and theme boundaries

The editor and bundled manual choose the supplied light or dark PNG mark when their own color theme changes. Their favicons follow that theme. PWA/home-screen and Windows icons use the fixed dark artwork derivative; operating-system icon backgrounds are outside the editor theme. The downloaded player favicon is bundled from the supplied dark mark and resolves relative to its exported package. Deploy all branding files with the complete Web build; do not copy only a new logo beside old HTML/assets. Root/subdirectory HTTP checks do not certify physical home-screen installation.
