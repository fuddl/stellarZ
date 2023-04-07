const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
});
const spherical2cartesian = require('../convert/spherical2cartesian.js');
const { fetchBuilder, FileSystemCache } = require('node-fetch-cache');
const fetch = fetchBuilder.withCache(new FileSystemCache({
  ttl: 86400000, 
}));

async function addCoordsFromWikidata(object) {
  console.debug(`Scanning for location of ${object.name}`)
  const url = wdk.sparqlQuery(`
     SELECT ?ra ?dec ?dis ?disUnit WHERE {
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      ${object.location} wdt:P6257 ?ra.
      ${object.location} wdt:P6258 ?dec.
      ${object.location} p:P2583/psv:P2583 ?disStatement.
      ?disStatement wikibase:quantityAmount ?dis.
      ?disStatement wikibase:quantityUnit ?disUnit.        
     }

     LIMIT 1
  `);
  const result = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'https://github.com/fuddl/stellarZ',
    },
    cache: 'cache',
  });

  const json = await result.json();

  const data = wdk.simplify.sparqlResults(json)[0];
  if (data) {
    if (!object?.tags) {
      object.tags = [];
    }
    object.tags.push('real');
    object.location = {
      ...spherical2cartesian(
        data.dec,
        data.ra,
        data.dis?.value,
        data.dis?.unit.endsWith('Q12129'),
      ),
    };
  } 
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
}

const addRealStarCoords = async (data, depth = 0, callback) => {
  for (let object of data) {
    if (
      typeof object.location === 'string' &&
      object.location.startsWith('wd:Q')
    ) {
      await addCoordsFromWikidata(object)
      await callback()
    }

    if (object?.orbits) {
      await addRealStarCoords(object.orbits, depth++, callback);
    }
  }
}


module.exports = addRealStarCoords
