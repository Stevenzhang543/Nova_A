/** 图与 Rhai 诊断显示表：稳定编号对应本地化说明，原始消息始终保留供定位、复制和反馈。 */
import type { GraphCopyLocale } from './graphSyntaxCopy'
const descriptions: Record<string, readonly [string, string]> = {
  "GRAPH-LIMIT-NODES": ["图中的节点数量超过上限，请拆分模块。", "Der Graph enthält zu viele Knoten. Teilen Sie das Modul auf."],
  "GRAPH-LIMIT-EDGES": ["图中的连线数量超过上限，请拆分模块。", "Der Graph enthält zu viele Verbindungen. Teilen Sie das Modul auf."],
  "GRAPH-ID-INVALID": ["对象标识不是有效的 RFC 4122 UUID。", "Die Objektkennung ist keine gültige RFC-4122-UUID."],
  "GRAPH-ID-DUPLICATE": ["稳定标识重复，无法安全关联对象。", "Eine stabile Kennung ist doppelt; Objekte sind nicht eindeutig zuordenbar."],
  "GRAPH-LANGUAGE-ROOT": ["结构化 Rhai 图必须保留原始程序根节点。", "Der strukturierte Rhai-Graph benötigt seinen ursprünglichen Programmknoten."],
  "GRAPH-LANGUAGE-OWNERSHIP": ["请用语言声明与函数节点编辑结构图；旧变量、例程、事件表属于另一种图工作流。", "Verwenden Sie Deklarations- und Funktionsknoten; die alten Variablen-, Routinen- und Ereignistabellen gehören zum ursprünglichen Graphworkflow."],
  "GRAPH-SYMBOL-NAME": ["名称不是有效的脚本标识符。", "Der Name ist kein gültiger Skriptbezeichner."],
  "GRAPH-SYMBOL-DUPLICATE": ["同一作用域内的名称重复。", "Ein Name ist im selben Gültigkeitsbereich doppelt."],
  "GRAPH-VARIABLE-RANGE": ["变量的最小值大于最大值。", "Das Minimum der Variablen ist größer als ihr Maximum."],
  "GRAPH-LIBRARY-INVALID": ["图形库需要反向域名形式的包标识和库标识。", "Graphbibliotheken benötigen eine Paketkennung in umgekehrter Domainnotation und eine Bibliothekskennung."],
  "GRAPH-BREAKPOINT-ORPHAN": ["断点指向的节点已不存在。", "Der Zielknoten des Haltepunkts existiert nicht mehr."],
  "GRAPH-ROUTINE-ENTRY": ["例程必须有且只有一个入口节点。", "Eine Routine benötigt genau einen Eingangsknoten."],
  "GRAPH-ROUTINE-RETURN": ["例程缺少返回节点。", "Der Routine fehlt ein Rückgabeknoten."],
  "GRAPH-INTERFACE-MISSING": ["例程未匹配可用的接口方法。", "Die Routine passt zu keiner verfügbaren Schnittstellenmethode."],
  "GRAPH-INTERFACE-SIGNATURE": ["例程的输入或输出类型与接口签名不匹配。", "Ein- oder Ausgabetypen der Routine passen nicht zur Schnittstellensignatur."],
  "GRAPH-NODE-UNKNOWN": ["节点类型不可用，请启用对应图形库或替换节点。", "Der Knotentyp ist nicht verfügbar. Aktivieren Sie die zugehörige Bibliothek oder ersetzen Sie den Knoten."],
  "GRAPH-PIN-SCHEMA": ["端口缺失或类型不兼容，请迁移或重新创建节点。", "Ein Anschluss fehlt oder ist inkompatibel. Migrieren oder erstellen Sie den Knoten neu."],
  "GRAPH-NODE-DEPRECATED": ["节点已弃用，请使用详情中指定的替代类型。", "Der Knoten ist veraltet. Verwenden Sie den in den Details genannten Ersatztyp."],
  "GRAPH-LOCAL-MISSING": ["局部变量节点引用的声明已不存在。", "Die Deklaration der lokalen Variablen fehlt."],
  "GRAPH-VARIABLE-MISSING": ["变量节点引用的声明已不存在。", "Die referenzierte Variablendeklaration fehlt."],
  "GRAPH-EDGE-DANGLING": ["连线指向不存在的节点或端口。", "Die Verbindung verweist auf einen fehlenden Knoten oder Anschluss."],
  "GRAPH-EDGE-DIRECTION": ["连线必须从输出端口连接到输入端口。", "Verbindungen müssen von einem Ausgang zu einem Eingang führen."],
  "GRAPH-EDGE-KIND": ["执行端口和数据端口不能直接连接。", "Ausführungs- und Datenanschlüsse können nicht verbunden werden."],
  "GRAPH-EDGE-TYPE": ["数据类型不兼容，请添加显式类型转换节点。", "Die Datentypen sind inkompatibel. Fügen Sie einen expliziten Konvertierungsknoten hinzu."],
  "GRAPH-PIN-MULTIPLE": ["同一个输入端口连接了多条输入线。", "Ein Eingangsanschluss hat mehrere eingehende Verbindungen."],
  "GRAPH-PIN-REQUIRED": ["必填输入端口缺少数值或连线。", "Einem erforderlichen Eingang fehlt ein Wert oder eine Verbindung."],
  "GRAPH-CYCLE": ["检测到无界图循环，请使用有界重复节点。", "Ein unbegrenzter Graphzyklus wurde erkannt. Verwenden Sie begrenzte Wiederholungen."],
  "GRAPH-EVENT-EMPTY": ["事件没有后续执行路径。", "Das Ereignis hat keinen Ausführungspfad."],
  "GRAPH-ROUTINE-CYCLE": ["检测到无界例程递归，请使用有界重复。", "Ein unbegrenzter rekursiver Routinenzyklus wurde erkannt. Verwenden Sie begrenzte Wiederholungen."],
  "GRAPH-LANGUAGE-DISCONNECTED": ["此节点未连接到程序模块，因此不会执行。", "Dieser Knoten ist nicht mit dem Modul verbunden und wird nicht ausgeführt."],
  "GRAPH-LANGUAGE-EMISSION": ["无法从当前结构生成源码，请查看详情并修复结构。", "Aus der Struktur konnte kein Quelltext erzeugt werden. Prüfen Sie die Details und korrigieren Sie die Struktur."],
  "RHAI-GRAPH-LIMIT": ["模块超过源码或节点投影上限，不会保存部分转换结果。", "Das Modul überschreitet die Quelltext- oder Knotengrenze. Es wird kein unvollständiger Graph gespeichert."],
  "MISSING_ENDPOINT": ["连线端点缺失，该连线不参与布局。", "Ein Verbindungsendpunkt fehlt. Die Verbindung wird bei der Anordnung ausgelassen."],
  "DEPTH_FOLDED": ["较深的连接在独立区域继续显示；连线和节点标识均保留。", "Tiefe Verbindungen werden in getrennten Bereichen fortgesetzt; Verbindungen und Knotenkennungen bleiben erhalten."],
  "WIRE_ROUTE_BLOCKED": ["找不到无障碍的有界连线路径，请移动节点内的手动路径点或重置路径。", "Es wurde kein freier begrenzter Leitungsweg gefunden. Verschieben Sie manuelle Wegpunkte innerhalb von Knoten oder setzen Sie den Weg zurück."],
  "RHAI-PARSE-EXPECTED": ["当前位置缺少所需语法标记，详情列出预期内容和实际内容。", "An dieser Stelle fehlt ein erforderliches Syntaxzeichen. Die Details zeigen erwarteten und tatsächlichen Inhalt."],
  "RHAI-PARSE-IDENTIFIER": ["此处需要标识符。", "Hier wird ein Bezeichner erwartet."],
  "RHAI-PARSE-SEMICOLON": ["语句之间缺少分号。", "Zwischen Anweisungen fehlt ein Semikolon."],
  "RHAI-CANCELLED": ["语言分析已取消。", "Die Sprachanalyse wurde abgebrochen."],
  "RHAI-LIMIT-PARSER": ["语法分析达到资源限制，完整原因见详情。", "Die Syntaxanalyse hat eine Ressourcengrenze erreicht. Einzelheiten stehen in den Details."],
  "RHAI-SCOPE-LOOP": ["跳出或继续循环只能在循环内部使用。", "Abbruch und Fortsetzung sind nur innerhalb einer Schleife erlaubt."],
  "RHAI-HOST-MODULE-SCOPE": ["项目依赖只能在模块作用域声明。", "Projektabhängigkeiten dürfen nur im Modulbereich deklariert werden."],
  "RHAI-HOST-MODULE-SHAPE": ["项目依赖必须独占一行：use \"path\";，不能有别名或插值路径。", "Eine Projektabhängigkeit muss eine eigene Zeile belegen: use \"path\"; ohne Alias oder interpolierten Pfad."],
  "RHAI-SANDBOX-MODULE": ["当前沙箱不接受此模块操作；执行前必须由项目模块解析器显式绑定。", "Diese Moduloperation ist in der Sandbox nicht erlaubt; vor der Ausführung ist eine explizite Projektmodulbindung nötig."],
  "RHAI-SCOPE-EXPORT": ["原生导出只能在模块作用域使用。", "Native Exporte sind nur im Modulbereich erlaubt."],
  "RHAI-LIMITATION-INLINE-TYPE": ["Rhai 不支持内联类型语法，请改用注释类型标注。", "Rhai unterstützt keine Inline-Typsyntax. Verwenden Sie eine Typannotation im Kommentar."],
  "RHAI-PARSE-CONSTANT": ["常量必须提供初始值。", "Eine Konstante benötigt einen Anfangswert."],
  "RHAI-SCOPE-FUNCTION": ["具名 Rhai 函数必须在模块作用域声明。", "Benannte Rhai-Funktionen müssen im Modulbereich deklariert werden."],
  "RHAI-PARSE-SWITCH-COMMA": ["多路分支项末尾缺少逗号。", "Nach einem Auswahlzweig fehlt ein Komma."],
  "RHAI-PARSE-ASSIGNMENT-EXPRESSION": ["Rhai 的赋值是语句，不能作为值表达式使用。", "Eine Zuweisung ist in Rhai eine Anweisung und kein Wertausdruck."],
  "RHAI-PARSE-ASSIGNMENT-TARGET": ["赋值目标必须是变量、属性或索引。", "Das Zuweisungsziel muss eine Variable, Eigenschaft oder ein Index sein."],
  "RHAI-PARSE-EXPRESSION": ["此处需要表达式。", "Hier wird ein Ausdruck erwartet."],
  "RHAI-PARSE-MAP-KEY": ["映射的键必须是常量字符串或标识符。", "Zuordnungsschlüssel müssen konstante Zeichenfolgen oder Bezeichner sein."],
  "RHAI-PARSE-MAP-DUPLICATE": ["映射中存在重复键。", "Die Zuordnung enthält einen doppelten Schlüssel."],
  "RHAI-PARSE-INTERPOLATION": ["缺少字符串插值结束标记。", "Das Abschlusszeichen einer Zeichenfolgeninterpolation fehlt."],
  "RHAI-PARSE-TEMPLATE": ["字符串插值中出现非预期标记。", "Die Zeichenfolgeninterpolation enthält ein unerwartetes Syntaxzeichen."],
  "RHAI-PARSE-TEMPLATE-END": ["缺少结束反引号。", "Der abschließende Backtick fehlt."],
  "RHAI-BIND-DUPLICATE": ["同一作用域中有重复声明或相同参数数量的函数。", "Im selben Gültigkeitsbereich besteht eine doppelte Deklaration oder Funktion mit gleicher Parameteranzahl."],
  "RHAI-BIND-IMMUTABLE": ["不能给不可变声明重新赋值。", "Eine unveränderliche Deklaration kann nicht neu zugewiesen werden."],
  "RHAI-BIND-UNRESOLVED": ["未找到引用的变量或函数声明。", "Die referenzierte Variablen- oder Funktionsdeklaration wurde nicht gefunden."],
  "RHAI-SANDBOX-EVAL": ["当前 Nova Rhai 沙箱禁用 eval。", "eval ist in der Nova-Rhai-Sandbox deaktiviert."],
  "RHAI-SANDBOX-SLEEP": ["禁用阻塞式 sleep，请用 timer_start 或 task_wait 延后工作。", "Blockierendes sleep ist deaktiviert. Verwenden Sie timer_start oder task_wait für spätere Arbeit."],
  "RHAI-BIND-EXPORT": ["无法导出未解析的声明。", "Eine nicht aufgelöste Deklaration kann nicht exportiert werden."],
  "RHAI-LIMIT-TOKENS": ["语法标记数量超过上限。", "Die Anzahl der Syntaxzeichen überschreitet die Grenze."],
  "RHAI-LIMIT-SOURCE": ["源码长度超过 UTF-16 代码单元上限。", "Der Quelltext überschreitet die Grenze für UTF-16-Codeeinheiten."],
  "RHAI-LEX-STRING-LINE": ["多行字符串请使用反引号。", "Verwenden Sie Backticks für mehrzeilige Zeichenfolgen."],
  "RHAI-LEX-STRING-END": ["字符或字符串字面量没有结束。", "Ein Zeichen- oder Zeichenfolgenliteral ist nicht abgeschlossen."],
  "RHAI-LEX-STRING-VALUE": ["字符串或字符转义无效，具体位置见详情。", "Ein Zeichenfolgenwert oder eine Escape-Sequenz ist ungültig. Die Details zeigen die genaue Stelle."],
  "RHAI-LEX-TEMPLATE-END": ["插值字符串没有结束。", "Die interpolierte Zeichenfolge ist nicht abgeschlossen."],
  "RHAI-LIMIT-DEPTH": ["语法嵌套深度超过上限。", "Die syntaktische Verschachtelung überschreitet die Tiefengrenze."],
  "RHAI-LIMIT-COMMENTS": ["注释嵌套深度超过上限。", "Die Kommentarverschachtelung überschreitet die Tiefengrenze."],
  "RHAI-LEX-COMMENT-END": ["块注释没有结束。", "Der Blockkommentar ist nicht abgeschlossen."],
  "RHAI-LEX-RAW-STRING-END": ["原始字符串没有结束。", "Die rohe Zeichenfolge ist nicht abgeschlossen."],
  "RHAI-LEX-NUMBER": ["数字字面量无效或缺少运算符。", "Ein Zahlenliteral ist ungültig oder ein Operator fehlt."],
  "RHAI-LEX-RESERVED": ["此标记是当前 Rhai 语言的保留字或保留运算符。", "Dieses Zeichen ist ein reserviertes Wort oder ein reservierter Operator der aktiven Rhai-Sprache."],
  "RHAI-LEX-IDENTIFIER": ["标识符的第一个数字之前必须有 ASCII 字母。", "Vor der ersten Ziffer eines Bezeichners muss ein ASCII-Buchstabe stehen."],
  "RHAI-LEX-CHARACTER": ["源码中出现非预期字符。", "Der Quelltext enthält ein unerwartetes Zeichen."],
  "RHAI-LEX-INTERPOLATION-END": ["字符串插值缺少右花括号。", "In der Zeichenfolgeninterpolation fehlt die schließende geschweifte Klammer."],
}
/** 返回面向用户的说明；英文和未知诊断保持原始消息，避免掩盖新增错误或作者内容。 */
export function graphDiagnosticMessage(diagnostic: {code:string;message:string}, locale:GraphCopyLocale):string {
  if(locale==='en')return diagnostic.message
  return descriptions[diagnostic.code]?.[locale==='zh'?0:1]??diagnostic.message
}
/** 展开原始错误的按钮文案共用当前界面语言，详细内容本身不翻译。 */
export function graphDiagnosticDetailsLabel(locale:GraphCopyLocale):string { return locale==='zh'?'原始详情':locale==='de'?'Originaldetails':'Original details' }

/** 严重程度只改变显示名称，保留诊断对象中的稳定级别用于过滤和保存门禁。 */
export function graphDiagnosticSeverityLabel(severity:string,locale:GraphCopyLocale):string {
  const labels:Record<string,[string,string]>={error:['错误','Fehler'],warning:['警告','Warnung'],info:['信息','Information']}
  return locale==='en'?severity:labels[severity]?.[locale==='zh'?0:1]??severity
}
/** 翻译解析器已知的转换原因；未知原因原样显示，不能隐去新语法的具体失败说明。 */
export function graphConversionReason(reason:string,locale:GraphCopyLocale):string {
  const labels:Record<string,[string,string]>={
    'Missing expression':['缺少表达式。','Ein Ausdruck fehlt.'],
    'Unexpected expression token':['表达式中出现非预期标记。','Unerwartetes Zeichen im Ausdruck.'],
    'Unsupported source requires review':['不支持的源码需要检查。','Nicht unterstützter Quelltext muss geprüft werden.'],
    'The current legacy graph preserves this source in an Execute Rhai block. Rebuilding as a Rhai structure makes its parsed constructs editable.':['当前旧图使用“执行 Rhai”块保留此源码。重建为 Rhai 结构后，可编辑已解析的语法结构。','Der bestehende ältere Graph erhält diesen Quelltext in einem Rhai-Ausführungsblock. Nach dem Neuaufbau als Rhai-Struktur lassen sich die analysierten Konstrukte bearbeiten.'],
  }
  return locale==='en'?reason:labels[reason]?.[locale==='zh'?0:1]??reason
}
