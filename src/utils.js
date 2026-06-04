import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  OUTPUT_HEIGHT,
  OUTPUT_MIME_TYPE,
  OUTPUT_WIDTH,
  PREPARE_CROPPED_IMAGE_ERROR_MESSAGE,
  PROCESSING_UNSUPPORTED_ERROR_MESSAGE,
} from './constants.js'

export function isAcceptedFile(file) {
  const lowerName = file.name.toLowerCase()

  return (
    ACCEPTED_MIME_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  )
}

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the selected image.'))
    image.src = url
  })
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function quantizeCropRect(sourceX, sourceY, sourceWidth, sourceHeight, imageDimensions) {
  const quantizedWidth = Math.min(imageDimensions.width, Math.max(1, Math.round(sourceWidth)))
  const quantizedHeight = Math.min(imageDimensions.height, Math.max(1, Math.round(sourceHeight)))
  const maxSourceX = Math.max(0, imageDimensions.width - quantizedWidth)
  const maxSourceY = Math.max(0, imageDimensions.height - quantizedHeight)

  return {
    sourceX: clamp(Math.round(sourceX), 0, maxSourceX),
    sourceY: clamp(Math.round(sourceY), 0, maxSourceY),
    sourceWidth: quantizedWidth,
    sourceHeight: quantizedHeight,
  }
}

export function buildPreviewMetrics(imageDimensions, zoom, horizontalOffset, verticalOffset) {
  if (!imageDimensions) {
    return null
  }

  const baseScale = Math.max(
    FRAME_WIDTH / imageDimensions.width,
    FRAME_HEIGHT / imageDimensions.height,
  )
  const scale = baseScale * zoom
  const sourceWidth = FRAME_WIDTH / scale
  const sourceHeight = FRAME_HEIGHT / scale
  const maxSourceX = Math.max(0, imageDimensions.width - sourceWidth)
  const maxSourceY = Math.max(0, imageDimensions.height - sourceHeight)
  const sourceCenterX =
    imageDimensions.width / 2 - (maxSourceX / 2) * (horizontalOffset / 100)
  const sourceCenterY =
    imageDimensions.height / 2 - (maxSourceY / 2) * (verticalOffset / 100)
  const cropRect = quantizeCropRect(
    sourceCenterX - sourceWidth / 2,
    sourceCenterY - sourceHeight / 2,
    sourceWidth,
    sourceHeight,
    imageDimensions,
  )
  const renderedWidth = imageDimensions.width * scale
  const renderedHeight = imageDimensions.height * scale
  const quantizedMaxSourceX = Math.max(0, imageDimensions.width - cropRect.sourceWidth)
  const quantizedMaxSourceY = Math.max(0, imageDimensions.height - cropRect.sourceHeight)

  return {
    scale,
    sourceWidth: cropRect.sourceWidth,
    sourceHeight: cropRect.sourceHeight,
    sourceX: cropRect.sourceX,
    sourceY: cropRect.sourceY,
    renderedWidth,
    renderedHeight,
    xRange: (quantizedMaxSourceX * scale) / 2,
    yRange: (quantizedMaxSourceY * scale) / 2,
    previewLeft: -cropRect.sourceX * scale,
    previewTop: -cropRect.sourceY * scale,
  }
}

export function createOutputFile(blob, sourceFileName) {
  const baseName = sourceFileName.replace(/\.[^.]+$/, '')

  return new File([blob], `${baseName}-3x4.jpg`, {
    type: OUTPUT_MIME_TYPE,
    lastModified: Date.now(),
  })
}

export function isAcceptedValidationResponse(payload) {
  return payload?.report?.accept === true
}

function sampleBilinear(data, width, height, x, y, channelOffset) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const xWeight = x - x0
  const yWeight = y - y0
  const topLeft = data[(y0 * width + x0) * 4 + channelOffset]
  const topRight = data[(y0 * width + x1) * 4 + channelOffset]
  const bottomLeft = data[(y1 * width + x0) * 4 + channelOffset]
  const bottomRight = data[(y1 * width + x1) * 4 + channelOffset]
  const top = topLeft + (topRight - topLeft) * xWeight
  const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight

  return top + (bottom - top) * yWeight
}

function resizeImageDataBilinear(sourceImageData, targetWidth, targetHeight) {
  const destination = new ImageData(targetWidth, targetHeight)
  const xScale = sourceImageData.width / targetWidth
  const yScale = sourceImageData.height / targetHeight

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(
      sourceImageData.height - 1,
      Math.max(0, (y + 0.5) * yScale - 0.5),
    )

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(
        sourceImageData.width - 1,
        Math.max(0, (x + 0.5) * xScale - 0.5),
      )
      const destinationOffset = (y * targetWidth + x) * 4

      destination.data[destinationOffset] = Math.round(
        sampleBilinear(
          sourceImageData.data,
          sourceImageData.width,
          sourceImageData.height,
          sourceX,
          sourceY,
          0,
        ),
      )
      destination.data[destinationOffset + 1] = Math.round(
        sampleBilinear(
          sourceImageData.data,
          sourceImageData.width,
          sourceImageData.height,
          sourceX,
          sourceY,
          1,
        ),
      )
      destination.data[destinationOffset + 2] = Math.round(
        sampleBilinear(
          sourceImageData.data,
          sourceImageData.width,
          sourceImageData.height,
          sourceX,
          sourceY,
          2,
        ),
      )
      destination.data[destinationOffset + 3] = Math.round(
        sampleBilinear(
          sourceImageData.data,
          sourceImageData.width,
          sourceImageData.height,
          sourceX,
          sourceY,
          3,
        ),
      )
    }
  }

  return destination
}

export async function createCroppedCanvas(previewUrl, previewMetrics) {
  const image = await loadImageFromUrl(previewUrl)
  const sourceCanvas = document.createElement('canvas')
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })

  if (!sourceContext) {
    throw new Error(PROCESSING_UNSUPPORTED_ERROR_MESSAGE)
  }

  sourceCanvas.width = previewMetrics.sourceWidth
  sourceCanvas.height = previewMetrics.sourceHeight
  sourceContext.drawImage(
    image,
    previewMetrics.sourceX,
    previewMetrics.sourceY,
    previewMetrics.sourceWidth,
    previewMetrics.sourceHeight,
    0,
    0,
    previewMetrics.sourceWidth,
    previewMetrics.sourceHeight,
  )

  const sourceImageData = sourceContext.getImageData(
    0,
    0,
    previewMetrics.sourceWidth,
    previewMetrics.sourceHeight,
  )
  const resizedImageData = resizeImageDataBilinear(
    sourceImageData,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  )
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error(PROCESSING_UNSUPPORTED_ERROR_MESSAGE)
  }

  canvas.width = OUTPUT_WIDTH
  canvas.height = OUTPUT_HEIGHT
  context.putImageData(resizedImageData, 0, 0)

  return canvas
}

export async function createBlobFromCanvas(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error(PREPARE_CROPPED_IMAGE_ERROR_MESSAGE))
          return
        }

        resolve(result)
      },
      OUTPUT_MIME_TYPE,
      0.92,
    )
  })

  return blob
}

export function triggerBlobDownload(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = fileName
  link.click()

  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
}
