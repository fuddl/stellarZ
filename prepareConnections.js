const points = require('./src/catalog.json')
const shapes = require('./src/2dShapes.json')

const distance = require('euclidean-distance')
const intersection = require('array-intersection')
const iterator = require('iterate-tree')
const fs = require('fs')
const path2polygon = require('./d2polygon.js')
const pointInPolygon = require('point-in-polygon')
const midPoint = require('midPoint')

const structures = []

function lineInPolygon(p1, p2, polygon) {
  let isInsomePolygon = true;
  let points = [
    midPoint([
      p1,
      p2
    ])
  ]
  points.push(midPoint([
    points[0],
    p1
  ]))
  points.push(midPoint([
    points[0],
    p2
  ]))

  let allInPolygon = true;
  for (let point of points) {
    if (allInPolygon && !pointInPolygon(point, polygon)) {
      allInPolygon = false;
    }
  }
  return allInPolygon;
}


let hashes = [];
for (let shape of shapes) {
  const relevantPoints = []
  let relevantTags = []

  let multipolygon = [];
  for (let d of shape.d) {
    multipolygon.push(path2polygon(d))
  }

  for (let layer of shape.layers) {
    relevantTags = [...relevantTags, ...layer.tags, ...layer.fillerTags]
  }

  iterator.bfs([...points], 'orbits', (object) => {
    if (object?.tags && intersection(object.tags, relevantTags).length > 0) {
      relevantPoints.push(object)
    }
  })

  const shortestConnections = []
  for (let pointA of relevantPoints) {
    let connections = [];
    for (let pointB of relevantPoints) {
      if (pointA.id && pointB.id) {
        const hash = [ pointA.id, pointB.id ].sort().join('→');
          

        if (pointA != pointB && pointA.location && pointB.location && !hashes.includes(hash)) {
          hashes.push(hash)
          connections.push({
            hash: hash,
            A: pointA.location,
            B: pointB.location,
            dist: distance(
              [pointA.location.x, pointA.location.y, pointA.location.z],
              [pointB.location.x, pointB.location.y, pointB.location.z],
            ),
          })
        }
      }
    }
    if (connections.length > 2) {
      let connectionsSorted = connections.sort((A, B) => {
        return A.dist < B.dist ? -1 : 1;
      });
      connectionsSorted.length = 3;
      
      for (const key in connectionsSorted) {
        let isInsomePolygon = false;
        for (const polygon of multipolygon) {
          if (!isInsomePolygon) {
            isInsomePolygon = lineInPolygon(
              [connectionsSorted[key].A.x, connectionsSorted[key].A.y],
              [connectionsSorted[key].B.x, connectionsSorted[key].B.y],
              polygon
            );
          }
        }
        if (!isInsomePolygon) {
          connectionsSorted.splice(key, 1);
        }
      }

      shortestConnections.push(...connectionsSorted)
    }
  }
  structures.push({
    id: shape.id,
    connections: shortestConnections,
  })
}

fs.writeFile(
  './src/connections.json',
  JSON.stringify(structures, null, '  '),
  'utf8',
  () => {
    console.log('Done');
  },
);
