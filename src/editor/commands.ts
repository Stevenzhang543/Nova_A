/** 编辑命令历史：组织可执行及可合并的修改、分组事务、撤销与重做。 */
export interface EditorCommand {
  readonly label: string
  readonly id?: string
  readonly timestamp?: string
  readonly affectedResource?: string
  readonly scope?: string
  readonly byteSize?: number
  execute(): void
  undo(): void
  redo(): void
  merge(next: EditorCommand): boolean
}

/**
 * A persisted editor-document mutation. History stores executable commands,
 * while project JSON remains the compatibility-safe boundary used to restore
 * scenes, component identity, connections, and cross-scene references.
 */
export class DocumentMutationCommand implements EditorCommand {
  readonly id: string
  readonly label: string
  readonly mergeKey: string | null
  readonly timestamp: string
  readonly affectedResource: string
  readonly scope: string
  private readonly applyDocument: (document: string) => void
  private beforeDocument: string
  private afterDocument: string
  private committedAt: number

  /** 保存修改前后文档和应用函数，生成历史身份、时间戳及受影响资源范围。 */ constructor(options: {
    label: string
    before: string
    after: string
    apply: (document: string) => void
    mergeKey?: string | null
    committedAt?: number
    affectedResource?: string
    scope?: string
  }) {
    this.id = crypto.randomUUID?.() ?? `command-${Date.now()}-${Math.random().toString(16).slice(2)}`
    this.label = options.label
    this.beforeDocument = options.before
    this.afterDocument = options.after
    this.applyDocument = options.apply
    this.mergeKey = options.mergeKey ?? null
    this.committedAt = options.committedAt ?? performance.now()
    this.timestamp = new Date().toISOString()
    this.affectedResource = options.affectedResource?.slice(0, 240) || 'project.nova'
    this.scope = options.scope?.slice(0, 40) || 'project'
  }

  /** 执行时调用 this.applyDocument(this.afterDocument)；不显式返回调用结果。 */ execute(): void {
    this.applyDocument(this.afterDocument)
  }

  /** 执行时调用 this.applyDocument(this.beforeDocument)；不显式返回调用结果。 */ undo(): void {
    this.applyDocument(this.beforeDocument)
  }

  /** 执行时调用 this.execute()；不显式返回调用结果。 */ redo(): void {
    this.execute()
  }

  /** 仅合并连续九百毫秒内、同资源同范围同合并键且前后文档衔接的命令，保留最初回退状态。 */ merge(next: EditorCommand): boolean {
    if (!(next instanceof DocumentMutationCommand)
      || this.mergeKey === null
      || next.mergeKey !== this.mergeKey
      || next.affectedResource !== this.affectedResource
      || next.scope !== this.scope
      || next.beforeDocument !== this.afterDocument
      || next.committedAt < this.committedAt
      || next.committedAt - this.committedAt > 900) return false
    this.afterDocument = next.afterDocument
    this.committedAt = next.committedAt
    return true
  }

  /* 计算表达式 (this.beforeDocument.length + this.afterDocument.length) * 2 并返回结果，沿用操作数的原有类型规则。 */ get byteSize(): number { return (this.beforeDocument.length + this.afterDocument.length) * 2 }
}

export class CompositeCommand implements EditorCommand {
  readonly id = crypto.randomUUID?.() ?? `group-${Date.now()}-${Math.random().toString(16).slice(2)}`
  readonly timestamp = new Date().toISOString()
  readonly affectedResource: string
  readonly scope: string
  /** 收集子命令的资源及作用域描述，创建可作为单个历史项提交的组合命令。 */ constructor(readonly label: string, readonly commands: EditorCommand[]) {
    this.affectedResource = [...new Set(commands.map(/* 返回 item.affectedResource 的当前值。 */ item => item.affectedResource).filter(Boolean))].join(', ').slice(0, 240) || 'project.nova'
    this.scope = [...new Set(commands.map(/* 返回 item.scope 的当前值。 */ item => item.scope).filter(Boolean))].join(',').slice(0, 40) || 'project'
  }
  /** 按执行方向依次应用子命令；中途失败时逆向回滚已完成项，并保留原错误及可能的回滚错误。 */ private apply(direction: 'execute' | 'undo' | 'redo'): void {
    const completed: EditorCommand[] = []
    const ordered = direction === 'undo' ? [...this.commands].reverse() : this.commands
    try {
      for (const command of ordered) { command[direction](); completed.push(command) }
    } catch (error) {
      const failures: unknown[] = [error]
      for (const command of completed.reverse()) {
        try { direction === 'undo' ? command.redo() : command.undo() } catch (rollbackError) { failures.push(rollbackError) }
      }
      if (failures.length > 1) throw Object.assign(new Error('Grouped edit and rollback failed.'), {errors: failures})
      throw error
    }
  }
  /** 执行时调用 this.apply('execute')；不显式返回调用结果。 */ execute(): void { this.apply('execute') }
  /** 执行时调用 this.apply('undo')；不显式返回调用结果。 */ undo(): void { this.apply('undo') }
  /** 执行时调用 this.apply('redo')；不显式返回调用结果。 */ redo(): void { this.apply('redo') }
  /* 返回固定值 false。 */ merge(): boolean { return false }
  /* 调用 this.commands.reduce((sum, item) => sum + (item.byteSize ?? 0), 0) 并返回调用结果。 */ get byteSize(): number { return this.commands.reduce(/* 计算表达式 sum + (item.byteSize ?? 0) 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + (item.byteSize ?? 0), 0) }
}

export interface CommandHistoryEntry {
  id: string
  label: string
  timestamp: string
  affectedResource: string
  scope: string
  byteSize: number
  applied: boolean
}

export class CommandHistory {
  private commands: EditorCommand[] = []
  private cursor = -1
  private groups: Array<{ label: string; commands: EditorCommand[] }> = []
  private clearReason = 'initial'
  readonly maximumLength: number
  readonly memoryBudgetBytes: number

  /** 规范历史数量上限及最小内存预算，初始化受限命令历史。 */ constructor(maximumLength = 500, memoryBudgetBytes = 64 * 1024 * 1024) {
    this.maximumLength = Math.max(1, Math.round(maximumLength))
    this.memoryBudgetBytes = Math.max(1_048_576, Math.round(memoryBudgetBytes))
  }

  /* 比较 this.cursor 与 0，返回大于或等于的判断结果。 */ get canUndo(): boolean { return this.cursor >= 0 }
  /* 比较 this.cursor 与 this.commands.length - 1，返回小于的判断结果。 */ get canRedo(): boolean { return this.cursor < this.commands.length - 1 }
  /* 根据 this.canUndo 的真假，分别返回 this.commands[this.cursor].label 或 null。 */ get undoLabel(): string | null { return this.canUndo ? this.commands[this.cursor].label : null }
  /* 根据 this.canRedo 的真假，分别返回 this.commands[this.cursor + 1].label 或 null。 */ get redoLabel(): string | null { return this.canRedo ? this.commands[this.cursor + 1].label : null }
  /* 返回 this.commands.length 的当前值。 */ get length(): number { return this.commands.length }
  /* 返回 this.cursor 的当前值。 */ get index(): number { return this.cursor }
  /* 调用 this.commands.reduce((sum, command) => sum + (command.byteSize ?? 0), 0) 并返回调用结果。 */ get memoryBytes(): number { return this.commands.reduce(/* 计算表达式 sum + (command.byteSize ?? 0) 并返回结果，沿用操作数的原有类型规则。 */ (sum, command) => sum + (command.byteSize ?? 0), 0) }
  /* 返回 this.clearReason 的当前值。 */ get lastClearReason(): string { return this.clearReason }
  /** 把历史命令映射为可显示的元数据，按游标标记哪些命令已经应用。 */ get entries(): CommandHistoryEntry[] {
    return this.commands.map(/** 为每条命令生成含标签、资源、内存估算及当前应用状态的历史显示项。 */ (command, index) => ({ id: command.id ?? `command-${index}`, label: command.label, timestamp: command.timestamp ?? '', affectedResource: command.affectedResource ?? 'project.nova', scope: command.scope ?? 'project', byteSize: command.byteSize ?? 0, applied: index <= this.cursor }))
  }

  /** 必要时先执行命令；分组内暂存，否则截断重做分支、尝试合并并按数量及内存预算淘汰旧项。 */ commit(command: EditorCommand, alreadyExecuted = false): void {
    if (!alreadyExecuted) command.execute()
    if (this.groups.length) { this.groups[this.groups.length - 1].commands.push(command); return }
    this.commands = this.commands.slice(0, this.cursor + 1)
    const previous = this.commands[this.commands.length - 1]
    if (!previous?.merge(command)) this.commands.push(command)
    while (this.commands.length > this.maximumLength || this.memoryBytes > this.memoryBudgetBytes && this.commands.length > 1) this.commands.shift()
    this.cursor = this.commands.length - 1
  }

  /** Groups support nesting; an inner group becomes one command in its parent. */
  /** 执行时调用 this.groups.push({ label: label.trim().slice(0, 160) || 'Grouped edit', commands: [] })；不显式返回调用结果。 */ beginGroup(label: string): void { this.groups.push({ label: label.trim().slice(0, 160) || 'Grouped edit', commands: [] }) }

  /** 把非空当前分组封装成一个组合命令，加入父分组或已执行的历史记录。 */ endGroup(): boolean {
    const group = this.groups.pop()
    if (!group || !group.commands.length) return false
    const command = new CompositeCommand(group.label, group.commands)
    if (this.groups.length) this.groups[this.groups.length - 1].commands.push(command)
    else this.commit(command, true)
    return true
  }

  /** 先撤销当前分组全部修改，成功后才移除分组记录。 */ cancelGroup(): boolean {
    const group = this.groups[this.groups.length - 1]
    if (!group) return false
    new CompositeCommand(group.label, group.commands).undo()
    this.groups.pop()
    return true
  }

  /** 存在未结束分组或没有可撤销项时拒绝；执行回退成功后再移动历史游标。 */ undo(): boolean {
    if (this.groups.length || !this.canUndo) return false
    this.commands[this.cursor].undo()
    this.cursor--
    return true
  }

  /** 存在未结束分组或没有可重做项时拒绝；执行重做成功后再移动历史游标。 */ redo(): boolean {
    if (this.groups.length || !this.canRedo) return false
    this.commands[this.cursor + 1].redo()
    this.cursor++
    return true
  }

  /** 清空命令及未结束分组，重置游标并保存有界的清理原因。 */ clear(reason = 'explicit-clear'): void {
    this.commands = []
    this.cursor = -1
    this.groups = []
    this.clearReason = reason.slice(0, 160)
  }
}
