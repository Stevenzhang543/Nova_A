# Nova_A UI Motion V3 Pack — Setup

## Included files
- `AGENTS_UI_MOTION_APPEND.md`
- `FINAL_CODEX_PROMPT.md`
- `docs/ui/UI_VISUAL_V3_SPEC.md`
- `docs/ui/MOTION_SYSTEM_SPEC.md`
- `docs/ui/UI_MOTION_IMPLEMENTATION_PLAN.md`
- `docs/ui/MOTION_QA_CHECKLIST.md`

## Installation
From the Nova_A repository root:

1. Copy the `docs/ui/` files into the existing `docs/ui/` directory.
2. Open the existing `AGENTS.md`.
3. Append the complete contents of `AGENTS_UI_MOTION_APPEND.md` to the END of `AGENTS.md`.
4. Keep older UI documentation unless explicitly obsolete. V3 extends the current successful architecture.
5. Keep `FINAL_CODEX_PROMPT.md` in the repository root or outside it; send its complete content to Codex.

Recommended layout:

Nova_A/
├── AGENTS.md
├── ...
└── docs/
    └── ui/
        ├── existing UI files...
        ├── UI_VISUAL_V3_SPEC.md
        ├── MOTION_SYSTEM_SPEC.md
        ├── UI_MOTION_IMPLEMENTATION_PLAN.md
        └── MOTION_QA_CHECKLIST.md

## Git recommendation

```bash
git add .
git commit -m "engine: complete capability and UX expansion"
git checkout -b ui/visual-motion-v3
```

Adapt the commit message to your history if needed.

## Codex usage
1. Start Codex from repository root.
2. Send the COMPLETE contents of `FINAL_CODEX_PROMPT.md`.
3. Let it audit the actual UI framework before choosing blur/spring implementation details.
4. Review its updated `UI_MOTION_IMPLEMENTATION_PLAN.md`.
5. Let it continue through implementation.

## Redirects

If Codex starts another information-architecture redesign:
> Stop. The existing editor hierarchy and major workspace structure are successful and are the baseline. This phase is visual refinement and motion-system integration, not another information-architecture redesign. Re-read UI_VISUAL_V3_SPEC.md and preserve current workflows unless a documented technical problem requires a structural change.

If it creates exaggerated bubble/glass UI:
> Reduce visual novelty. Nova_A must remain a professional desktop development tool. Keep softness, spacing, restrained accent, and tactile motion, but remove excessive floating cards, pills, blur, gradients, and decorative surfaces. Re-read the "soft structure, not bubble UI" constraints.

If drag feels laggy:
> Remove any elastic delay between pointer and manipulated content. Pointer tracking must be direct 1:1. Keep spring/elastic behavior only in settling, neighboring layout response, docking preview, and secondary visual feedback.

If animations hurt responsiveness:
> Performance and input responsiveness outrank visual spectacle. Profile the affected path, remove expensive layout-per-frame work or excessive blur, and use a simpler compositor-friendly transition or opaque/tinted fallback.
