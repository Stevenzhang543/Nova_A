# Nova_A Localization Workflow

Engine **4.0.0**, Project Format 2, schema 29.

Demonstrates: structured string tables and CSV, context, plural forms, fallback metadata and extraction.

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/localization-workflow/project.nova --target web --profile release --output ./Builds/reference-localization-workflow --cache validate --jsonl
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
