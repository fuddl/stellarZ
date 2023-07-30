import iterator from 'iterate-tree'

const getNotablePlanets = (object) => {
	const labels = []
	if (object.orbits) {
		iterator.bfs(object, 'orbits', (orbit) => {
			if ((orbit?.tags?.includes('notable') || orbit?.tags?.includes('filler')) && (orbit.type == 'planet' || !orbit?.type)) {
				labels.push(orbit.name)
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

function findCommonPrefix(arr) {
  if (arr.length < 2) {
    return {prefix: null, nonPrefix: arr}; // there must be at least two strings to have a common prefix
  }
  
  const words = arr.map(str => str.split(' '));
  let prefix = words[0][0];
  const nonPrefix = [];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i][0];
    if (word !== prefix) {
      nonPrefix.push(arr[i]); // the current string doesn't start with the prefix, so add it to the non-prefix array
    }
  }
  
  if (nonPrefix.length === arr.length - 1) {
    return {prefix: null, nonPrefix: arr}; // none of the strings start with the prefix, so return them all as non-prefix strings
  }
  
  return {prefix, nonPrefix};
}

function unifiedLabel(labels) {
	const common = findCommonPrefix(labels)
	let output = ''
	let lastWasCommon = false
	for (const label of labels) {
		output += (output.length == 0 ? '' : '/') + (lastWasCommon ? label.replace(common.prefix, '').trim() : label)
		
		lastWasCommon = label.startsWith(common.prefix)
	}
	return output
}


const flatten = (data) => {
	for (let object of data) {

		object.notablePlanets = getNotablePlanets(object)
		if (object.notablePlanets.length > 1) {
			object.notablePlanets = unifiedLabel(object.notablePlanets)
		} else {
			object.notablePlanets =  object.notablePlanets[0]
		}

		
		const tags = getAllTags(object)
		if (tags) {
			if (!object?.tags) {
				object.tags = tags
			} else {
				object.tags.push(...tags)
			}
		}
		delete object.orbits
	}
}


export default flatten