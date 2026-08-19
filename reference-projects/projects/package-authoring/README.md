# Package Authoring Reference

Engine **4.0.0**, Project Format 2, schema 29.

Demonstrates: manifest types and API range, permission review and escalation, signature failure and quarantine, offline lock and verified rollback.

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/package-authoring/project.nova --target web --profile release --output ./Builds/reference-package-authoring --cache validate --jsonl
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
