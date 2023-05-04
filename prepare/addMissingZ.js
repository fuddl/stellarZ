const iterator = require('iterate-tree')
const gen = require('random-seed')

const distance2D = function(p1, p2) {
  return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2)));
}

async function addMissingZ(objects, callback, all = []) {
  let ObjectsWithZ = []
  let ObjectsWithZOccupied = []

  let other = all.length > 0 ? all : objects

  iterator.bfs([...other], 'orbits', (object) => {
    const locationString = JSON.stringify(object.location)
    if (typeof object?.location?.z === 'number' && !ObjectsWithZOccupied.includes(locationString)) {
      ObjectsWithZ.push({ dist: null, object: object });
      ObjectsWithZOccupied.push(locationString)
    }
  })

  for (let object of objects) {
    if (object?.location?.z === undefined && typeof object?.location?.x == 'number' && typeof object?.location?.y == 'number') {
      for (const key of Object.keys(ObjectsWithZ)) {
        ObjectsWithZ[key].dist = distance2D(object.location, ObjectsWithZ[key].object.location);
      }
      let closest = ObjectsWithZ.sort((A, B) => {
        return A.dist < B.dist ? -1 : 1;
      });

      const randGen = gen.create(object.name);
      const randDist = closest[0].dist / 2;

      console.debug(`${object.name} found, near ${closest[0].object.name}, ${closest[1].object.name}, and ${closest[2].object.name}`)
      object.location.z = ((closest[0].object.location.z + closest[1].object.location.z + closest[2].object.location.z) / 3) + randGen.floatBetween(randDist*-1, randDist)
      await callback()
    }
    if (object?.orbits?.length > 0) {
      addMissingZ(object.orbits, callback, other)
    }
  }
}

module.exports = addMissingZ