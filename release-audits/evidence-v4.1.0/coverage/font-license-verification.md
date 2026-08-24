# Nova_A 4.1 font-license verification

All bundled editor fonts use SIL Open Font License 1.1 and are distributed as unmodified Fontsource package resources. Their package versions are locked by `pnpm-lock.yaml`.

| Package | Editor use | License SHA-256 |
| --- | --- | --- |
| `@fontsource-variable/nunito-sans@5.3.0` | Primary UI | `6632e6c45fcc18cc03909a0a53d84e9775185e06203ff80d6367cf93959b91a8` |
| `@fontsource-variable/noto-sans-sc@5.3.0` | Simplified Chinese fallback | `18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3` |
| `@fontsource-variable/jetbrains-mono@5.3.0` | Code and fixed-width telemetry | `403581b69dac5cff4079205e01c6b467e56af449ecbd7247693ddb1baafa005b` |

The verified license inputs are each package's `LICENSE` file under `node_modules/@fontsource-variable/`. The source release records package identity and lockfile; the web/native builds contain only the required generated CSS and WOFF2 resources. Font notices are also included in the v4.1 third-party notice and SPDX inventory. No reserved font name is used to rename a modified font, and Nova_A does not sell the fonts separately.
