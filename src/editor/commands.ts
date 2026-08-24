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

  constructor(options: {
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

  execute(): void {
    this.applyDocument(this.afterDocument)
  }

  undo(): void {
    this.applyDocument(this.beforeDocument)
  }

  redo(): void {
    this.execute()
  }

  merge(next: EditorCommand): boolean {
    if (!(next instanceof DocumentMutationCommand)
      || this.mergeKey === null
      || next.mergeKey !== this.mergeKey
      || next.committedAt - this.committedAt > 900) return false
    this.afterDocument = next.afterDocument
    this.committedAt = next.committedAt
    return true
  }

  get byteSize(): number { return (this.beforeDocument.length + this.afterDocument.length) * 2 }
}

export class CompositeCommand implements EditorCommand {
  readonly id = crypto.randomUUID?.() ?? `group-${Date.now()}-${Math.random().toString(16).slice(2)}`
  readonly timestamp = new Date().toISOString()
  readonly affectedResource: string
  readonly scope: string
  constructor(readonly label: string, readonly commands: EditorCommand[]) {
    this.affectedResource = [...new Set(commands.map(item => item.affectedResource).filter(Boolean))].join(', ').slice(0, 240) || 'project.nova'
    this.scope = [...new Set(commands.map(item => item.scope).filter(Boolean))].join(',').slice(0, 40) || 'project'
  }
  execute(): void { this.commands.forEach(item => item.execute()) }
  undo(): void { [...this.commands].reverse().forEach(item => item.undo()) }
  redo(): void { this.execute() }
  merge(): boolean { return false }
  get byteSize(): number { return this.commands.reduce((sum, item) => sum + (item.byteSize ?? 0), 0) }
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

  constructor(maximumLength = 500, memoryBudgetBytes = 64 * 1024 * 1024) {
    this.maximumLength = Math.max(1, Math.round(maximumLength))
    this.memoryBudgetBytes = Math.max(1_048_576, Math.round(memoryBudgetBytes))
  }

  get canUndo(): boolean { return this.cursor >= 0 }
  get canRedo(): boolean { return this.cursor < this.commands.length - 1 }
  get undoLabel(): string | null { return this.canUndo ? this.commands[this.cursor].label : null }
  get redoLabel(): string | null { return this.canRedo ? this.commands[this.cursor + 1].label : null }
  get length(): number { return this.commands.length }
  get index(): number { return this.cursor }
  get memoryBytes(): number { return this.commands.reduce((sum, command) => sum + (command.byteSize ?? 0), 0) }
  get lastClearReason(): string { return this.clearReason }
  get entries(): CommandHistoryEntry[] {
    return this.commands.map((command, index) => ({ id: command.id ?? `command-${index}`, label: command.label, timestamp: command.timestamp ?? '', affectedResource: command.affectedResource ?? 'project.nova', scope: command.scope ?? 'project', byteSize: command.byteSize ?? 0, applied: index <= this.cursor }))
  }

  commit(command: EditorCommand, alreadyExecuted = false): void {
    if (!alreadyExecuted) command.execute()
    if (this.groups.length) { this.groups[this.groups.length - 1].commands.push(command); return }
    this.commands = this.commands.slice(0, this.cursor + 1)
    const previous = this.commands[this.commands.length - 1]
    if (previous?.merge(command)) {
      this.cursor = this.commands.length - 1
      return
    }
    this.commands.push(command)
    while (this.commands.length > this.maximumLength || this.memoryBytes > this.memoryBudgetBytes && this.commands.length > 1) this.commands.shift()
    this.cursor = this.commands.length - 1
  }

  /** Groups support nesting; an inner group becomes one command in its parent. */
  beginGroup(label: string): void { this.groups.push({ label: label.trim().slice(0, 160) || 'Grouped edit', commands: [] }) }

  endGroup(): boolean {
    const group = this.groups.pop()
    if (!group || !group.commands.length) return false
    const command = group.commands.length === 1 ? group.commands[0] : new CompositeCommand(group.label, group.commands)
    if (this.groups.length) this.groups[this.groups.length - 1].commands.push(command)
    else this.commit(command, true)
    return true
  }

  cancelGroup(): boolean {
    const group = this.groups.pop()
    if (!group) return false
    ;[...group.commands].reverse().forEach(command => command.undo())
    return true
  }

  undo(): boolean {
    if (!this.canUndo) return false
    this.commands[this.cursor].undo()
    this.cursor--
    return true
  }

  redo(): boolean {
    if (!this.canRedo) return false
    this.cursor++
    this.commands[this.cursor].redo()
    return true
  }

  clear(reason = 'explicit-clear'): void {
    this.commands = []
    this.cursor = -1
    this.groups = []
    this.clearReason = reason.slice(0, 160)
  }
}
