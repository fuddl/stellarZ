const fs = require('fs')
const spherical2cartesian = require('./convert/spherical2cartesian.js')
const csv = require('csv-parser')

let results = []

fs.createReadStream('./src/submodules/HYG-Database/hygfull.csv')
  .pipe(csv())
  .on('data', function(data) {
    let coords = spherical2cartesian(
      parseFloat(data.Dec),
      parseFloat(data.RA)/0.06666666666666667,
      parseFloat(data.Distance),
      true,
    )
    results.push({
      id: parseInt(data.StarID),
      x: coords.x,
      y: coords.y,
      z: coords.z,
      d: parseFloat(data.Distance),
      c: data.Spectrum.charAt(0).toUpperCase(),
      m: Math.round(data.AbsMag),
    })
  })
  .on('end', () => {
    fs.writeFile('./src/catalogHyg.json', JSON.stringify(results, null, '  '), 'utf8', () => {
      console.log('Done')
    });
  });