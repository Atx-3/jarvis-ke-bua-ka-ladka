import { useState, type ChangeEvent } from 'react'
import { Sparkles } from 'lucide-react'
import './App.css'
import HandTracker from './components/HandTracker'
import SceneRenderer from './components/ParticleSystem'
import type { HandControls, SceneMode } from './types'

// Default zoomed out for solar system (lower zoom = farther camera)
const initialControls: HandControls = { zoom: 0.6, panX: 0, panY: 0, hasBothHands: false }

const modes: SceneMode[] = ['solar', 'dots', 'model']

function App() {
  const [controls, setControls] = useState<HandControls>(initialControls)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [mode, setMode] = useState<SceneMode>('solar')
  const [modelUrl, setModelUrl] = useState<string | null>(null)

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    // Store file type for detection
    const fileType = file.type || file.name.toLowerCase()
    setModelUrl(url + '|' + fileType) // Pass file type info
    setMode('model')
  }

  return (
    <div className="app-shell">
      <div className="title-block">
        <Sparkles size={20} />
        <div>
          <p className="eyebrow">Close/open hand = zoom | Closed fist + move = pan</p>
          <h1>DOTS / SOLAR / MODEL</h1>
        </div>
      </div>

      <SceneRenderer controls={controls} mode={mode} modelUrl={modelUrl} />

      <div className="controls glass">
        <div className="controls__row">
          <p className="label">Mode</p>
          <div className="shape-grid">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                className={`shape-btn ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <label className="file-input-label">
            <input type="file" accept=".gltf,.glb,.obj,.png,.jpg,.jpeg,.webp" onChange={handleFile} style={{ display: 'none' }} />
            <span className="shape-btn">Upload Image/Model</span>
          </label>
        </div>

        <div className="controls__row">
          <p className="label">Status</p>
          <span>Close/open hand = zoom | Closed fist + move = pan left/right/up/down</span>
          {cameraError ? <span className="tension-note">{cameraError}</span> : null}
        </div>
        <div className="controls__row">
          <p className="label">Zoom</p>
          <div className="tension-bar">
            <div
              className="tension-fill"
              style={{ width: `${Math.min(Math.max((controls.zoom - 0.5) / 2, 0), 1) * 100}%` }}
            />
          </div>
          <p className="label">Pan X/Y</p>
          <span>{`${controls.panX.toFixed(2)} / ${controls.panY.toFixed(2)}`}</span>
        </div>
      </div>

      <HandTracker
        onControls={setControls}
        onError={setCameraError}
      />
    </div>
  )
}

export default App
