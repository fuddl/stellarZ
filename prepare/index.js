const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const delay = require('delay');

const addRealStarCoords = require('./addRealStarCoords.js');
const addZbyLineSegment = require('./addZbyLineSegment.js');
const normalizeCoords = require('./normalizeCoords.js');
const addMissingZ = require('./addMissingZ.js');
const addFiller = require('./addFiller.js');
const addIds = require('./addIds.js');
const makeConnections = require('./makeConnections.js')
const pruneFillerByHeat = require('./pruneFillerByHeat.js');
const addFillerNames = require('./addFillerNames.js');

(async () => {
  let data = yaml.load(await fs.readFile('./catalog.yml', 'utf8'))
  
  data.push(yaml.load(await fs.readFile('./catalog_appendix.yml', 'utf8')))

  const updateOutputfile = async () => {
    await delay(50)
    addIds(data)
    await fs.writeFile('./src/catalog.json', JSON.stringify(data, null, '  '), 'utf8');
  }

  normalizeCoords(data)
  await addRealStarCoords(data, 0, updateOutputfile)
  addZbyLineSegment(data, updateOutputfile)
  await addMissingZ(data, updateOutputfile)
  await addFiller(data, updateOutputfile)
  
  data = pruneFillerByHeat(data)
  await addFillerNames(data, updateOutputfile)
  await updateOutputfile()
  data = await addFillerNames(data)
  await updateOutputfile()

  makeConnections(data)
})();

// (async () => {
//   let data = require('../src/catalog.json')
  
//   const updateOutputfile = async () => {
//     await delay(50)
//     addIds(data)
//     await fs.writeFile('./src/catalog-test.json', JSON.stringify(data, null, '  '), 'utf8');
//   }

//   data = await addFillerNames(data)
//   await updateOutputfile()
// })();
