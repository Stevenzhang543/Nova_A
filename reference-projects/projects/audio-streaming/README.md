# Streaming Audio

Engine **4.0.0**, Project Format 2, schema 29.

Demonstrates: streaming import profile and codec metadata, trimmed loop points and gap qualification, device changes, latency and underrun diagnostics.

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/audio-streaming/project.nova --target web --profile release --output ./Builds/reference-audio-streaming --cache validate --jsonl
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
