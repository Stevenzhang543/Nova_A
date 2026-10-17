/** 运行控制命令的唯一实现：播放 / 暂停 / 单步 / 停止。
 *
 * 背景（§22.2、C 组 G1）：同一动作此前在 ActionBar、CommandPalette、ProfilerPanel 各自实现，
 * 且细节不同（有的跳过预检、有的不记录日志），属于同一命令多套行为。
 * 本模块把顺序固定为唯一事实，调用方只提供端口，因此可在 Node 中用假端口验证顺序与早退语义。 */

export type PlayMode = 'editing' | 'playing' | 'paused'

export interface RunCommandPorts {
  /** 确保物理/运行时已就绪；返回 false 表示无法继续。 */
  ensurePhysics(): Promise<boolean>
  /** 运行前预检（入口场景、缺失依赖等）；返回 false 时不得启动。 */
  preflight(): boolean
  /** 切换播放状态；返回 false 表示切换失败。 */
  setPlaying(playing: boolean): boolean
  beginSession(): void
  stepOnce(): void
  stopSession(): void
  stopPlayMode(): void
  playMode(): PlayMode
  /** 读取本地化文案。 */
  text(key: string): string
  /** 更新状态栏文案。 */
  report(status: string): void
  /** 追加日志。 */
  log(message: string): void
}

/** 启动播放：必须依次通过物理就绪与预检，然后才开始会话。 */
export async function executePlay(ports: RunCommandPorts): Promise<boolean> {
  if (!await ports.ensurePhysics()) return false
  if (!ports.preflight()) return false
  if (!ports.setPlaying(true)) return false
  ports.beginSession()
  ports.report(ports.text('physicsRunning'))
  ports.log(ports.text('physicsRunning'))
  return true
}

/** 暂停播放：只切换状态并记录，不做预检。 */
export function executePause(ports: RunCommandPorts): boolean {
  if (!ports.setPlaying(false)) return false
  ports.report(ports.text('physicsPaused'))
  ports.log(ports.text('runtimePaused'))
  return true
}

/** 单步：编辑态先进入再退出播放，然后执行一个固定步。 */
export async function executeStep(ports: RunCommandPorts): Promise<boolean> {
  if (!await ports.ensurePhysics()) return false
  if (!ports.preflight()) return false
  if (ports.playMode() === 'editing') {
    if (!ports.setPlaying(true)) return false
    if (!ports.setPlaying(false)) return false
  }
  ports.stepOnce()
  ports.report(ports.text('physicsStepped'))
  ports.log(ports.text('physicsStepped'))
  return true
}

/** 停止：先结束会话再退出播放模式，顺序不可颠倒。 */
export function executeStop(ports: RunCommandPorts): boolean {
  ports.stopSession()
  ports.stopPlayMode()
  ports.report(ports.text('simulationRestored'))
  ports.log(ports.text('simulationRestored'))
  return true
}
