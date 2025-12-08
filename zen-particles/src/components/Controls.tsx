import type { ControlsProps, ShapeType } from '../types'

const shapes: ShapeType[] = ['heart', 'flower', 'saturn', 'buddha', 'fireworks', 'sphere']

export default function Controls({
  shape,
  onShapeChange,
  color,
  onColorChange,
  tension,
  palette,
  cameraError,
}: ControlsProps) {
  return (
    <div className="controls glass">
      <div className="controls__row">
        <p className="label">Shapes</p>
        <div className="shape-grid">
          {shapes.map((item) => (
            <button
              key={item}
              type="button"
              className={`shape-btn ${shape === item ? 'active' : ''}`}
              onClick={() => onShapeChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="controls__row">
        <p className="label">Color</p>
        <div className="color-row">
          {palette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`swatch ${color === swatch ? 'selected' : ''}`}
              style={{ backgroundColor: swatch }}
              onClick={() => onColorChange(swatch)}
              aria-label={`Color ${swatch}`}
            />
          ))}
        </div>
      </div>

      <div className="controls__row">
        <p className="label">Hand tension</p>
        <div className="tension-bar">
          <div className="tension-fill" style={{ width: `${Math.round(tension * 100)}%` }} />
        </div>
        {cameraError ? <span className="tension-note">Camera blocked — retry above</span> : null}
      </div>
    </div>
  )
}

