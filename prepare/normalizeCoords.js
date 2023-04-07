 const normalizeCoords = (data) => {
  for (let object of data) {
    if (object?.location?.ra && object?.location?.dec && object?.location?.dis) {
      object.location = {
        ...spherical2cartesian(
          object.location.dec,
          object.location.ra,
          object.location.dis,
          false,
        ),
      };
    }

    if (object?.orbits) {
      normalizeCoords(object.orbits);
    }
  }
}


module.exports = normalizeCoords