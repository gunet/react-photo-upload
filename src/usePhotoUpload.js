import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  ALIGNMENT_NOT_READY_ERROR_MESSAGE,
  DOWNLOAD_CROPPED_FAILED_ERROR_MESSAGE,
  INVALID_FILE_TYPE_ERROR_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_ERROR_MESSAGE,
  MIN_IMAGE_ERROR_MESSAGE,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  PHOTO_NOT_ACCEPTED_ERROR_MESSAGE,
  PHOTO_SAVE_FAILED_ERROR_MESSAGE,
  PHOTO_SAVE_SUCCESS_MESSAGE,
  PHOTO_UPLOAD_FAILED_ERROR_MESSAGE,
  SAVE_URL_MISSING_ERROR_MESSAGE,
  SELECT_IMAGE_ERROR_MESSAGE,
  VALIDATION_URL_MISSING_ERROR_MESSAGE,
  ZOOM_STEP,
} from './constants.js'
import {
  buildPreviewMetrics,
  clamp,
  createBlobFromCanvas,
  createCroppedCanvas,
  createOutputFile,
  isAcceptedFile,
  isAcceptedValidationResponse,
  loadImageFromUrl,
  triggerBlobDownload,
} from './utils.js'

export function usePhotoUpload({ validationUrl, saveUrl, uploadUrl } = {}) {
  const resolvedValidationUrl = validationUrl || uploadUrl || ''
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageDimensions, setImageDimensions] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [horizontalOffset, setHorizontalOffset] = useState(0)
  const [verticalOffset, setVerticalOffset] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [responseData, setResponseData] = useState(null)
  const [validatedCroppedBlob, setValidatedCroppedBlob] = useState(null)
  const [validatedCroppedUrl, setValidatedCroppedUrl] = useState('')
  const [validatedCroppedFileName, setValidatedCroppedFileName] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveResponseData, setSaveResponseData] = useState(null)
  const dragStateRef = useRef(null)

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setImageDimensions(null)
    setCurrentStep(1)
  }

  const clearValidatedCroppedAsset = () => {
    setValidatedCroppedBlob(null)
    setValidatedCroppedFileName('')
    setValidatedCroppedUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      return ''
    })
  }

  const invalidateValidation = () => {
    setResponseData(null)
    clearValidatedCroppedAsset()
    setSaveMessage('')
    setSaveResponseData(null)
  }

  useEffect(() => () => clearValidatedCroppedAsset(), [])

  useEffect(() => {
    if (!selectedFile || !previewUrl) {
      return undefined
    }

    let isActive = true

    loadImageFromUrl(previewUrl)
      .then((image) => {
        if (!isActive) {
          return
        }

        if (
          image.naturalWidth < MIN_IMAGE_WIDTH ||
          image.naturalHeight < MIN_IMAGE_HEIGHT
        ) {
          clearSelection()
          setErrorMessage(MIN_IMAGE_ERROR_MESSAGE)
          return
        }

        setImageDimensions({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
        setCurrentStep(2)
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        clearSelection()
        setErrorMessage(error.message)
      })

    return () => {
      isActive = false
    }
  }, [previewUrl, selectedFile])

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    },
    [previewUrl],
  )

  const getCurrentPreviewMetrics = () =>
    buildPreviewMetrics(imageDimensions, zoom, horizontalOffset, verticalOffset)

  const applyOffsetDelta = (deltaX, deltaY) => {
    const previewMetrics = getCurrentPreviewMetrics()

    if (!previewMetrics) {
      return
    }

    invalidateValidation()

    if (previewMetrics.xRange > 0) {
      setHorizontalOffset((current) =>
        clamp(current + (deltaX / previewMetrics.xRange) * 100, -100, 100),
      )
    }

    if (previewMetrics.yRange > 0) {
      setVerticalOffset((current) =>
        clamp(current + (deltaY / previewMetrics.yRange) * 100, -100, 100),
      )
    }
  }

  const resetAlignment = () => {
    invalidateValidation()
    setZoom(1)
    setHorizontalOffset(0)
    setVerticalOffset(0)
  }

  const handlePointerDown = (event, pointerScale = 1) => {
    const previewMetrics = getCurrentPreviewMetrics()

    if (!previewMetrics || (!previewMetrics.xRange && !previewMetrics.yRange)) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerScale,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const scale = dragState.pointerScale || 1
    const deltaX = (event.clientX - dragState.startX) / scale
    const deltaY = (event.clientY - dragState.startY) / scale

    dragStateRef.current = {
      ...dragState,
      startX: event.clientX,
      startY: event.clientY,
    }

    applyOffsetDelta(deltaX, deltaY)
  }

  const handlePointerUp = (event) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleZoomChange = (direction) => {
    invalidateValidation()
    setZoom((current) => clamp(current + direction * ZOOM_STEP, 1, 2.5))
  }

  const handleNudge = (deltaX, deltaY) => {
    applyOffsetDelta(deltaX, deltaY)
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null
    invalidateValidation()
    setCurrentStep(1)

    if (!file) {
      clearSelection()
      setErrorMessage('')
      return
    }

    if (!isAcceptedFile(file)) {
      clearSelection()
      setErrorMessage(INVALID_FILE_TYPE_ERROR_MESSAGE)
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      clearSelection()
      setErrorMessage(MAX_FILE_SIZE_ERROR_MESSAGE)
      event.target.value = ''
      return
    }

    resetAlignment()
    const objectUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(objectUrl)
    setErrorMessage('')
  }

  const prepareCroppedCanvas = async () => {
    if (!selectedFile || !previewUrl || !imageDimensions) {
      throw new Error('Please select and align an image before uploading.')
    }

    const previewMetrics = getCurrentPreviewMetrics()

    if (!previewMetrics) {
      throw new Error(ALIGNMENT_NOT_READY_ERROR_MESSAGE)
    }

    return createCroppedCanvas(previewUrl, previewMetrics)
  }

  const handleDownloadCropped = async () => {
    if (!selectedFile && !validatedCroppedBlob) {
      setErrorMessage(SELECT_IMAGE_ERROR_MESSAGE)
      return
    }

    setErrorMessage('')

    try {
      if (validatedCroppedBlob && validatedCroppedFileName) {
        triggerBlobDownload(validatedCroppedBlob, validatedCroppedFileName)
        return
      }

      const canvas = await prepareCroppedCanvas()
      const croppedBlob = await createBlobFromCanvas(canvas)
      const outputFile = createOutputFile(croppedBlob, selectedFile.name)

      triggerBlobDownload(croppedBlob, outputFile.name)
    } catch (error) {
      setErrorMessage(error.message || DOWNLOAD_CROPPED_FAILED_ERROR_MESSAGE)
    }
  }

  const handleSubmit = async (event) => {
    event?.preventDefault?.()

    if (!selectedFile) {
      setErrorMessage(SELECT_IMAGE_ERROR_MESSAGE)
      return
    }

    if (!resolvedValidationUrl) {
      setErrorMessage(VALIDATION_URL_MISSING_ERROR_MESSAGE)
      return
    }

    setIsUploading(true)
    setErrorMessage('')
    invalidateValidation()

    try {
      const canvas = await prepareCroppedCanvas()
      const croppedBlob = await createBlobFromCanvas(canvas)
      const croppedFile = createOutputFile(croppedBlob, selectedFile.name)
      const formData = new FormData()
      formData.append('photo', croppedFile)

      const response = await axios.post(resolvedValidationUrl, formData, {
        withCredentials: true,
        validateStatus: () => true,
      })

      const payload = response.data ?? null

      if (response.status < 200 || response.status >= 300) {
        throw new Error(payload?.message || PHOTO_UPLOAD_FAILED_ERROR_MESSAGE)
      }

      setResponseData(payload)
      setValidatedCroppedBlob(croppedBlob)
      setValidatedCroppedFileName(croppedFile.name)
      setValidatedCroppedUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }

        return URL.createObjectURL(croppedBlob)
      })

      if (!isAcceptedValidationResponse(payload)) {
        setErrorMessage(payload?.message || PHOTO_NOT_ACCEPTED_ERROR_MESSAGE)
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to upload the photo right now.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!isAcceptedValidationResponse(responseData) || !validatedCroppedBlob) {
      setErrorMessage(PHOTO_NOT_ACCEPTED_ERROR_MESSAGE)
      return
    }

    if (!saveUrl) {
      setErrorMessage(SAVE_URL_MISSING_ERROR_MESSAGE)
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSaveMessage('')
    setSaveResponseData(null)

    try {
      const croppedFile = new File(
        [validatedCroppedBlob],
        validatedCroppedFileName,
        {
          type: validatedCroppedBlob.type,
          lastModified: Date.now(),
        },
      )
      const formData = new FormData()
      formData.append('photo', croppedFile)

      const response = await axios.post(saveUrl, formData, {
        withCredentials: true,
        validateStatus: () => true,
      })
      const payload = response.data ?? null

      if (response.status < 200 || response.status >= 300) {
        throw new Error(payload?.message || PHOTO_SAVE_FAILED_ERROR_MESSAGE)
      }

      setSaveResponseData(payload)
      setSaveMessage(payload?.message || PHOTO_SAVE_SUCCESS_MESSAGE)
    } catch (error) {
      setErrorMessage(error.message || PHOTO_SAVE_FAILED_ERROR_MESSAGE)
    } finally {
      setIsSaving(false)
    }
  }

  const previewMetrics = getCurrentPreviewMetrics()
  const hasSelectedImage = Boolean(selectedFile && imageDimensions)
  const isValidated = isAcceptedValidationResponse(responseData)

  return {
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
    saveResponseData,
    selectedFile,
    setCurrentStep,
    validatedCroppedBlob,
    validatedCroppedUrl,
    zoom,
  }
}
