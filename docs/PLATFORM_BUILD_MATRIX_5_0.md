# Nova_A 5.0 platform and minimum-system contract

Nova_A 5.0 freezes two Tier-1 targets. **Windows x86-64** is the editor and desktop-player target and requires Windows 10 1809 or newer, WebView2, and an x86-64 processor. **Web** is the exported-player target and requires WebAssembly, ES2022, WebGL2, and HTTP(S) hosting. Chromium is the pinned local browser path; Firefox and WebKit evidence is an external release job and must not be inferred from Chromium.

Linux x86-64 and macOS x86-64/aarch64 remain Experimental matching-host CI records. They are not shown in the default release target picker and may not use Stable release claims until their driver, audio, input, package, clean-machine, signing, and hardware matrices pass. Android is Experimental and unavailable: there is no supported 5.0 mobile export.

Tier-1 means build, runtime, reference projects, deployment/installer, compatibility, and support are covered. It does not silently include publisher signing or an unexecuted external matrix. The authoritative machine-readable table is `src/runtime/platformSupport.ts`; Build Diagnostics shows the same minimum systems, availability, evidence path, and last-qualified release. Promotion requires changing that record and attaching the named evidence.

Windows deliverables are portable EXE, MSI, and NSIS setup. Web output is a ZIP whose player must be served with the generated MIME, cache, content-type, and policy headers. Opening `player.html` by `file://` is unsupported. Cross-target desktop builds are rejected unless a matching host or documented CI runner is used.
