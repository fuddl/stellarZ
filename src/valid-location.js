function validLocation(object) {
	if (object?.location?.x && typeof object.location.x == 'number') {
		return false
	}
	if (object?.location?.y && typeof object.location.y == 'number') {
		return false
	}
	if (object?.location?.z && typeof object.location.z == 'number') {
		return false
	}

	return true;
}

export default validLocation;