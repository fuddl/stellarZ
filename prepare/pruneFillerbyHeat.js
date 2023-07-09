const shapes = require('../src/2dShapes.json')

const intersection = require('array-intersection')
const iterator = require('iterate-tree')

function calculateHeatValue(node, nodes) {
  let heatValue = 0;

  // Loop through all other nodes to calculate distances
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] !== node) { // Exclude the current node
      const squaredDistance =
        Math.pow(nodes[i].location.x - node.location.x, 2) +
        Math.pow(nodes[i].location.y - node.location.y, 2) +
        Math.pow(nodes[i].location.z - node.location.z, 2);

        // non fillers get a heat bonus
        multiplier = nodes[i]?.object?.tags?.includes('filler') ? 1 : 20

      heatValue += (squaredDistance * multiplier);
    }
  }

  return heatValue;
}

function pruneFillerByHeat(data, callback) {
  for (let shape of shapes) {
    if (shape?.prune == false) {
      continue
    }
    const relevantPoints = []
    let relevantTags = []


    for (let layer of shape.layers) {
      relevantTags = [...relevantTags, ...layer.tags, ...layer.fillerTags]
    }

    const iterateOrbits = (objects, parentLocation = {x: 0, y: 0, z: 0}) => {
      for (let object of objects) {   
        const location = { ...parentLocation, ...object.location }
        if (object?.tags && intersection(object.tags, relevantTags).length > 0) {
          relevantPoints.push({
            location: location,
            object: object,
            heat: 0,
          })
        }
        if (object.orbits) {
          iterateOrbits(object.orbits, location)
        }
      }
    }

    iterateOrbits(data)

    let totalHeat = 0
    for (let i = 0; i < relevantPoints.length; i++) {
      const thisHeat = calculateHeatValue(relevantPoints[i], relevantPoints)
      relevantPoints[i].heat = thisHeat
      totalHeat += thisHeat
    }

    const averageHeat = totalHeat / relevantPoints.length

    for (let i = 0; i < relevantPoints.length; i++) {
      if (!relevantPoints[i].object?.tags?.includes('filler')) {
        continue
      }
      if (relevantPoints[i].heat < averageHeat ) {
        continue
      }
      relevantPoints[i].object.tooCold = true
    }

  }

  return data.filter(item => !item?.tooCold === true);
}

module.exports = pruneFillerByHeat