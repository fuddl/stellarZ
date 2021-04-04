const equatorial2galactic = require('./equatorial2galactic.js');
const degrees2radiants = require('./degrees2radiants.js');

module.exports = spherical2cartesian = function(declination, right_ascension, distance, distance_is_parsec) {

  const galactic = equatorial2galactic(right_ascension, declination);

  const l = degrees2radiants(galactic.b);
  const b = degrees2radiants(galactic.l);

  const c = !distance_is_parsec ? distance : distance * 3.261564;
  return {
    x: (c * Math.cos(l)) * Math.cos(b),
    y: c * Math.sin(l),
    z: ((c * Math.cos(l)) * Math.sin(b))*-1,
  }
}