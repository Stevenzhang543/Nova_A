# UI rebuild verification

Scope: the current development production bundle after the published 26.32 release. Published release archives and installers remain unchanged. No runtime/physics algorithms or project file formats were intentionally changed.

| Check | Evidence / result |
|---|---|
| Vue and TypeScript | `pnpm check` passed; `.cache/ui-rebuild-final-typecheck.log` |
| Production bundle | `node node_modules/vite/bin/vite.js build` passed; existing large-chunk advisory remains |
| Shared controls | Nine browser assertions passed, covering native events, lazy commits, invalid/disabled drafts, atomic save validation, resource reset, precision, scale and saved preferences |
| Navigation and editing | Six assertions passed; fifteen cold/warm transitions with zero blank content samples; persistent shell/canvas identity; draft/filter retention; edit/undo/redo/save; project isolation |
| Full layout traversal | 197 routes and ten assertions passed with zero geometry failures and zero browser console errors |
| Visual corrections | Nine targeted assertions passed across English100%, German150% and Chinese200% |
| Project Health | Exact stalled route and repeated navigation passed after snapshot-boundary fix |
| Populated Animation | Three checks passed across eleven populated views; real save and preview cleanup; one additional scrolled timeline inspector check passed |

## Visual review

All 197 baseline route screenshots were reviewed using contact sheets, with suspicious shots expanded. After shared slider and Build text corrections, all nine targeted follow-up screenshots were reviewed at full size. The final 197-route run verifies geometry after the shared 104 px label-column change; it is not represented as a second full manual screenshot review. Populated Animation receives separate full-size inspection because the primary fixture had no animation assets.

- [Combined review gallery](../../release-audits/ui-rebuild-review-gallery.html)
- [Final route gallery](../../release-audits/v26.32-ui-rebuild-layout-final-gallery.html)
- [Visual review record](../../release-audits/ui-rebuild-visual-review.json)
- [Navigation report](../../release-audits/ui-rebuild/navigation.json)
- [Shared controls report](../../release-audits/ui-rebuild/form-controls.json)
- [Populated animation report](../../release-audits/v26.32-ui-rebuild-animation.json)
- [Edit ledger](EDIT_LEDGER.md)

## Reproduction

Run from the repository root after building the production bundle:

```powershell
node scripts/verify-ui-form-controls.mjs
node scripts/verify-ui-rebuild-navigation-user.mjs
node scripts/verify-ui-rebuild-layout-user.mjs --final
node scripts/verify-ui-rebuild-layout-corrections.mjs
node scripts/verify-ui-rebuild-animation-user.mjs
node scripts/verify-ui-rebuild-timeline-details.mjs
```

Use the reports' development scope; these commands do not qualify the existing Windows release installers. Failed intermediate attempts are not passing evidence.

## Boundaries

Headless Edge input, DOM measurements and screenshots cannot prove physical compositor behavior or native assistive-technology announcements. Native OS pickers, installers, unavailable external services and every conditional plugin/error branch are not covered. Timeline/canvas coordinate geometry and legitimate canvas scrolling are retained. No unrelated full Rust/physics sweep was repeated for presentation changes. There is no standalone lint command in the project; Vue/TypeScript checks, production build and final diff whitespace checks are used alongside the targeted browser tests.
