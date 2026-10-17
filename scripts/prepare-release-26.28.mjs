/** 26.28 发布计划生成器：显式风险范围，所有通过状态来自后续真实执行。 */
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {validateQualificationPlan} from './release-qualification.mjs'
/** 读取当前调用明确提供的工具链与候选快照选项。 */
const option=name=>process.argv.find(/** 按参数名寻找对应的键值命令行选项。 */ arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)
const plan={
  "format": "nova-release-qualification-plan",
  "version": 1,
  "release": "26.28",
  "machineVersion": "26.28.0",
  "releaseNotes": "docs/RELEASE_NOTES_26_28.md",
  "editLedger": "docs/EDIT_LEDGER_26_28.md",
  "documentation": [
    "docs/ROADMAP_26_21_TO_26_30.md",
    "docs/IMPLEMENTATION_TRACKER_26_28.md",
    "docs/RELEASE_NOTES_26_28.md",
    "docs/EDIT_LEDGER_26_28.md",
    "docs/WEB_HOSTING_26_28.md",
    "docs/QUALIFICATION_LESSON_26_28.en.md",
    "docs/QUALIFICATION_LESSON_26_28.de.md",
    "docs/QUALIFICATION_LESSON_26_28.zh.md",
    "docs/MEDIA_26_28.md",
    "docs/GAME_UI_26_28.md",
    "docs/LOCALIZATION_26_28.md"
  ],
  "sourceSnapshot": ".cache/release-snapshots/v26.28-candidate2/snapshot.json",
  "gates": [
    {
      "id": "native-build",
      "category": "environment",
      "context": "Windows Tauri build using pinned Node/pnpm, Rust/MSVC/Windows SDK and WiX/NSIS; beforeBuildCommand builds actual WASM/editor/player. Exact PE/MSI versions checked; no installation claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=native-build",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-native-build.json",
          "target": "build/native-build.json",
          "format": "nova-release-native-build-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": [
        {
          "name": "windows-editor",
          "path": "src-tauri/target/release/nova_a.exe"
        },
        {
          "name": "windows-nsis",
          "path": "src-tauri/target/release/bundle/nsis/Nova_A_26.28.0_x64-setup.exe"
        },
        {
          "name": "windows-msi",
          "path": "src-tauri/target/release/bundle/msi/Nova_A_26.28.0_x64_en-US.msi"
        }
      ]
    },
    {
      "id": "wasm",
      "category": "programmer",
      "context": "Execute compiled WASM to check exact engine identity, actual host commands/logs and direct/indirect blocking-sleep rejection.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=wasm",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-wasm.json",
          "target": "build/wasm-runtime.json",
          "format": "nova-release-wasm-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "web",
      "category": "programmer",
      "context": "Inventory complete dist built by Tauri; browser startup and authoring are separate user gates.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=web",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-web.json",
          "target": "build/web-build.json",
          "format": "nova-release-web-build-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": [
        {
          "name": "web-editor",
          "path": "dist/index.html"
        },
        {
          "name": "web-player",
          "path": "dist/player.html"
        }
      ]
    },
    {
      "id": "typescript",
      "category": "programmer",
      "context": "Run Vue/TypeScript source checks and Node/Vite config typechecks.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=typescript",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-verification.json",
          "target": "runtime/verification.json",
          "format": "nova-release-command-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "focus",
      "category": "programmer",
      "context": "Current-source nested timeline blends/seeks, actual game UI focus/controller/localization, translation parity, PCM clock/routing and media serialization roundtrip.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.28-scoped.mjs",
          "--gate=focus"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-focus-bundle.json",
          "target": "runtime/focused-verification.json",
          "format": "nova-v26.28-focus-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "history",
      "category": "programmer",
      "context": "Fresh historical document parsing, retained fixture/schema/version authority checks and current reference JSON round trips; actual interactive migrations remain separate user work.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=history",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-history-verification.json",
          "target": "runtime/migration-history.json",
          "format": "nova-v26.28-history-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "user-interactions",
      "category": "user",
      "context": "Actual cutscene curve/music/caption authoring, playback/scrub/undo/save/reopen/downloaded Web player and native IME/touch flow.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.28-scoped.mjs",
          "--gate=user-interactions"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-user-interactions-bundle.json",
          "target": "runtime/user-interactions.json",
          "format": "nova-v26.28-user-interactions-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "browser-layout",
      "category": "user",
      "context": "Affected populated timeline/audio/UI panels across EN/DE/ZH and five palettes, plus narrow large-text checks; no unrelated all-panel matrix.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.28-scoped.mjs",
          "--gate=browser-layout"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-browser-layout-bundle.json",
          "target": "layout/layout-browser.json",
          "format": "nova-v26.28-browser-layout-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "windows",
      "category": "user",
      "context": "Export the current reference from the exact editor, validate embedded package/footer/hash, then check editor and exported game launch liveness. MSI/setup hashed; install/uninstall lifecycle remains external.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=windows",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-windows-smoke.json",
          "target": "build/windows-smoke.json",
          "format": "nova-v26.28.0-windows-game-smoke",
          "version": 1,
          "requireRelease": false,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "headless",
      "category": "user",
      "context": "Export current renderer-disabled WebView authority; execute loopback client/reconnect, permissions, corruption and artifact hash checks. No windowless native-server claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=headless",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-headless-smoke.json",
          "target": "build/headless-authority.json",
          "format": "nova-v26.28-headless-authority-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": [
        {
          "name": "windows-headless-authority",
          "path": "release-audits/headless-output-v26.28/Nova 26.28 Headless Authority.exe"
        }
      ]
    },
    {
      "id": "hygiene",
      "category": "programmer",
      "context": "Actual repository ignore/protected-path and tracked generated/private-file hygiene checks.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=hygiene",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/repository-hygiene.json",
          "target": "security/repository-hygiene.json",
          "format": "nova-repository-hygiene-audit",
          "version": 1,
          "requireRelease": false,
          "requireEngine": false
        }
      ],
      "artifacts": []
    },
    {
      "id": "manual",
      "category": "programmer",
      "context": "Complete three-language manual size/task/component/concept/anchor/HTML and cumulative/current release identity checks.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.28",
          "--gate=manual",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2628-mixed-game",
          "--headless-reference=server-v2628-headless-authority",
          "--headless-name=Nova 26.28 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-manual-audit.json",
          "target": "manual/manual-audit.json",
          "format": "nova-release-manual-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "product",
      "category": "programmer",
      "context": "Verify only the declared current-version prerequisite reports. Other baseline categories explicitly not-run; no global defect-free assertion.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.28-scoped.mjs",
          "--gate=product"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.28-product-audit.json",
          "target": "runtime/product-audit.json",
          "format": "nova-release-product-audit",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    }
  ],
  "auditPolicy": {
    "kind": "change-risk-v1",
    "authorization": "User request26.28: execute change-linked or fatal-risk/helpful audits, omit unaffected low-value repetitions.",
    "omitted": [
      {
        "id": "rust",
        "status": "not-run",
        "reason": "Rust behavior is unchanged except version constants; current native and WASM compilation plus real WASM lifecycle behavior are executed."
      },
      {
        "id": "rust-lint",
        "status": "not-run",
        "reason": "No Rust implementation edits; full workspace lint is unrelated to this patch."
      },
      {
        "id": "native-rust",
        "status": "not-run",
        "reason": "Native implementation unchanged; actual current Tauri build and Windows/game/headless smoke remain mandatory."
      },
      {
        "id": "layout-contract",
        "status": "not-run",
        "reason": "Shared dock geometry unchanged; execute targeted populated media/UI panels across locale/palette and large-text instead."
      },
      {
        "id": "stability",
        "status": "not-run",
        "reason": "No scheduler/renderer resource ownership changes;26.27 measured idle is retained as prior evidence only. Test affected UI/media disposal directly."
      },
      {
        "id": "security",
        "status": "not-run",
        "reason": "No dependency updates. Resource allocation bounds and final archive hygiene are checked; no new dependency certification."
      },
      {
        "id": "templates",
        "status": "not-run",
        "reason": "Existing40templates unchanged; current authored localized cutscene/menu and actual downloaded export exercise changed paths."
      },
      {
        "id": "performance",
        "status": "not-run",
        "reason": "No rendering scheduler/cache optimization; do not repeat26.27 frame benchmarks. Media integer clock/PCM behavior checked in focus gate."
      }
    ]
  }
}
plan.sourceSnapshot=option('snapshot')??'.cache/release-snapshots/v26.28-candidate2/snapshot.json'
for(const gate of plan.gates){gate.command.file=process.execPath;gate.command.args[0]=resolve(gate.command.args[0]);gate.command.args=gate.command.args.map(/* 使用调用者提供的固定工具链路径，不从测试结果推断。 */ arg=>arg.startsWith('--pnpm-entry=')?'--pnpm-entry='+option('pnpm-entry'):arg.startsWith('--pnpm-bin=')?'--pnpm-bin='+option('pnpm-bin'):arg)}
if(!option('pnpm-entry')||!option('pnpm-bin'))throw Error('Provide pinned --pnpm-entry and --pnpm-bin')
validateQualificationPlan(plan)
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.28-qualification-plan.json',JSON.stringify(plan,null,2)+'\n')
console.log('26.28 scoped plan: '+plan.gates.length+' actual gates; '+plan.auditPolicy.omitted.length+' explicit not-run categories')
