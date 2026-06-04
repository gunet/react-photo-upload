function PhotoUploadStepBadge({ number, title, isActive, isComplete, compact = false }) {
  const stateClassName = isComplete
    ? 'uphoto-step-badge__number--complete'
    : isActive
      ? 'uphoto-step-badge__number--active'
      : 'uphoto-step-badge__number--idle'

  return (
    <div className={`uphoto-step-badge${compact ? ' uphoto-step-badge--compact' : ''}`}>
      <div className={`uphoto-step-badge__number ${stateClassName}`}>
        {isComplete ? '✓' : number}
      </div>
      <p className="uphoto-step-badge__title">{title}</p>
    </div>
  )
}

export default PhotoUploadStepBadge
