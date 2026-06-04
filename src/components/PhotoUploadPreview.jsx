function PhotoUploadPreview({
  frameWidth,
  frameHeight,
  displayScale = 1,
  previewUrl,
  previewMetrics,
  showGuide = false,
  interactive = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const scaledWidth = Math.round(frameWidth * displayScale)
  const scaledHeight = Math.round(frameHeight * displayScale)

  return (
    <div className="uphoto-preview-shell">
      <div className="uphoto-preview-scale" style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
        <div
          className={`uphoto-preview-frame${interactive ? ' uphoto-preview-frame--interactive' : ''}`}
          style={{
            width: `${frameWidth}px`,
            height: `${frameHeight}px`,
            transform: `scale(${displayScale})`,
            transformOrigin: 'top left',
          }}
          onPointerDown={interactive ? (event) => onPointerDown?.(event, displayScale) : undefined}
          onPointerMove={interactive ? onPointerMove : undefined}
          onPointerUp={interactive ? onPointerUp : undefined}
          onPointerCancel={interactive ? onPointerUp : undefined}
        >
          {previewUrl && previewMetrics ? (
            <>
              <img
                src={previewUrl}
                alt="Selected upload preview"
                className="uphoto-preview-image"
                draggable="false"
                style={{
                  width: `${previewMetrics.renderedWidth}px`,
                  height: `${previewMetrics.renderedHeight}px`,
                  left: `${previewMetrics.previewLeft}px`,
                  top: `${previewMetrics.previewTop}px`,
                }}
              />
              {showGuide ? (
                <div className="uphoto-preview-guide-wrap">
                  <div className="uphoto-preview-guide" />
                </div>
              ) : null}
              <div className="uphoto-preview-overlay" />
            </>
          ) : (
            <p className="uphoto-preview-empty">
              Your image will be cropped to this portrait frame.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadPreview
