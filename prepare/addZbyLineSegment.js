function getLocationByMachineName(data, machineName) {
	for (let object of data) {
		if (object?.machine_name === machineName) {
			return object.location
		}
	}
}

function addZbyLineSegment(data, callback) {
	for (let object of data) {
		if (object?.location?.z?.between && object?.location?.z?.and) {
			const pointA = getLocationByMachineName(data, object.location.z.between)
			const pointB = getLocationByMachineName(data, object.location.z.and)

			object.location.z = (pointA.z + pointB.z) / 2
		}
		if (object?.location?.z?.near) {
			const point = getLocationByMachineName(data, object.location.z.near)
			object.location.z = point.z
		}
		if (object?.orbits) {
	    addZbyLineSegment(object.orbits, callback);
	  }
	}
	callback()
}

module.exports = addZbyLineSegment
