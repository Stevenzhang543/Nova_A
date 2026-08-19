# Nova Rhai Language Protocol 1

Nova_A 3.5 exposes a dependency-free, JSON-lines protocol for external editors:

```powershell
pnpm script:lsp
```

The server writes a `ready` event, then accepts one JSON object per line. Responses preserve the request `id`. Methods are:

- `textDocument/analyze` `{ uri, text }`: updates the workspace index and returns coded parser, semantic, compatibility, runtime, or test diagnostics, symbols, references, semantic tokens, tests, dependencies, and API usage.
- `textDocument/completion` `{ uri, prefix }`: returns semantic completion entries with signatures, documentation, examples, and deprecation state.
- `textDocument/hover` `{ uri, symbol }`, `textDocument/definition` `{ symbol }`, and `textDocument/references` `{ symbol }`.
- `workspace/symbol` `{ query }`.
- `textDocument/formatting` `{ uri }`: returns a whole-document edit.
- `shutdown`: closes the server cleanly.

Example request:

```json
{"id":1,"method":"textDocument/analyze","params":{"uri":"Assets/Scripts/Player.rhai","text":"fn update(dt) { log_info(\"ready\"); }"}}
```

Ranges are one-based and include `start`/`end`. Diagnostic codes are stable within protocol 1. Clients must tolerate additional result fields and unknown informational codes.
