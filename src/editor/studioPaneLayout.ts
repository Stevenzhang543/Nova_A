/** Layout-only measurements/preferences. These do not mutate project content. */
export interface StudioPaneRequest {
  width: number
  primaryOpen: boolean
  secondaryOpen: boolean
  primaryWidth: number
  secondaryWidth: number
  activePanel: 'primary' | 'secondary'
  focused: boolean
}
export function studioPaneLayout(request: StudioPaneRequest) {
  const width=Math.max(1,Number.isFinite(request.width)?request.width:1)
  const primaryWidth=Math.min(Math.max(184,Number.isFinite(request.primaryWidth)?request.primaryWidth:264),Math.max(184,width-400),480)
  const secondaryWidth=Math.min(Math.max(224,Number.isFinite(request.secondaryWidth)?request.secondaryWidth:344),Math.max(224,width-400),560)
  const drawer=width<640
  const bothFit=width>=primaryWidth+secondaryWidth+440
  const primaryVisible=!request.focused&&request.primaryOpen&&(bothFit||!request.secondaryOpen||request.activePanel==='primary')
  const secondaryVisible=!request.focused&&request.secondaryOpen&&(bothFit||!request.primaryOpen||request.activePanel==='secondary')
  return {
    primaryVisible,secondaryVisible,drawer,
    primaryWidth:drawer?Math.max(1,Math.min(width-24,320)):primaryWidth,
    secondaryWidth:drawer?Math.max(1,Math.min(width-24,360)):secondaryWidth,
    columns:drawer?'minmax(0, 1fr)':[...(primaryVisible?[`${primaryWidth}px`]:[]),'minmax(0, 1fr)',...(secondaryVisible?[`${secondaryWidth}px`]:[])].join(' '),
  }
}
