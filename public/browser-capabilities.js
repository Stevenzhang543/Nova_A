/* 启动能力检查保持 ES5 语法，使 IE 在解析应用模块前收到可读提示。 */
(/** 在模块代码解析前检测最低浏览器能力，并为不支持的环境显示说明。 */ function () {
  var supported = 'noModule' in document.createElement('script') && typeof WebAssembly === 'object' && typeof Promise === 'function' && typeof fetch === 'function' && typeof Worker === 'function' && typeof ResizeObserver === 'function' && 'inert' in HTMLElement.prototype;
  window.novaBrowserSupported = supported;
  if (!supported) {
    var language = (navigator.language || 'en').toLowerCase();
    var text = language.indexOf('zh') === 0 ? '此浏览器缺少 Nova_A 需要的功能。请使用新版 Chrome、Edge、Firefox 或 Safari。项目尚未打开，也未被修改。' : language.indexOf('de') === 0 ? 'Dieser Browser unterstützt benötigte Nova_A-Funktionen nicht. Bitte aktuelles Chrome, Edge, Firefox oder Safari verwenden. Ihr Projekt wurde nicht geöffnet oder verändert.' : 'This browser lacks features required by Nova_A. Use a current Chrome, Edge, Firefox or Safari. Your project has not been opened or changed.';
    var root = document.getElementById('app');
    root.setAttribute('role', 'alert'); root.style.cssText = 'padding:32px;font:20px sans-serif;line-height:1.6'; root.appendChild(document.createTextNode(text));
  }
}());
