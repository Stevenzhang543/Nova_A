/** 编辑器、播放器和离线手册构建配置；设置相对部署路径、固定开发端口及按运行时分块。 */
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

const projectRoot = process.cwd();

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(/** 提供 Vue 插件、多入口输出和 Tauri 开发服务器配置。 */ () => ({
  base: './',
  plugins: [vue(), {
    name: 'nova-manual-assets',
    apply: 'build',
    /** 构建结束后复制三语言手册和播放器清单到发布目录。 */ async writeBundle(options) {
      const output = resolve(projectRoot, options.dir ?? 'dist', 'manual')
      await mkdir(output, { recursive: true })
      await copyFile(resolve(output, '../.vite/manifest.json'), resolve(output, '../player-manifest.json'))
      await Promise.all(['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md'].map(/* 调用 copyFile(resolve(projectRoot, 'manual', file), resolve(output, file)) 并返回调用结果。 */ file => copyFile(resolve(projectRoot, 'manual', file), resolve(output, file))))
    }
  }],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        editor: resolve(projectRoot, 'index.html'),
        player: resolve(projectRoot, 'player.html'),
        manual: resolve(projectRoot, 'manual/index.html')
      },
      output: {
        /** 把 WASM 绑定和 Vue 运行时单独分块，其余模块交由默认策略。 */ manualChunks(id) {
          if (id.includes('/nova_core/pkg/') || id.includes('\\nova_core\\pkg\\')) return 'nova-runtime'
          if (id.includes('/node_modules/.pnpm/vue@') || id.includes('/node_modules/.pnpm/@vue+') || id.includes('\\node_modules\\.pnpm\\vue@') || id.includes('\\node_modules\\.pnpm\\@vue+')) return 'vue-runtime'
        }
      }
    }
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
