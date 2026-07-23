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

export function usePhotoUpload({ validationUrl, saveUrl, onSaveSuccess } = {}) {
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
  const validationRequestIdRef = useRef(0)
  const validationAbortControllerRef = useRef(null)
  const saveRequestIdRef = useRef(0)
  const saveAbortControllerRef = useRef(null)

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

  const clearValidationState = () => {
    setResponseData(null)
    clearValidatedCroppedAsset()
    setSaveMessage('')
    setSaveResponseData(null)
  }

  const cancelValidationRequest = () => {
    validationRequestIdRef.current += 1
    validationAbortControllerRef.current?.abort()
    validationAbortControllerRef.current = null
  }

  const invalidateValidation = () => {
    cancelValidationRequest()
    setIsUploading(false)
    clearValidationState()
  }

  const isCurrentValidationRequest = (requestId, controller) =>
    validationRequestIdRef.current === requestId &&
    validationAbortControllerRef.current === controller &&
    !controller.signal.aborted

  const isCurrentSaveRequest = (requestId, controller) =>
    saveRequestIdRef.current === requestId &&
    saveAbortControllerRef.current === controller &&
    !controller.signal.aborted

  useEffect(
    () => () => {
      validationRequestIdRef.current += 1
      validationAbortControllerRef.current?.abort()
      validationAbortControllerRef.current = null
      saveRequestIdRef.current += 1
      saveAbortControllerRef.current?.abort()
      saveAbortControllerRef.current = null
      clearValidatedCroppedAsset()
    },
    [],
  )

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
    if (isSaving) {
      return
    }

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
    if (isSaving) {
      return
    }

    invalidateValidation()
    setZoom(1)
    setHorizontalOffset(0)
    setVerticalOffset(0)
  }

  const handlePointerDown = (event, pointerScale = 1) => {
    if (isUploading || isSaving) {
      return
    }

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
    if (isUploading || isSaving) {
      return
    }

    invalidateValidation()
    setZoom((current) => clamp(current + direction * ZOOM_STEP, 1, 2.5))
  }

  const handleNudge = (deltaX, deltaY) => {
    applyOffsetDelta(deltaX, deltaY)
  }

  const handleChangePhoto = () => {
    if (isUploading || isSaving) {
      return
    }

    invalidateValidation()
    dragStateRef.current = null
    setZoom(1)
    setHorizontalOffset(0)
    setVerticalOffset(0)
    setErrorMessage('')
    clearSelection()
  }

  const handleFileChange = (event) => {
    if (isSaving) {
      return
    }

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

  const prepareCroppedCanvas = async ({
    sourceFile = selectedFile,
    sourcePreviewUrl = previewUrl,
    sourceImageDimensions = imageDimensions,
    sourcePreviewMetrics = getCurrentPreviewMetrics(),
  } = {}) => {
    if (!sourceFile || !sourcePreviewUrl || !sourceImageDimensions) {
      throw new Error('Please select and align an image before uploading.')
    }

    if (!sourcePreviewMetrics) {
      throw new Error(ALIGNMENT_NOT_READY_ERROR_MESSAGE)
    }

    return createCroppedCanvas(sourcePreviewUrl, sourcePreviewMetrics)
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

    if (validationAbortControllerRef.current || isSaving) {
      return
    }

    if (!selectedFile) {
      setErrorMessage(SELECT_IMAGE_ERROR_MESSAGE)
      return
    }

    if (!validationUrl) {
      setErrorMessage(VALIDATION_URL_MISSING_ERROR_MESSAGE)
      return
    }

    const sourceFile = selectedFile
    const sourcePreviewUrl = previewUrl
    const sourceImageDimensions = imageDimensions
    const sourcePreviewMetrics = getCurrentPreviewMetrics()
    const requestId = validationRequestIdRef.current + 1
    const controller = new AbortController()

    validationRequestIdRef.current = requestId
    validationAbortControllerRef.current = controller

    setErrorMessage('')
    clearValidationState()
    setIsUploading(true)

    try {
      const canvas = await prepareCroppedCanvas({
        sourceFile,
        sourcePreviewUrl,
        sourceImageDimensions,
        sourcePreviewMetrics,
      })

      if (!isCurrentValidationRequest(requestId, controller)) {
        return
      }

      const croppedBlob = await createBlobFromCanvas(canvas)

      if (!isCurrentValidationRequest(requestId, controller)) {
        return
      }

      const croppedFile = createOutputFile(croppedBlob, sourceFile.name)
      const formData = new FormData()
      formData.append('photo', croppedFile)

      const response = await axios.post(validationUrl, formData, {
        withCredentials: true,
        validateStatus: () => true,
        signal: controller.signal,
      })

      if (!isCurrentValidationRequest(requestId, controller)) {
        return
      }

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
      if (
        !isCurrentValidationRequest(requestId, controller) ||
        axios.isCancel(error) ||
        error.code === 'ERR_CANCELED'
      ) {
        return
      }

      setErrorMessage(error.message || PHOTO_UPLOAD_FAILED_ERROR_MESSAGE)
    } finally {
      if (
        validationRequestIdRef.current === requestId &&
        validationAbortControllerRef.current === controller
      ) {
        validationAbortControllerRef.current = null
        setIsUploading(false)
      }
    }
  }

  const handleSave = async () => {
    if (saveAbortControllerRef.current || isUploading) {
      return
    }

    if (!isAcceptedValidationResponse(responseData) || !validatedCroppedBlob) {
      setErrorMessage(PHOTO_NOT_ACCEPTED_ERROR_MESSAGE)
      return
    }

    if (!saveUrl) {
      setErrorMessage(SAVE_URL_MISSING_ERROR_MESSAGE)
      return
    }

    const croppedBlob = validatedCroppedBlob
    const croppedFileName = validatedCroppedFileName
    const requestId = saveRequestIdRef.current + 1
    const controller = new AbortController()
    let didSave = false
    let savedPayload = null

    saveRequestIdRef.current = requestId
    saveAbortControllerRef.current = controller

    setErrorMessage('')
    setSaveMessage('')
    setSaveResponseData(null)
    setIsSaving(true)

    try {
      const croppedFile = new File(
        [croppedBlob],
        croppedFileName,
        {
          type: croppedBlob.type,
          lastModified: Date.now(),
        },
      )
      const formData = new FormData()
      formData.append('photo', croppedFile)

      const response = await axios.post(saveUrl, formData, {
        withCredentials: true,
        validateStatus: () => true,
        signal: controller.signal,
      })

      if (!isCurrentSaveRequest(requestId, controller)) {
        return
      }

      const payload = response.data ?? null

      if (response.status < 200 || response.status >= 300) {
        throw new Error(payload?.message || PHOTO_SAVE_FAILED_ERROR_MESSAGE)
      }

      setSaveResponseData(payload)
      setSaveMessage(payload?.message || PHOTO_SAVE_SUCCESS_MESSAGE)
      savedPayload = payload
      didSave = true
    } catch (error) {
      if (
        !isCurrentSaveRequest(requestId, controller) ||
        axios.isCancel(error) ||
        error.code === 'ERR_CANCELED'
      ) {
        return
      }

      setErrorMessage(error.message || PHOTO_SAVE_FAILED_ERROR_MESSAGE)
    } finally {
      if (
        saveRequestIdRef.current === requestId &&
        saveAbortControllerRef.current === controller
      ) {
        saveAbortControllerRef.current = null
        setIsSaving(false)
      }
    }

    if (didSave && saveRequestIdRef.current === requestId) {
      onSaveSuccess?.(savedPayload)
    }
  }

  const previewMetrics = getCurrentPreviewMetrics()
  const hasSelectedImage = Boolean(selectedFile && imageDimensions)
  const isValidated = isAcceptedValidationResponse(responseData)

  return {
    currentStep,
    errorMessage,
    handleDownloadCropped,
    handleChangePhoto,
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
