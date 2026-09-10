# Nova_A26.20 performance budgets and measurement scope

These limits preserve predictable memory and visible behavior. Higher pixel count and sample count cost GPU time; neither universal maximum FPS nor unlimited resolution is a meaningful guarantee across projects and devices.

| Area | Declared local acceptance |
| --- | --- |
| Batch construction | All16000 packets and ordinary26.19 draw boundaries retained; isolated grouping median improves by at least2× under the same recording sink. This measures CPU grouping, not complete frame rate. |
| Steady upload memory | No additional GPU storage allocations after warm-up at the same geometry size. Shrinking frames upload only used values; empty frames draw no stale commands; destroy releases retained arrays. |
| Packet grouping | At most65000 vertices or195000 indices per ordinary batch; index-heavy input splits while preserving order and every triangle. Existing single-packet validation remains authoritative. |
| General backing surfaces | Maximum8192 pixels per dimension and16,777,216 pixels, further bounded by device limits. Preserve logical viewport and aspect ratio. |
| Optional MSAA | RGBA8 multisample color plus resolve texture capped at256MiB; choose an actually supported count within that bound. Explicit counts may fall back; actual samples are reported. |
| Authored resolution | Scale0.5–2 multiplies the existing display/quality pixel ratio; save/reopen/export retain the value. Changing quality must not move the logical camera or change input coordinates. |
| Output preservation | Real GPU upload and painter pixels match frozen26.19 for the ordinary path; explicit MSAA must produce visible partial edge coverage; post effects, particles, materials, context recovery, animation/audio and UI regressions remain active. |
| Physics/build/export | Common benchmark records finite2000-body/240-step simulation, scripting/import/export timing and artifact sizes. Clean and moved offline builds compare produced Web bytes. |

Fresh renderer reports record all samples and the exact source digest. A preliminary original-algorithm measurement showed1182.2ms versus1.4ms for isolated grouping of16000 packets, but that result is developmental and must not be presented as release FPS. Final evidence supersedes preliminary measurements. Before/after physics reports may have concurrent host load and cannot alone establish an isolated performance gain. Compare the same project, renderer, camera, pixels, effects, workload, warm-up and hardware; report CPU/GPU time separately.

The compiler uses portable optimization level3, thin LTO and one code-generation unit with retained unwind behavior. Build time can increase. No native-only instruction set or fast-math assumptions were added. The quality controls are explicit choices; automatic sample/device limits prevent unbounded allocations, not a promise that every device sustains60FPS at maximum quality.
