# Project Format 2 schema 27

Schema 27 is Nova_A 3.7's additive visual/audio-pipeline schema. The TypeScript and Rust format authorities both write engine `3.7.0`, format major 2 and schema 27 while accepting public schemas 5–27.

Migration adds missing `projectSettings.rendering.qualityPreset`, `pixelSnap`, `maximumPixelRatio`, `particleBudget` and explicit `colorSpace`. Asset settings gain `textureProfile`, audio profile/codec/quality/trim defaults and font render/fallback/bitmap/outline/shaping defaults. AudioSource data gains bounded polyphony, priority, virtualization, random pitch/volume and stream policy when absent.

The v3.6 default `ShapeRenderer2D` stroke tuple—width exactly 1, opacity 100 and color (0, 90, 155)—is recognized as the reported oversized default and becomes 0.04. Any different color, opacity or width is treated as authored data and is preserved. A missing stroke in older legacy entities receives the current default.

Migration remains transactional: inspect the preview and package report, retain/download the original rollback copy, migrate in memory, validate, serialize/reparse, and replace the session only after success. Compatible unknown fields, scenes, assets, packages, collision bits, scripts, animation, presentation, renderer data and audio graph data round-trip. A future schema opens only in the non-mutating compatibility viewer.

Older Nova_A builds cannot safely edit schema 27. Use the pre-migration backup to downgrade; there is no lossy reverse migration.
