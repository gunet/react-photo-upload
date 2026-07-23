import { useEffect, useState } from 'react'
import PhotoUploadControls from './PhotoUploadControls'
import PhotoUploadPreview from './PhotoUploadPreview'
import PhotoUploadStepBadge from './PhotoUploadStepBadge'
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  OFFSET_STEP,
} from '../constants.js'
import { formatMegabytes } from '../utils.js'
import { usePhotoUpload } from '../usePhotoUpload.js'
import ActionButton from './internal/ActionButton.jsx'

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function PhotoUploadFlow({
  isModal = false,
  onCancel,
  onSavingChange,
  validationUrl = '',
  saveUrl = '',
  onSaveSuccess,
}) {
  const {
    currentStep,
    errorMessage,
    handleDownloadCropped,
    handleFileChange,
    handleNudge,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSave,
    handleSubmit,
    handleZoomChange,
    hasSelectedImage,
    imageDimensions,
    isUploading,
    isSaving,
    isValidated,
    previewMetrics,
    previewUrl,
    resetAlignment,
    responseData,
    saveMessage,
    selectedFile,
    setCurrentStep,
    validatedCroppedBlob,
    validatedCroppedUrl,
    zoom,
  } = usePhotoUpload({
    validationUrl,
    saveUrl,
    onSaveSuccess: (payload) => {
      if (isModal) {
        onCancel?.({ force: true })
      }
      onSaveSuccess?.(payload)
    },
  })
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  )

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    onSavingChange?.(isSaving)
  }, [isSaving, onSavingChange])

  const footerButtonClassName = isModal ? 'uphoto-modal-step-btn' : ''
  const stepActionsColumnsClassName =
    currentStep === 2
      ? 'uphoto-modal-actions--cols-3'
      : 'uphoto-modal-actions--cols-1'

  const renderStepActions = () => {
    if (currentStep === 1) {
      return (
        <ActionButton
          type="button"
          variant="primary"
          disabled={!hasSelectedImage}
          onClick={() => setCurrentStep(2)}
          className={footerButtonClassName}
        >
          Continue
        </ActionButton>
      )
    }

    if (currentStep === 2) {
      return (
        <>
          <ActionButton
            type="button"
            disabled={isUploading || isSaving}
            onClick={() => setCurrentStep(1)}
            className={footerButtonClassName}
          >
            Back
          </ActionButton>
          <ActionButton
            type="button"
            variant="primary"
            disabled={isUploading || isSaving || !selectedFile || !imageDimensions}
            onClick={handleSubmit}
            className={footerButtonClassName}
          >
            {isUploading ? (
              'Validating...'
            ) : isValidated ? (
              'Revalidate'
            ) : (
              <>
                <span className="uphoto-mobile-only">Validate</span>
                <span className="uphoto-desktop-only-inline">Validate Photo</span>
              </>
            )}
          </ActionButton>
          <ActionButton
            type="button"
            variant="primary"
            disabled={!isValidated || isUploading || isSaving}
            onClick={handleSave}
            className={footerButtonClassName}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </ActionButton>
        </>
      )
    }
  }

  const stepActions = renderStepActions()
  const previewDisplayScale = !isModal
    ? 1
    : viewportWidth < 390
      ? 0.72
      : viewportWidth < 640
        ? 0.82
        : viewportWidth < 768
          ? 0.9
          : 1
  const previewFrameWidth = FRAME_WIDTH
  const previewFrameHeight = FRAME_HEIGHT
  const stepHeaderContent = {
    1: {
      title: 'Choose your photo',
    },
    2: {
      title: 'Align, validate, and save',
    },
  }
  const modalStepItems = [
    { number: 1, label: 'Choose', icon: 'upload' },
    { number: 2, label: 'Align & Save', icon: 'save' },
  ]
  const activeStepHeader = stepHeaderContent[currentStep] || stepHeaderContent[1]
  const completedStepsCount = Math.max(1, Math.min(currentStep, 2))
  const flowClassName = `uphoto-photo-upload ${
    isModal ? 'uphoto-photo-upload--modal' : 'uphoto-photo-upload--inline'
  }`

  return (
    <section className={flowClassName}>
      {!isModal ? (
        <div>
          <p className="uphoto-eyebrow">Photo Upload</p>
          <h3 className="uphoto-section-title">Upload, align, validate, and save your photo</h3>
        </div>
      ) : null}

      {isModal ? (
        <div className="uphoto-modal-header">
          <div className="uphoto-modal-header__row">
            <div>
              <p className="uphoto-modal-label">Photo Upload</p>
              <h3 className="uphoto-modal-title">{activeStepHeader.title}</h3>
            </div>

            <div className="uphoto-modal-progress-wrap">
              <div className="uphoto-modal-progress">
                {modalStepItems.map((step) => {
                  const isComplete = step.number < currentStep
                  const isActive = step.number === currentStep
                  const stateClassName = isComplete
                    ? 'uphoto-modal-step-icon--complete'
                    : isActive
                      ? 'uphoto-modal-step-icon--active'
                      : 'uphoto-modal-step-icon--idle'

                  return (
                    <div key={step.number} className="uphoto-modal-step">
                      <div className={`uphoto-modal-step-icon ${stateClassName}`} title={step.label}>
                        {step.icon === 'upload' ? (
                          <svg viewBox="0 0 20 20" aria-hidden="true" className="uphoto-modal-step-svg">
                            <path d="M10 13V5m0 0 3 3m-3-3-3 3M4.5 14.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                          </svg>
                        ) : null}
                        {step.icon === 'save' ? (
                          <svg viewBox="0 0 20 20" aria-hidden="true" className="uphoto-modal-step-svg">
                            <path d="M5.5 4.5h9l1 1v10h-11v-11Zm2 0v4h5v-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                          </svg>
                        ) : null}
                      </div>
                      {step.number < modalStepItems.length ? (
                        <span className={`uphoto-modal-step-divider ${step.number < currentStep ? 'uphoto-modal-step-divider--complete' : ''}`} />
                      ) : null}
                    </div>
                  )
                })}
                <p className="uphoto-modal-step-count">{`Step ${completedStepsCount}/2`}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="uphoto-step-badges-wrap">
          <div className="uphoto-step-badges-grid">
            <PhotoUploadStepBadge number="1" title="Choose" isActive={currentStep === 1} isComplete={hasSelectedImage} />
            <PhotoUploadStepBadge number="2" title="Align, Validate & Save" isActive={currentStep === 2} isComplete={Boolean(saveMessage)} />
          </div>
        </div>
      )}

      <form
        className={`uphoto-form${isModal ? ' uphoto-form--modal' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className={isModal ? 'uphoto-form-scroll' : ''}>
          {currentStep === 1 ? (
            <div>
              <p className="uphoto-copy">Select a clear portrait photo to continue.</p>

              <label
                htmlFor="photo-upload"
                className="uphoto-file-drop"
              >
                <span className="uphoto-file-drop__label">Select Image</span>
                <span className="uphoto-file-drop__title">Browse your device</span>
                <span className="uphoto-file-drop__copy">
                  PNG, JPG, or JPEG up to 10 MB, minimum 1200 x 1600 px.
                </span>
              </label>

              <input
                id="photo-upload"
                type="file"
                name="photo"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileChange}
                className="uphoto-sr-only"
              />

              {selectedFile ? (
                <div className="uphoto-file-meta">
                  <p className="uphoto-file-meta__name">{selectedFile.name}</p>
                  <p className="uphoto-file-meta__size">{formatMegabytes(selectedFile.size)}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div>
              <p className="uphoto-copy">
                Drag the image inside the frame, fine-tune it, and validate as many times as you need.
              </p>
              {errorMessage ? (
                <p className="uphoto-alert uphoto-alert--error">{errorMessage}</p>
              ) : null}
              {!errorMessage && isValidated ? (
                <p className="uphoto-alert uphoto-alert--success">Photo validation completed successfully.</p>
              ) : null}
              {saveMessage ? (
                <p className="uphoto-alert uphoto-alert--success">{saveMessage}</p>
              ) : null}

              <div className="uphoto-step-two-layout">
                <div className="uphoto-step-two-preview-wrap">
                  <PhotoUploadPreview
                    frameWidth={previewFrameWidth}
                    frameHeight={previewFrameHeight}
                    displayScale={previewDisplayScale}
                    previewUrl={previewUrl}
                    previewMetrics={previewMetrics}
                    showGuide
                    interactive={!isUploading && !isSaving}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />

                  <div className="uphoto-mobile-controls">
                    <ActionButton type="button" disabled={isUploading || isSaving} onClick={resetAlignment} className="uphoto-icon-btn" aria-label="Reset position">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="uphoto-icon-svg">
                        <path d="M7.8 7.8A6 6 0 1 1 6 12M6 7.8V4.5M6 7.8h3.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </svg>
                    </ActionButton>
                    <ActionButton type="button" disabled={isUploading || isSaving} onClick={() => handleZoomChange(-1)} className="uphoto-icon-btn" aria-label="Zoom out">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="uphoto-icon-svg">
                        <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M15 15 20 20M8 10.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </svg>
                    </ActionButton>
                    <ActionButton type="button" disabled={isUploading || isSaving} onClick={() => handleZoomChange(1)} className="uphoto-icon-btn" aria-label="Zoom in">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="uphoto-icon-svg">
                        <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M15 15 20 20M8 10.5h5M10.5 8v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </svg>
                    </ActionButton>
                  </div>
                </div>

                <div className="uphoto-desktop-controls">
                  <PhotoUploadControls
                    zoom={zoom}
                    offsetStep={OFFSET_STEP}
                    onZoomChange={handleZoomChange}
                    onNudge={handleNudge}
                    onReset={resetAlignment}
                    disabled={isUploading || isSaving}
                  />
                </div>
              </div>

              {responseData ? (
                <>
                  <div className="uphoto-info-card uphoto-mt-lg">
                    <div className="uphoto-info-card__head">
                      <p className="uphoto-label">Validation Request</p>
                      <button
                        type="button"
                        className="uphoto-link-btn"
                        disabled={isUploading || isSaving || (!validatedCroppedBlob && (!selectedFile || !imageDimensions))}
                        onClick={handleDownloadCropped}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true" className="uphoto-link-btn__icon">
                          <path
                            d="M10 3.75v8m0 0 3-3m-3 3-3-3M4.75 13.75v1.5a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1v-1.5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.6"
                          />
                        </svg>
                        <span>Download cropped photo</span>
                      </button>
                    </div>

                    <div className="uphoto-sub-card">
                      <p className="uphoto-label uphoto-label--tiny">Submitted Cropped Preview</p>
                      {validatedCroppedUrl ? (
                        <img
                          src={validatedCroppedUrl}
                          alt="Cropped photo submitted for validation"
                          className="uphoto-sub-card__image"
                        />
                      ) : (
                        <p className="uphoto-copy uphoto-mt-sm">Cropped preview will appear after validation.</p>
                      )}
                    </div>
                  </div>

                  <div className="uphoto-info-card uphoto-mt-md">
                    <p className="uphoto-label">Validation Response</p>

                    <pre className="uphoto-response-pre">
                      {JSON.stringify(responseData, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {currentStep === 1 && errorMessage && !selectedFile ? (
            <p className="uphoto-alert uphoto-alert--error uphoto-mt-lg">{errorMessage}</p>
          ) : null}

          {!isModal ? <div className="uphoto-footer-actions">{stepActions}</div> : null}
        </div>

        {isModal ? (
          <div className="uphoto-modal-footer">
            <div className="uphoto-modal-footer__row">
              <div className={`uphoto-modal-actions ${stepActionsColumnsClassName}`}>
                {stepActions}
              </div>
              <ActionButton type="button" disabled={isSaving} onClick={onCancel} className="uphoto-modal-cancel-btn">
                Cancel
              </ActionButton>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  )
}

function PhotoUploadCard({
  openInModal = false,
  openButtonLabel = 'Open Photo Upload',
  containerClassName = '',
  openButtonClassName = '',
  openButtonVariant = 'primary',
  modalTitle = 'Photo Upload',
  modalAriaLabel = 'Upload and validate your photo',
  validationUrl = '',
  saveUrl = '',
  onSaveSuccess,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalSaving, setIsModalSaving] = useState(false)

  const closeModal = ({ force = false } = {}) => {
    if (isModalSaving && !force) {
      return
    }

    setIsModalSaving(false)
    setIsModalOpen(false)
  }

  useEffect(() => {
    if (!isModalOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isModalOpen])

  if (!openInModal) {
    return (
      <div className={joinClassNames('uphoto-root', containerClassName)}>
        <PhotoUploadFlow validationUrl={validationUrl} saveUrl={saveUrl} onSaveSuccess={onSaveSuccess} />
      </div>
    )
  }

  return (
    <div className={joinClassNames('uphoto-root', containerClassName)}>
      <ActionButton
        type="button"
        variant={openButtonVariant}
        className={openButtonClassName}
        onClick={() => {
          setIsModalSaving(false)
          setIsModalOpen(true)
        }}
      >
        {openButtonLabel}
      </ActionButton>

      {isModalOpen ? (
        <div
          className="uphoto-modal-overlay"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="uphoto-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={modalAriaLabel}
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="uphoto-sr-only">{modalTitle}</h4>
            <PhotoUploadFlow
              isModal
              validationUrl={validationUrl}
              saveUrl={saveUrl}
              onSaveSuccess={onSaveSuccess}
              onCancel={closeModal}
              onSavingChange={setIsModalSaving}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PhotoUploadCard
