/** 26.29 发布计划生成器：显式风险范围，所有通过状态来自后续真实执行。 */
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {validateQualificationPlan} from './release-qualification.mjs'
/** 读取当前调用明确提供的工具链与候选快照选项。 */
const option=name=>process.argv.find(/** 按参数名寻找对应的键值命令行选项。 */ arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)
const plan={
  "format": "nova-release-qualification-plan",
  "version": 1,
  "release": "26.29",
  "machineVersion": "26.29.0",
  "releaseNotes": "docs/RELEASE_NOTES_26_29.md",
  "editLedger": "docs/EDIT_LEDGER_26_29.md",
  "documentation": [
    "docs/ROADMAP_26_21_TO_26_30.md",
    "docs/IMPLEMENTATION_TRACKER_26_29.md",
    "docs/RELEASE_NOTES_26_29.md",
    "docs/EDIT_LEDGER_26_29.md",
    "docs/WEB_HOSTING_26_29.md",
    "docs/QUALIFICATION_LESSON_26_29.en.md",
    "docs/QUALIFICATION_LESSON_26_29.de.md",
    "docs/QUALIFICATION_LESSON_26_29.zh.md",
    "docs/WORLD_26_29.md",
    "docs/NETWORK_26_29.md",
    "docs/PLATFORM_26_29.md",
    "docs/NATIVE_HEADLESS_26_29.md"
  ],
  "sourceSnapshot": ".cache/release-snapshots/v26.29-candidate1/snapshot.json",
  "gates": [
    {
      "id": "native-build",
      "category": "environment",
      "context": "Windows Tauri build using pinned Node/pnpm, Rust/MSVC/Windows SDK and WiX/NSIS; beforeBuildCommand builds actual WASM/editor/player. Exact PE/MSI versions checked; no installation claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.29",
          "--gate=native-build",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-native-build.json",
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
          "path": "src-tauri/target/release/bundle/nsis/Nova_A_26.29.0_x64-setup.exe"
        },
        {
          "name": "windows-msi",
          "path": "src-tauri/target/release/bundle/msi/Nova_A_26.29.0_x64_en-US.msi"
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
          "--release=26.29",
          "--gate=wasm",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-wasm.json",
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
          "--release=26.29",
          "--gate=web",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-web.json",
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
          "--release=26.29",
          "--gate=typescript",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-verification.json",
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
      "context": "Current-source world unload/identity/rollback boundaries, real transport lifecycle and independent process UDP replication, platform prerequisite diagnostics, retained world bindings/queries/serialization and the separate bounded native physics JSONL command.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.29-scoped.mjs",
          "--gate=focus"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-focus-bundle.json",
          "target": "runtime/focused-verification.json",
          "format": "nova-v26.29-focus-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        },
        {
          "path": "release-audits/v26.29-native-headless.json",
          "target": "runtime/native-headless.json",
          "format": "nova-native-headless-verification",
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
          "--release=26.29",
          "--gate=history",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-history-verification.json",
          "target": "runtime/migration-history.json",
          "format": "nova-v26.29-history-verification",
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
      "context": "Actual stream/world editing and peer join/rejoin, saved/reopened projects and downloaded Web games; plain static root/subpath editor and online PWA manifest/icons without an application backend. Physical devices remain external.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.29-scoped.mjs",
          "--gate=user-interactions"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-user-interactions-bundle.json",
          "target": "runtime/user-interactions.json",
          "format": "nova-v26.29-user-interactions-bundle",
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
      "context": "Changed Build Settings prerequisite card at EN/DE/ZH, normal width and 1024x640 with 200% text, real refresh action; affected world/network narrow checks are embedded in their user workflow.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.29-scoped.mjs",
          "--gate=browser-layout"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-browser-layout-bundle.json",
          "target": "layout/layout-browser.json",
          "format": "nova-v26.29-browser-layout-bundle",
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
          "--release=26.29",
          "--gate=windows",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-windows-smoke.json",
          "target": "build/windows-smoke.json",
          "format": "nova-v26.29.0-windows-game-smoke",
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
      "context": "Export current renderer-disabled WebView game authority; execute loopback client/reconnect, permissions, corruption and artifact checks. Separate native physics stdio command is tested in focus; no full scripted-game server equivalence claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.29",
          "--gate=headless",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-headless-smoke.json",
          "target": "build/headless-authority.json",
          "format": "nova-v26.29-headless-authority-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": [
        {
          "name": "windows-headless-authority",
          "path": "release-audits/headless-output-v26.29/Nova 26.29 Headless Authority.exe"
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
          "--release=26.29",
          "--gate=hygiene",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
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
          "--release=26.29",
          "--gate=manual",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2629-mixed-game",
          "--headless-reference=server-v2629-headless-authority",
          "--headless-name=Nova 26.29 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-manual-audit.json",
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
          "scripts/qualify-v26.29-scoped.mjs",
          "--gate=product"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.29-product-audit.json",
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
    "authorization": "User request26.29: execute change-linked or fatal-risk/helpful audits, omit unaffected low-value repetitions.",
    "omitted": [
      {
        "id": "rust",
        "status": "not-run",
        "reason": "Full workspace matrix omitted; actual new native physics command build/process bounds and retained WASM/world checks exercise affected paths. Native command has no full-game/script/network promise."
      },
      {
        "id": "rust-lint",
        "status": "not-run",
        "reason": "Broad unchanged-workspace lint omitted. New native command is compiled and exercised with hostile input/process checks; native/WASM release compilation remains mandatory."
      },
      {
        "id": "native-rust",
        "status": "not-run",
        "reason": "Existing Tauri implementation unchanged; actual current Tauri build and Windows/WebView-player smoke remain mandatory. New separate Rust physics command has its own build and process gate."
      },
      {
        "id": "layout-contract",
        "status": "not-run",
        "reason": "Shared dock geometry unchanged; execute only changed platform card three-language/large-text checks and embedded world/network narrow interactions."
      },
      {
        "id": "stability",
        "status": "not-run",
        "reason": "No renderer scheduling changes. Exercise actual transport connection/close and world unload lifetime; retain26.27 idle measurements as prior evidence only."
      },
      {
        "id": "security",
        "status": "not-run",
        "reason": "No dependency upgrades. Changed transport input/authority and native JSONL bounds are checked; archive hygiene remains mandatory, no unrelated dependency certification."
      },
      {
        "id": "templates",
        "status": "not-run",
        "reason": "Existing40 templates unchanged; current streaming/networking references and downloaded exports exercise changed paths."
      },
      {
        "id": "performance",
        "status": "not-run",
        "reason": "No renderer optimization claim. Do not repeat26.27 frame benchmarks; bounded world/network/native command work is checked in focused gates."
      }
    ]
  }
}
plan.sourceSnapshot=option('snapshot')??'.cache/release-snapshots/v26.29-candidate1/snapshot.json'
for(const gate of plan.gates){gate.command.file=process.execPath;gate.command.args[0]=resolve(gate.command.args[0]);gate.command.args=gate.command.args.map(/* 使用调用者提供的固定工具链路径，不从测试结果推断。 */ arg=>arg.startsWith('--pnpm-entry=')?'--pnpm-entry='+option('pnpm-entry'):arg.startsWith('--pnpm-bin=')?'--pnpm-bin='+option('pnpm-bin'):arg)}
if(!option('pnpm-entry')||!option('pnpm-bin'))throw Error('Provide pinned --pnpm-entry and --pnpm-bin')
validateQualificationPlan(plan)
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.29-qualification-plan.json',JSON.stringify(plan,null,2)+'\n')
console.log('26.29 scoped plan: '+plan.gates.length+' actual gates; '+plan.auditPolicy.omitted.length+' explicit not-run categories')
