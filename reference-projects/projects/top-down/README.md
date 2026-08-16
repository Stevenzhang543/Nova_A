# Nova_A Top-down Reference

Engine **3.2.0**, Project Format 2, schema 23.

Demonstrates: Prefabs, Scene switch, Triggers, Particles, Save API.

1. Open `project.nova` from Project Manager.
2. Confirm Project Health has no blocking format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm export -- --project ./reference-projects/projects/top-down/project.nova --target web --profile release --output ./Builds/reference-top-down
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
