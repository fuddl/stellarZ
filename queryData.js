const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});
const fetch = require('node-fetch');
const fs = require('fs');

const yaml = require('js-yaml');
const spherical2cartesian = require('./convert/spherical2cartesian.js');

async function addCoordinates(object) {
  if (typeof object.location === 'string' && object.location.startsWith('wd:Q')) {
    console.debug(`aquireing location for ${object.name} from wikidata`)
    const url = wdk.sparqlQuery(
    `
     SELECT ?ra ?dec ?dis ?disUnit WHERE {
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      ${object.location} wdt:P6257 ?ra.
      ${object.location} wdt:P6258 ?dec.
      ${object.location} p:P2583/psv:P2583 ?disStatement.
      ?disStatement wikibase:quantityAmount ?dis.
      ?disStatement wikibase:quantityUnit ?disUnit.        
     }
     LIMIT 1
    `
    );
    let headers = new fetch.Headers({
      "Accept"       : "application/json",
      "Content-Type" : "application/json",
      "User-Agent"   : "https://github.com/fuddl/stellarZ"
    });
    const result = await fetch(url, {
      headers: headers,
    });
    const json = await result.json();
    const data = wdk.simplify.sparqlResults(json)[0];
    if (data) {
      object.location = {
        ...spherical2cartesian(
          data.dec,
          data.ra,
          data.dis?.value,
          data.dis?.unit.endsWith('Q12129'),
        )
      }
    }
  }
  if (object?.orbits && object.orbits.length > 0) {
    for (let i in object.orbits) {
     object.orbits[i] = await addCoordinates(object.orbits[i]);
    }
  }
  return object;
}

(async () => {
  let output = []
  const raw_data = yaml.load(fs.readFileSync('./src/catalog.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  fs.writeFile('./src/catalog.json', JSON.stringify(raw_data, null, '  '), 'utf8', () => {
    console.log('Done')
  });
})()
