/** Vite 环境类型入口：声明前端构建环境及静态资源导入所需的类型扩展。 */
/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string
  export default content
}