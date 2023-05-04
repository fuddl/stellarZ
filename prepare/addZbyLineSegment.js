const iterator = require('iterate-tree')
const gen = require('random-seed')

const distance2D = function(p1, p2) {
  return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2)));
}


function getLocationByMachineName(data, machineName) {
	let output;
	iterator.bfs([...data], 'orbits', (object) => {
		if (object?.machine_name == machineName) {
			output = object.location
		}
	})
	return output
}

function addZbyLineSegment(data, callback, all = []) {
	let other = all.length > 0 ? all : data
	for (let object of data) {
		if (object?.location?.z?.between && object?.location?.z?.and) {
			const pointA = getLocationByMachineName(other, object.location.z.between)
			const pointB = getLocationByMachineName(other, object.location.z.and)

			object.location.z = (pointA.z + pointB.z) / 2
		}
		if (object?.location?.z?.near) {
			const point = getLocationByMachineName(other, object.location.z.near)
			const randGen = gen.create(object.name)
			const flatDistance = distance2D(point, object.location)
			object.location.z = point.z + randGen.floatBetween(flatDistance*-1, flatDistance)
		}
		if (object?.orbits) {
	    addZbyLineSegment(object.orbits, callback, other);
	  }
	}
	callback()
}

module.exports = addZbyLineSegment
