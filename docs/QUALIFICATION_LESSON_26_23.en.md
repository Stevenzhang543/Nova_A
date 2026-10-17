# Nova_A 26.23 workflow lesson

## Launch and preserve your work

Choose New to reveal all forty starter templates, project name and location. Cancel or Escape returns focus to New and retains the draft. Open and Continue remain directly available; More contains the existing import, migration and recovery actions. A cancelled creation draft is not a saved project.

## Dynamic scripting and safe reload

Rhai values can change type. Arrays/maps are mutable; closures capture values and function pointers invoke callbacks. Project helpers use literal module-level use declarations. Modules share one combined namespace: native Rhai import aliases and arbitrary evaluation are not supported. SCRIPTING_CONTRACT_26_23.md documents limits and permissions. Exported constant defaults support nested arrays/maps and null; maps use Rhai #{coins: 1} syntax.

Save a valid change during Play. The affected bundle must compile before atomic replacement. An invalid newer request cancels its older queued candidate. On failure the previous bundle continues. Compatible exported state survives; incompatible layouts need restart. Stop clears session-owned rollback data. Empty previous scripts remain valid rollback targets. Unchanged compiled programs can be shared read-only, never mutable invocation scopes.

## Inspect values accurately

Script details are wider and long diagnostics wrap. Watches accept own data fields, array indices and quoted map keys. Types describe the supplied snapshot, not every paused VM local. Inspection rejects executable expressions, getters and prototype traversal; long previews are bounded. Cooperative tasks dispatch owned callbacks; they do not suspend arbitrary VM stacks.

## Menus and website links

Top menus keep one interactive branch while preserving transitions. Pointer grace and padded travel prevent accidental dismissal. Re-entry cancels the timeout. Escape returns focus; outside click closes transient menus. Modal drafts remain intact. Website links permit only documented exact HTTPS addresses; a denied native open remains recoverable.

## Upload and download Web builds

Extract the editor Web ZIP on an HTTP(S) static server, including all nested folders. Website roots and subdirectories are supported. HOSTING.md explains WebAssembly MIME and caching. Local editing needs no application backend; optional network services are separate. Build Web → Download Web ZIP downloads an archive even when folder export is available. Extract the game and serve index.html with all files. Opening through file:// is not the supported hosting workflow.

## Checks and limits

Create/cancel/reopen drafts; browse all forty templates; switch languages; use mouse and keyboard links; rapidly switch menus and leave/re-enter them. Play, edit a helper, reject a broken reload, repair it and compare exported state. Save/reopen and test the downloaded game beneath a nested website path. Measure idle DOM/listeners and CPU after five real minutes and resume. Default animations and game quality remain enabled.

Reports distinguish actual native/WASM execution, browser interaction and simulated native transport from physical device certification. Linux, macOS, iPhone, old-PC runtime diagnosis, signing and independent security/accessibility checks need their actual environments. No report proves universal best FPS or absence of every bug.
