function validLocation(object) {
	if (object?.location) {
		if (typeof object.location.x == 'number') {
			return false
		}
		if (typeof object.location.y == 'number') {
			return false
		}
		if (typeof object.location.z == 'number') {
			return false
		}
	}

	return true;
}

export default validLocation;