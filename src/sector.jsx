export default class sectors {
  constructor(offsetX = 0, offsetY = 0, offsetZ = 0, size = 20) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.offsetZ = offsetZ;
    this.size = size;
    this.ids = [];
  }

  getCenter(X, Y, Z) {
    const sectorX = Math.floor((X - this.offsetX) / this.size) * this.size;
    const sectorY = Math.floor((Y - this.offsetY) / this.size) * this.size;
    const sectorZ = Math.floor((Z - this.offsetZ) / this.size) * this.size;

    return {
      x: sectorX + this.offsetX + this.size / 2,
      y: sectorY + this.offsetY + this.size / 2,
      z: sectorZ + this.offsetZ + this.size / 2,
    };
  }

  getGeometry(X, Y, Z) {
    const sectorX = Math.floor((X - this.offsetX) / this.size) * this.size;
    const sectorY = Math.floor((Y - this.offsetY) / this.size) * this.size;
    const sectorZ = Math.floor((Z - this.offsetZ) / this.size) * this.size;

    const id = [sectorX, sectorY, sectorZ].join('|');

    let startX = sectorX + this.offsetX;
    let startY = sectorY + this.offsetY;
    let startZ = sectorZ + this.offsetZ;

    const endX = startX + this.size;
    const endY = startY + this.size;
    const endZ = startZ + this.size;

    let output = [];
    if (!this.ids.includes(id)) {
      this.ids.push(id);

      output.push({
        id: 'cube-top-' + id,
        type: 'polygon',
        borderOpacity: 0.5,
        borderColor: 'white',
        fillColor: 'none',
        x: [startX, endX, endX, startX],
        y: [startY, startY, endY, endY],
        z: [startZ, startZ, startZ, startZ],
      });

      output.push({
        id: 'cube-bottom-' + id,
        type: 'polygon',
        borderOpacity: 0.5,
        borderColor: 'white',
        fillColor: 'none',
        x: [startX, endX, endX, startX],
        y: [startY, startY, endY, endY],
        z: [endZ, endZ, endZ, endZ],
      });

      output.push({
        id: 'vert-' + id,
        type: 'lines',
        opacity: 0.5,
        color: 'white',
        x0: [startX, endX, endX, startX],
        y0: [startY, startY, endY, endY],
        z0: [startZ, startZ, startZ, startZ],
        x1: [startX, endX, endX, startX],
        y1: [startY, startY, endY, endY],
        z1: [endZ, endZ, endZ, endZ],
      });
    }

    return output;
  }
}
