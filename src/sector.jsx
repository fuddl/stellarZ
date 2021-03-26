export default function sector(startX, startY, startZ, offsetX = 0, offsetY = 0, offsetZ = 0, size = 20) {
  
  startX = startX + offsetX
  startY = startY + offsetY
  startZ = startZ + offsetZ

  const endX = startX + size;
  const endY = startY + size;
  const endZ = startZ + size;
  let output = []  
  output.push({
    id: 'cube-top-' + startX,
    type: 'polygon',
    borderOpacity: .1,
    borderColor: 'white',
    fillColor: 'none',
    x: [startX, endX, endX, startX],
    y: [startY, startY, endY, endY],
    z: [startZ, startZ, startZ, startZ],
  })

  output.push({
    id: 'cube-bottom-' + startX,
    type: 'polygon',
    borderOpacity: .1,
    borderColor: 'white',
    fillColor: 'none',
    x: [startX, endX, endX, startX],
    y: [startY, startY, endY, endY],
    z: [endZ, endZ, endZ, endZ],
  })

  output.push({
    id: 'vert-' + startX,
    type: 'lines',
    opacity: .1,
    color: 'white',
    x0: [startX, endX, endX, startX],
    y0: [startY, startY, endY ,endY],
    z0: [startZ, startZ, startZ, startZ],
    x1: [startX, endX, endX, startX],
    y1: [startY, startY, endY, endY],
    z1: [endZ, endZ, endZ, endZ],
  })

  return output
}