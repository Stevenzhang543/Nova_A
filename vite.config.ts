import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

const projectRoot = process.cwd();

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  base: './',
  plugins: [vue(), {
    name: 'nova-manual-assets',
    apply: 'build',
    async writeBundle(options) {
      const output = resolve(projectRoot, options.dir ?? 'dist', 'manual')
      await mkdir(output, { recursive: true })
      await Promise.all(['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md'].map(file => copyFile(resolve(projectRoot, 'manual', file), resolve(output, file))))
    }
  }],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        editor: resolve(projectRoot, 'index.html'),
        player: resolve(projectRoot, 'player.html'),
        manual: resolve(projectRoot, 'manual/index.html')
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
