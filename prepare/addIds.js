let idCounter = 0

const AddIds = (data) => {
  for (let object of data) {
    if (!object?.id) {
	   idCounter++
  	 object.id = idCounter
    }
    if (object?.orbits) {
      AddIds(object.orbits)
    }
  }
}

module.exports = AddIds