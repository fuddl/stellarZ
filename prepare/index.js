const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const delay = require('delay');

const addRealStarCoords = require('./addRealStarCoords.js');
const addZbyLineSegment = require('./addZbyLineSegment.js');
const normalizeCoords = require('./normalizeCoords.js');
const addMissingZ = require('./addMissingZ.js');
const addIds = require('./addIds.js');


(async () => {
  const data = yaml.load(await fs.readFile('./catalog.yml', 'utf8'))

  const updateOutputfile = async () => {
    await delay(50)
    await fs.writeFile('./src/catalog.json', JSON.stringify(data, null, '  '), 'utf8');
  }

  normalizeCoords(data)
  await addRealStarCoords(data, 0, updateOutputfile)
  addZbyLineSegment(data, updateOutputfile)
  await addMissingZ(data, updateOutputfile)

  addIds(data)
  
  await updateOutputfile()
})();
