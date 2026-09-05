export const renderSettingsCopy = {
  en: {
    uploads: 'GPU uploads this frame', queue: 'Queued textures', queueBytes: 'Queued source pixels', deferred: 'Deferred requests this frame',
    cap: 'GPU texture residency is limited to {cap} MiB. CPU image and derived-texture caches have separate limits. The limit also applies when streaming is off.',
    enabled: 'Streaming spreads uploads across frames and evicts idle textures. Missing textures temporarily use the fallback until uploaded; existing textures keep their last uploaded pixels.',
    preloadOn: 'Preload margin expands performance culling bounds. Nearby enabled textures are decoded and queued after visible draws.',
    preloadOff: 'Preload margin requires performance culling. Without culling, drawable textures are already requested. GPU preload also requires streaming to be enabled.',
    canvas: 'Canvas2D uses the bounded CPU image cache; GPU residency, upload budgets and idle eviction do not apply. GPU counters are unavailable.',
  },
  de: {
    uploads: 'GPU-Uploads in diesem Frame', queue: 'Texturen in Warteschlange', queueBytes: 'Quelldaten in Warteschlange', deferred: 'Zurückgestellte Anfragen im Frame',
    cap: 'Der GPU-Texturspeicher ist auf {cap} MiB begrenzt. CPU-Bild- und abgeleitete Textur-Caches haben eigene Grenzen. Das Limit gilt auch ohne Streaming.',
    enabled: 'Streaming verteilt Uploads auf mehrere Frames und entfernt ungenutzte Texturen. Fehlende Texturen zeigen bis zum Upload den Ersatz; vorhandene behalten die zuletzt geladenen Pixel.',
    preloadOn: 'Der Vorladerand erweitert das Performance-Culling. Nahe aktivierte Texturen werden nach sichtbaren Zeichenbefehlen dekodiert und eingereiht.',
    preloadOff: 'Der Vorladerand benötigt Performance-Culling. Ohne Culling werden darstellbare Texturen bereits angefordert. GPU-Vorladen benötigt außerdem aktiviertes Streaming.',
    canvas: 'Canvas2D nutzt den begrenzten CPU-Bildcache. GPU-Speicher, Upload-Budget und GPU-Leerlaufbereinigung gelten hier nicht; GPU-Zähler sind nicht verfügbar.',
  },
  zh: {
    uploads: '本帧 GPU 上传数', queue: '待上传纹理数', queueBytes: '待上传源像素', deferred: '本帧延迟请求数',
    cap: 'GPU 纹理驻留上限为 {cap} MiB。CPU 图像与派生纹理缓存另有容量限制。关闭流式加载时此上限仍然有效。',
    enabled: '流式加载将上传分散到多帧，并回收闲置纹理。缺失纹理在上传前显示替代图像；已有纹理保留上次上传的像素。',
    preloadOn: '预加载边距扩展性能裁剪范围。附近已启用的纹理会在可见绘制之后解码并加入上传队列。',
    preloadOff: '预加载边距需要开启性能裁剪。未裁剪时已会请求可绘制纹理。GPU 预加载还需要启用流式加载。',
    canvas: 'Canvas2D 使用有容量上限的 CPU 图像缓存；GPU 驻留、上传预算和 GPU 闲置回收不适用，GPU 计数不可用。',
  },
} as const
