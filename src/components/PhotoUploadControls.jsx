import ActionButton from './internal/ActionButton.jsx'

function PhotoUploadControls({
  zoom,
  offsetStep,
  onZoomChange,
  onNudge,
  onReset,
}) {
  return (
    <div className="uphoto-controls">
      <div className="uphoto-controls__panel">
        <div className="uphoto-controls__row">
          <span className="uphoto-controls__label">Zoom</span>
          <span className="uphoto-controls__value">{zoom.toFixed(1)}x</span>
        </div>
        <div className="uphoto-controls__zoom-actions">
          <ActionButton type="button" onClick={() => onZoomChange(-1)} className="uphoto-controls__zoom-btn">
            Zoom Out
          </ActionButton>
          <ActionButton type="button" onClick={() => onZoomChange(1)} className="uphoto-controls__zoom-btn">
            Zoom In
          </ActionButton>
        </div>
      </div>

      <div className="uphoto-controls__panel uphoto-controls__panel--spaced">
        <p className="uphoto-controls__label">Position</p>
        <div className="uphoto-controls__pad-wrap">
          <div className="uphoto-controls__pad">
            <span />
            <ActionButton type="button" onClick={() => onNudge(0, -offsetStep)} className="uphoto-controls__nudge-btn">↑</ActionButton>
            <span />
            <ActionButton type="button" onClick={() => onNudge(-offsetStep, 0)} className="uphoto-controls__nudge-btn">←</ActionButton>
            <ActionButton type="button" onClick={onReset} className="uphoto-controls__nudge-btn uphoto-controls__reset-btn">Reset</ActionButton>
            <ActionButton type="button" onClick={() => onNudge(offsetStep, 0)} className="uphoto-controls__nudge-btn">→</ActionButton>
            <span />
            <ActionButton type="button" onClick={() => onNudge(0, offsetStep)} className="uphoto-controls__nudge-btn">↓</ActionButton>
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadControls
