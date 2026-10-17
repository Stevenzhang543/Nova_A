/** 26.30 发布计划生成器：显式风险范围，所有通过状态来自后续真实执行。 */
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {validateQualificationPlan} from './release-qualification.mjs'
/** 读取当前调用明确提供的工具链与候选快照选项。 */
const option=name=>process.argv.find(/** 按参数名寻找对应的键值命令行选项。 */ arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)
const plan={
  "format": "nova-release-qualification-plan",
  "version": 1,
  "release": "26.30",
  "machineVersion": "26.30.0",
  "releaseNotes": "docs/RELEASE_NOTES_26_30.md",
  "editLedger": "docs/EDIT_LEDGER_26_30.md",
  "documentation": [
    "docs/ROADMAP_26_21_TO_26_30.md",
    "docs/IMPLEMENTATION_TRACKER_26_30.md",
    "docs/RELEASE_NOTES_26_30.md",
    "docs/EDIT_LEDGER_26_30.md",
    "docs/WEB_HOSTING_26_30.md",
    "docs/QUALIFICATION_LESSON_26_30.en.md",
    "docs/QUALIFICATION_LESSON_26_30.de.md",
    "docs/QUALIFICATION_LESSON_26_30.zh.md",
    "docs/NATIVE_HEADLESS_26_30.md",
    "docs/FEATURE_INVENTORY_26_30.md",
    "docs/SOURCE_MAP_26_30.md",
    "docs/PANEL_INVENTORY_26_30.md",
    "docs/COMPETITIVE_REVIEW_26_30.md",
    "docs/ISSUE_CLOSURE_26_30.md",
    "docs/UI_26_30.md"
  ],
  "sourceSnapshot": ".cache/release-snapshots/v26.30-candidate1/snapshot.json",
  "gates": [
    {
      "id": "native-build",
      "category": "environment",
      "context": "Windows Tauri build using pinned Node/pnpm, Rust/MSVC/Windows SDK and WiX/NSIS; beforeBuildCommand builds actual WASM/editor/player. Exact PE/MSI versions checked; no installation claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.30",
          "--gate=native-build",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-native-build.json",
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
          "path": "src-tauri/target/release/bundle/nsis/Nova_A_26.30.0_x64-setup.exe"
        },
        {
          "name": "windows-msi",
          "path": "src-tauri/target/release/bundle/msi/Nova_A_26.30.0_x64_en-US.msi"
        }
      ]
    },
    {
      "id": "rust",
      "category": "programmer",
      "context": "Current entire Rust workspace all-target tests, once.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.30",
          "--gate=rust"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-rust.json",
          "target": "build/rust.json",
          "format": "nova-release-command-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "native-rust",
      "category": "programmer",
      "context": "Current Tauri tests and targeted native Clippy, once.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.30",
          "--gate=native-rust"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-native-rust.json",
          "target": "build/native-rust.json",
          "format": "nova-release-command-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "wasm",
      "category": "programmer",
      "context": "Execute compiled WASM to check exact engine identity, actual host commands/logs and direct/indirect blocking-sleep rejection.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/release-milestone-gates.mjs",
          "--release=26.30",
          "--gate=wasm",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-wasm.json",
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
          "--release=26.30",
          "--gate=web",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-web.json",
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
          "--release=26.30",
          "--gate=typescript",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-verification.json",
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
      "context": "Current release input predicates, complete static panel source inventory and actual native no-window process regression.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=focus"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-focus-bundle.json",
          "target": "runtime/focused-verification.json",
          "format": "nova-v26.30-focus-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        },
        {
          "path": "release-audits/v26.30-native-headless.json",
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
          "--release=26.30",
          "--gate=history",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-history-verification.json",
          "target": "runtime/migration-history.json",
          "format": "nova-v26.30-history-verification",
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
      "context": "Actual root/subpath static hosting, online PWA policy, moved project and downloaded Web/native-WASM script equivalence.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=user-interactions"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-user-interactions-bundle.json",
          "target": "runtime/user-interactions.json",
          "format": "nova-v26.30-user-interactions-bundle",
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
      "context": "Current reachable panel navigation and representative locale/palette/size/focus interactions; static conditional inventory distinct from runtime coverage.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=browser-layout"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-browser-layout-bundle.json",
          "target": "layout/layout-browser.json",
          "format": "nova-v26.30-browser-layout-bundle",
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
          "--release=26.30",
          "--gate=windows",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-windows-smoke.json",
          "target": "build/windows-smoke.json",
          "format": "nova-v26.30.0-windows-game-smoke",
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
          "--release=26.30",
          "--gate=headless",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-headless-smoke.json",
          "target": "build/headless-authority.json",
          "format": "nova-v26.30-headless-authority-verification",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": [
        {
          "name": "windows-headless-authority",
          "path": "release-audits/headless-output-v26.30/Nova 26.30 Headless Authority.exe"
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
          "--release=26.30",
          "--gate=hygiene",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
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
          "--release=26.30",
          "--gate=manual",
          "--pnpm-entry=PINNED_TOOL_PATH",
          "--pnpm-bin=PINNED_TOOL_PATH",
          "--powershell=pwsh.exe",
          "--game-reference=creator-v2630-mixed-game",
          "--headless-reference=server-v2630-headless-authority",
          "--headless-name=Nova 26.30 Headless Authority"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-manual-audit.json",
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
      "id": "clean-moved",
      "category": "programmer",
      "context": "Offline frozen clean checkout and moved path rebuild, exact Web output equality; existing machine/toolchain, not fresh OS.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=clean-moved",
          "--pnpm-entry=PINNED_TOOL_PATH"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-clean-moved-bundle.json",
          "target": "build/clean-moved.json",
          "format": "nova-v26.30-clean-moved-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "templates",
      "category": "programmer",
      "context": "All template CLI output packaging matrix; fixture player binaries are not forty real player runs.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=templates",
          "--pnpm-entry=PINNED_TOOL_PATH"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-templates-bundle.json",
          "target": "runtime/template-catalog.json",
          "format": "nova-v26.30-templates-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "performance",
      "category": "programmer",
      "context": "Measured 120-second idle plus navigation/gameplay/hidden-resume. Short observation, no universal FPS or long-soak assertion.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=performance",
          "--pnpm-entry=PINNED_TOOL_PATH"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-performance-bundle.json",
          "target": "performance/benchmarks.json",
          "format": "nova-v26.30-performance-bundle",
          "version": 1,
          "requireRelease": true,
          "requireEngine": true
        }
      ],
      "artifacts": []
    },
    {
      "id": "security",
      "category": "programmer",
      "context": "Actual registry pnpm advisory lookup plus local dependency/lock integrity; no Rust advisory or penetration-test claim.",
      "command": {
        "file": "NODE",
        "args": [
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=security",
          "--pnpm-entry=PINNED_TOOL_PATH"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-security-bundle.json",
          "target": "runtime/dependency-audit.json",
          "format": "nova-v26.30-security-bundle",
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
          "scripts/qualify-v26.30-scoped.mjs",
          "--gate=product"
        ]
      },
      "reports": [
        {
          "path": "release-audits/v26.30-product-audit.json",
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
    "authorization": "User requests final26.30 closure with relevant fatal-risk/helpful audits and explicitly rejects unnecessary duplicate matrices.",
    "omitted": [
      {
        "id": "rust-lint",
        "status": "not-run",
        "reason": "Full workspace lint/fmt matrix omitted; current workspace all-target tests, native tests/Clippy and production compilation execute once."
      },
      {
        "id": "layout-contract",
        "status": "not-run",
        "reason": "Static full Vue inventory and actual reachable-panel interactions cover current closure; omit duplicate historical geometric matrix."
      },
      {
        "id": "stability",
        "status": "not-run",
        "reason": "Actual bounded idle/navigation/hidden-resume observations are recorded by performance gate; separate historical1000-cycle smoke and multi-hour soak omitted, not claimed."
      }
    ]
  }
}
plan.sourceSnapshot=option('snapshot')??'.cache/release-snapshots/v26.30-candidate1/snapshot.json'
for(const gate of plan.gates){gate.command.file=process.execPath;gate.command.args[0]=resolve(gate.command.args[0]);gate.command.args=gate.command.args.map(/* 使用调用者提供的固定工具链路径，不从测试结果推断。 */ arg=>arg.startsWith('--pnpm-entry=')?'--pnpm-entry='+option('pnpm-entry'):arg.startsWith('--pnpm-bin=')?'--pnpm-bin='+option('pnpm-bin'):arg)}
if(!option('pnpm-entry')||!option('pnpm-bin'))throw Error('Provide pinned --pnpm-entry and --pnpm-bin')
validateQualificationPlan(plan)
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.30-qualification-plan.json',JSON.stringify(plan,null,2)+'\n')
console.log('26.30 scoped plan: '+plan.gates.length+' actual gates; '+plan.auditPolicy.omitted.length+' explicit not-run categories')
