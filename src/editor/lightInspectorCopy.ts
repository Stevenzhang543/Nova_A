/** Renderer capability copy; changing a light type never erases its stored shadow preferences. */
export const directionalShadowHint = {
  en: 'Directional lights do not cast shadows. Stored shadow settings apply when you choose another light type.',
  de: 'Gerichtete Lichter werfen keine Schatten. Gespeicherte Schatteneinstellungen gelten wieder, wenn Sie einen anderen Lichttyp wählen.',
  zh: '平行光暂不投射阴影。切换到其他光源类型后，将继续使用已保存的阴影设置。',
} as const