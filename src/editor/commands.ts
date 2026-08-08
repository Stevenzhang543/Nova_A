export interface EditorCommand {
  readonly label: string
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
  readonly label: string
  readonly mergeKey: string | null
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
  }) {
    this.label = options.label
    this.beforeDocument = options.before
    this.afterDocument = options.after
    this.applyDocument = options.apply
    this.mergeKey = options.mergeKey ?? null
    this.committedAt = options.committedAt ?? performance.now()
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
}

export class CommandHistory {
  private commands: EditorCommand[] = []
  private cursor = -1
  readonly maximumLength: number

  constructor(maximumLength = 100) {
    this.maximumLength = Math.max(1, Math.round(maximumLength))
  }

  get canUndo(): boolean { return this.cursor >= 0 }
  get canRedo(): boolean { return this.cursor < this.commands.length - 1 }
  get undoLabel(): string | null { return this.canUndo ? this.commands[this.cursor].label : null }
  get redoLabel(): string | null { return this.canRedo ? this.commands[this.cursor + 1].label : null }
  get length(): number { return this.commands.length }
  get index(): number { return this.cursor }

  commit(command: EditorCommand, alreadyExecuted = false): void {
    if (!alreadyExecuted) command.execute()
    this.commands = this.commands.slice(0, this.cursor + 1)
    const previous = this.commands[this.commands.length - 1]
    if (previous?.merge(command)) {
      this.cursor = this.commands.length - 1
      return
    }
    this.commands.push(command)
    if (this.commands.length > this.maximumLength) this.commands.shift()
    this.cursor = this.commands.length - 1
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

  clear(): void {
    this.commands = []
    this.cursor = -1
  }
}
