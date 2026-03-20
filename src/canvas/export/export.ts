export const serializeSvg = (svg: SVGSVGElement): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-ui="true"]').forEach((node) => node.remove())
  const serializer = new XMLSerializer()
  return serializer.serializeToString(clone)
}

export const downloadText = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const exportSvg = (svg: SVGSVGElement, filename = 'canvas.svg') => {
  const content = serializeSvg(svg)
  downloadText(content, filename, 'image/svg+xml')
}

export const exportPng = async (svg: SVGSVGElement, filename = 'canvas.png') => {
  const content = serializeSvg(svg)
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`
  const image = new Image()
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
    image.src = encoded
  })
  const width = svg.clientWidth || 800
  const height = svg.clientHeight || 600
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(image, 0, 0, width, height)
  const pngUrl = canvas.toDataURL('image/png')
  const anchor = document.createElement('a')
  anchor.href = pngUrl
  anchor.download = filename
  anchor.click()
}
