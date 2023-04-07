import iterator from 'iterate-tree'

const getRelevantLabels = (object) => {
	const labels = []
	if (object.orbits) {
		iterator.bfs(object, 'orbits', (orbit) => {
			if (orbit?.tags?.includes('notable')) {
				labels.push({
					type: orbit?.type ?? 'planet',
					name: orbit.name,
				})
			}
		})
	}
	return labels
}

const getAllTags = (object) => {
	const tags = []
	if (object.orbits) {
		iterator.bfs(object, 'orbits', (orbit) => {
			if (orbit?.tags) {
				tags.push(...orbit.tags)
			}
		})
	}
	return tags
}

const flatten = (data) => {
	for (let object of data) {
		const labels = getRelevantLabels(object)
		const tags = getAllTags(object)
		if (tags) {
			if (!object?.tags) {
				object.tags = tags
			} else {
				object.tags.push(...tags)
			}
		}
		object.notable = labels
		delete object.orbits
	}
}


export default flatten