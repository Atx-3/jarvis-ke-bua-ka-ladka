export interface HandControls {
  zoom: number // 1 = neutral, <1 zoom out, >1 zoom in
  panX: number // left/right camera position (-1 to 1)
  panY: number // up/down camera position (-1 to 1)
  hasBothHands: boolean
}

export interface HandTrackerProps {
  onControls: (controls: HandControls) => void
  onError?: (message: string | null) => void
}

export type SceneMode = 'solar' | 'dots' | 'model'

export interface SceneProps {
  controls: HandControls
  mode: SceneMode
  modelUrl?: string | null
}

