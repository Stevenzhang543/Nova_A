/** 旧式内置节点文案：只翻译已知系统标题和帮助，作者标题、插件描述与 API 标识保持原样。 */
import type {GraphCopyLocale} from './graphSyntaxCopy'
type Copy={title:string;zh:string;de:string;helpZh:string;helpDe:string}
const copies:Record<string,Copy>={}
/** 登记固定系统节点的三语显示契约，不接触持久化图数据。 */
function entry(type:string,title:string,zh:string,de:string,helpZh:string,helpDe:string){copies[type]={title,zh,de,helpZh,helpDe}}
entry('code.module','Execute Rhai Module','执行 Rhai 模块','Rhai-Modul ausführen','显式源码保留块：在沙箱中运行无法表示为旧式类型节点的顶层声明。','Expliziter Quelltextblock für Deklarationen auf Modulebene, die ältere typisierte Knoten nicht darstellen können; Ausführung in der Sandbox.')
entry('code.statement','Execute Rhai Statement','执行 Rhai 语句','Rhai-Anweisung ausführen','在执行路径中运行一条经过验证的沙箱 Rhai 语句。','Eine validierte Rhai-Anweisung im Ausführungspfad innerhalb der Sandbox ausführen.')
entry('code.expression','Execute Rhai Expression','执行 Rhai 表达式','Rhai-Ausdruck ausführen','当类型节点不能保留表达式时，以沙箱源码求值并输出结果。','Einen Ausdruck als Sandbox-Quelltext auswerten, wenn typisierte Knoten ihn nicht erhalten können.')
entry('flow.branch','Branch','条件分支','Verzweigung','按布尔条件选择执行分支。','Den Ausführungspfad anhand einer booleschen Bedingung wählen.')
entry('flow.sequence','Sequence','执行顺序','Ausführungsfolge','按确定顺序执行两条路径。','Zwei Ausführungspfade in festgelegter Reihenfolge ausführen.')
entry('flow.repeat','Bounded Repeat','有界重复','Begrenzte Wiederholung','最多执行循环体 1,024 次。','Den Schleifenrumpf höchstens 1.024-mal ausführen.')
for(const [kind,zh,de] of [['Boolean','布尔值','Boolescher Wert'],['Number','数值','Zahl'],['String','字符串','Zeichenfolge'],['Vec2','二维向量','2D-Vektor'],['Entity','实体','Entität'],['Resource','资源','Ressource'],['Data','动态数据','Dynamische Daten']])entry('literal.'+kind.toLowerCase(),kind,zh,de,'提供一个'+zh+'常量。','Einen konstanten Wert vom Typ '+kind+' bereitstellen.')
for(const [kind,title,zh,de] of [['add','Add','加法','Addition'],['subtract','Subtract','减法','Subtraktion'],['multiply','Multiply','乘法','Multiplikation'],['divide','Divide','除法','Division'],['modulo','Modulo','取余','Modulo'],['minimum','Minimum','最小值','Minimum'],['maximum','Maximum','最大值','Maximum']])entry('math.'+kind,title,zh,de,'对两个有限数值执行“'+zh+'”运算。','Die Operation „'+de+'“ auf zwei endliche Zahlen anwenden.')
for(const [kind,title,zh,de] of [['equal','Equal','等于','Gleich'],['not_equal','Not Equal','不等于','Ungleich'],['less','Less','小于','Kleiner'],['less_equal','Less Equal','小于或等于','Kleiner oder gleich'],['greater','Greater','大于','Größer'],['greater_equal','Greater Equal','大于或等于','Größer oder gleich']])entry('compare.'+kind,title,zh,de,'比较两个输入是否满足“'+zh+'”关系。','Prüfen, ob die beiden Eingaben die Beziehung „'+de+'“ erfüllen.')
entry('logic.and','And','逻辑与','Logisches Und','对两个布尔输入执行逻辑与。','Zwei boolesche Eingaben logisch mit Und verknüpfen.')
entry('logic.or','Or','逻辑或','Logisches Oder','对两个布尔输入执行逻辑或。','Zwei boolesche Eingaben logisch mit Oder verknüpfen.')
entry('logic.not','Not','逻辑非','Logische Negation','反转布尔输入。','Die boolesche Eingabe negieren.')
entry('value.make_vec2','Make Vec2','构造二维向量','2D-Vektor erstellen','由 X 和 Y 分量构造二维向量。','Einen 2D-Vektor aus X- und Y-Komponenten erstellen.')
entry('value.break_vec2','Break Vec2','拆分二维向量','2D-Vektor zerlegen','读取二维向量的 X 和 Y 分量。','Die X- und Y-Komponenten eines 2D-Vektors lesen.')
for(const [kind,title,zh,de] of [['number_to_string','Number To String','数值转字符串','Zahl in Zeichenfolge'],['boolean_to_string','Boolean To String','布尔值转字符串','Boolescher Wert in Zeichenfolge'],['boolean_to_number','Boolean To Number','布尔值转数值','Boolescher Wert in Zahl'],['string_to_number','String To Number','字符串转数值','Zeichenfolge in Zahl']])entry('convert.'+kind,title,zh,de,'执行显式类型转换：'+zh+'。','Explizite Typumwandlung: '+de+'.')
entry('reroute.data','Reroute','数据转接','Datenumleitung','整理数据线走向，不改变传递值。','Eine Datenleitung übersichtlich führen, ohne ihren Wert zu ändern.')
entry('reroute.execution','Execution Reroute','执行转接','Ausführungsumleitung','整理执行线走向。','Eine Ausführungsleitung übersichtlich führen.')
entry('variable.get','Get Variable','读取图变量','Graphvariable lesen','读取当前图变量。','Eine Variable des Graphen lesen.')
entry('variable.set','Set Variable','写入图变量','Graphvariable schreiben','写入当前图变量。','Eine Variable des Graphen schreiben.')
entry('local.get','Get Local','读取局部变量','Lokale Variable lesen','读取函数局部变量。','Eine lokale Variable der Funktion lesen.')
entry('local.set','Set Local','写入局部变量','Lokale Variable schreiben','写入函数局部变量。','Eine lokale Variable der Funktion schreiben.')
export const LEGACY_GRAPH_COPY_TYPES=Object.keys(copies)
/** 只有与系统默认标题逐字相同的节点才替换标题；用户改名保持不变。 */
export function legacyGraphTitle(type:string,title:string,locale:GraphCopyLocale):string{const copy=copies[type];return !copy||locale==='en'||title!==copy.title?title:copy[locale]}
/** 已知系统节点采用对应语言帮助，未知或插件节点保持原说明。 */
export function legacyGraphHelp(type:string,locale:GraphCopyLocale,fallback:string):string{const copy=copies[type];return !copy||locale==='en'?fallback:locale==='zh'?copy.helpZh:copy.helpDe}
/** 标准端口文字只在已知内置节点上翻译，不改 API 参数或作者自定义端口名称。 */
export function legacyGraphPin(type:string,name:string,locale:GraphCopyLocale):string{
 if(!copies[type]||locale==='en')return name
 const labels:Record<string,[string,string]>={In:['输入','Eingang'],Out:['输出','Ausgang'],Next:['继续','Weiter'],Completed:['完成','Abgeschlossen'],Condition:['条件','Bedingung'],True:['成立','Wahr'],False:['不成立','Falsch'],'Then 0':['第一步','Erster Pfad'],'Then 1':['第二步','Zweiter Pfad'],'Loop body':['循环体','Schleifenrumpf'],Count:['次数','Anzahl'],Index:['索引','Index'],Value:['值','Wert'],Result:['结果','Ergebnis'],Boolean:['布尔值','Boolescher Wert'],Number:['数值','Zahl'],String:['字符串','Zeichenfolge'],Vec2:['二维向量','2D-Vektor'],Data:['动态数据','Dynamische Daten']}
 return labels[name]?.[locale==='zh'?0:1]??name
}
