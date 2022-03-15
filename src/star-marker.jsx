function class2Color(cls) {
  const classes = {
    O: 'purple',
    B: 'blue',
    A: 'lightskyblue',
    F: 'beige',
    G: 'yellow',
    K: 'orange',
    M: 'red',
  };
  if (classes[cls]) {
    return classes[cls];
  } else {
    return '#5966A4';
  }
}

function mag2Size(input) {
  return (input + 10) / 7;
}

// for (let hygObject of hyg) {
//   let sectorCenter = sectorGrid.getCenter(
//     object.location.x,
//     object.location.y,
//     object.location.z,
//   );
//   if (
//     isClose(sectorCenter.x, hygObject.x, 10) &&
//     isClose(sectorCenter.y, hygObject.y, 10) &&
//     isClose(sectorCenter.z, hygObject.z, 10)
//   ) {
//     hygPoints.push({
//       id: 'hyg-' + hygObject.id,
//       type: DataSpecType.points,
//       opacity: 1,
//       color: class2Color(hygObject.c),
//       size: mag2Size(hygObject.m),
//       x: [hygObject.x],
//       y: [hygObject.y],
//       z: flatMode ? [0] : [hygObject.z],
//     });
//   }
// }
