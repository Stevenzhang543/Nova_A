# Nova_A 26.18 implementation and acceptance checklist

Baseline: clean commit `cdfcb3a` (update v26.17). Preserve all existing releases, especially the independently qualified 26.17 source digest `67ce40f3351b4e169ddea9404755662335f01da3ede74507b29c490dd9494be1`. Scope: docs/ROADMAP_26_11_TO_26_20.md, common requirements and complete 26.18 milestone. No unchecked requirement constitutes a passing claim.

## Implementation and programmer audit

- [ ] Trace session setup, transport identity, ownership, authority transfer and disconnect cleanup through runtime and export. Reject unauthorized mutation and preserve offline play.
- [ ] Verify reliable ordering, ACKs, loss, duplicates, reorder, backpressure, retry exhaustion and sequence wrap. No unsent message may leave a permanent ordered-channel gap.
- [ ] Audit protocol, payload, rate, memory, authentication and stale-epoch bounds with malformed and malicious input. Retried packets must not be poisoned by temporary admission failure.
- [ ] Verify reconnect, cancelled startup, stale transport/service callbacks, late join and atomic baseline restoration including ownership and scenes.
- [ ] Verify replication property selection, authoritative correction, snapshot interpolation, input targeting and retained physics bindings.
- [ ] Define exact transform-delta replay/save limits and track non-rewindable physics, Rhai and external side effects. Extend full rollback only with a complete deterministic journal.
- [ ] Review and document renderer-independent native server architecture and entry-point feasibility. Test startup without a GUI if such an entry point is implemented. Preserve truthful descriptions of the existing renderer-disabled WebView export.
- [ ] Execute real multi-process localhost tests, impairment, reconnect, ownership, late join and resource cleanup. Keep optional external providers explicit; do not invent public-internet evidence.
- [ ] Typecheck, affected regressions, common production gates, appropriate Rust tests/clippy/WASM and optimized native/Web builds. Review final diff and compatibility. Project Format 2/schema 29 and public contracts remain unchanged unless explicitly justified.

## GUI and actual-user audit

- [ ] Readable session role/authority/rollback explanations, actionable failure/reconnect controls, packet and replication diagnostics.
- [ ] Coherent per-instance Logs/Inspector navigation that states what is actually observed.
- [ ] Every changed panel/state across EN/DE/ZH, both themes, 100/150/200 percent scale and narrow/normal/wide widths; real keyboard/mouse observations and retained screenshots.
- [ ] Host/join a co-op reference with separate players; edit authority, disconnect/rejoin, observe late-join state, Undo/Redo and save/reopen.
- [ ] Export and run the exact client/server outputs and follow their logs; compare editor and player outcomes. Public services and other machines remain separately qualified.

## Teaching and separate release

- [ ] Add complete EN/DE/ZH workflow lessons, separate 26.18 references, current notes and an exhaustive edit ledger. Preserve all 40 library starters and historical lessons.
- [ ] Freeze exact candidate source and run all source-bound production gates. Retain failures; any authored fix requires a new candidate.
- [ ] Generate evidence and independently verify exactly 11 files in releases/v26.18: portable EXE, setup EXE, MSI, Web/source/reference/evidence ZIPs, notes, ledger, license and SHA256SUMS. Preserve earlier versions.

External qualifications remain physical accessibility devices, other platforms/hosts, public network services/NAT, signing/disposable installation, independent review and real-duration soak. The final outside-source completion report resolves frozen checklist items only after actual evidence passes.
