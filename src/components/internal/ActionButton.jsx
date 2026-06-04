function ActionButton({ children, variant = 'secondary', className = '', ...props }) {
  const variantClassName = variant === 'primary' ? 'uphoto-btn--primary' : 'uphoto-btn--secondary'
  const mergedClassName = ['uphoto-btn', variantClassName, className].filter(Boolean).join(' ')

  return (
    <button className={mergedClassName} {...props}>
      {children}
    </button>
  )
}

export default ActionButton
